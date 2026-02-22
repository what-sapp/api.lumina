const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const set = require('./settings');
const admin = require('firebase-admin');

const app = express();

// ── Firebase Admin Init ──
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

const db = admin.firestore();

// ── Cache ──
let blacklistCache    = new Set();
let disabledEndpoints = new Set();

async function reloadAdminCache() {
    try {
        const blSnap = await db.collection('blacklist').get();
        blacklistCache = new Set(blSnap.docs.map(d => d.id));

        const epSnap = await db.collection('endpoints_status').where('enabled', '==', false).get();
        disabledEndpoints = new Set(epSnap.docs.map(d => d.id));

        console.log(`Cache refreshed — ${blacklistCache.size} blocked IPs, ${disabledEndpoints.size} disabled endpoints`);
    } catch (e) {
        console.warn(`Cache reload failed: ${e.message}`);
    }
}

reloadAdminCache();
setInterval(reloadAdminCache, 30000);

// ── Rate Limiter ──
const rateMap = new Map();
const RATE_LIMIT  = 1000;
const RATE_WINDOW = 24 * 60 * 60 * 1000; // 24 jam

function checkRateLimit(ip) {
    const now   = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }
    entry.count++;
    return entry.count <= RATE_LIMIT;
}

// Cleanup rateMap tiap 1 jam
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateMap.entries()) {
        if (now > entry.resetAt) rateMap.delete(ip);
    }
}, 60 * 60 * 1000);

app.set('trust proxy', true);
app.set('json spaces', 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));

app.use('/image', express.static(path.join(__dirname, 'docs', 'image')));
app.use('/err',   express.static(path.join(__dirname, 'docs', 'err')));
app.use(express.static(path.join(__dirname, 'public')));

// ── Middleware: Blacklist + Rate Limit ──
app.use((req, res, next) => {
    const ip       = (req.ip || req.headers['x-forwarded-for'] || '').replace('::ffff:', '') || 'unknown';
    const isAdmin  = req.path.startsWith('/admin');
    const isStatic = req.path.match(/\.(html|css|js|png|ico|jpg|svg|woff2?)$/);

    if (blacklistCache.has(ip)) {
        return res.status(403).json({ status: false, message: 'Access denied. Your IP has been blocked.' });
    }

    if (!isAdmin && !isStatic) {
        if (!checkRateLimit(ip)) {
            return res.status(429).json({
                status: false,
                message: 'Too many requests. Please slow down.',
                retryAfter: '24h',
                limit: RATE_LIMIT,
                window: '24 hours'
            });
        }
    }

    next();
});

// ── Middleware: Response wrapper + Traffic logging ──
app.use((req, res, next) => {
    const startTime = Date.now();
    const ip        = (req.ip || req.headers['x-forwarded-for'] || '').replace('::ffff:', '');

    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const statusCode   = res.statusCode || 200;
            const responseData = { status: data.status, statusCode, creator: set.author.toLowerCase(), ...data };

            const skip = ['/admin', '/endpoints', '/set', '/stats', '/server-info', '/changelog', '/rate-status'].some(p => req.path.startsWith(p));
            if (!skip) {
                db.collection('traffic').add({
                    path:      req.path,
                    method:    req.method,
                    ip:        ip || 'unknown',
                    status:    statusCode,
                    duration:  Date.now() - startTime,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ua:        req.headers['user-agent'] || ''
                }).catch(() => {});
            }

            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

// ── Load scraper ──
(async () => {
    try {
        global.scraper = new (await require('./lib/scrape.js'))('./lib/scrape_file');
        global.scrape  = await scraper.list();
    } catch (e) {
        console.error('Failed to load scraper:', e.message);
    }
})();

function loadEndpointsFromDirectory(directory, baseRoute = '') {
    let endpoints = [];
    const fullPath = path.join(__dirname, directory);

    if (!fs.existsSync(fullPath)) return endpoints;

    const items = fs.readdirSync(fullPath);

    items.forEach(item => {
        const itemPath = path.join(fullPath, item);
        const stats    = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            const nested = loadEndpointsFromDirectory(path.join(directory, item), `${baseRoute}/${item}`);
            endpoints = [...endpoints, ...nested];
        } else if (stats.isFile() && item.endsWith('.js')) {
            try {
                const module = require(itemPath);
                if (module?.run && typeof module.run === 'function') {
                    const endpointName = item.replace('.js', '');
                    const endpointPath = `${baseRoute}/${endpointName}`;

                    app.all(endpointPath, (req, res, next) => {
                        const key = endpointPath.replace(/^\//, '').replace(/\//g, '_');
                        if (disabledEndpoints.has(key)) {
                            return res.status(503).json({ status: false, message: 'This endpoint is temporarily disabled.' });
                        }
                        return module.run(req, res, next);
                    });

                    let fullPathWithParams = endpointPath;
                    if (module.params?.length > 0) {
                        fullPathWithParams += '?' + module.params.map(p => `${p}=`).join('&');
                    }

                    const category      = module.category || 'Other';
                    const categoryIndex = endpoints.findIndex(e => e.name === category);
                    if (categoryIndex === -1) endpoints.push({ name: category, items: [] });

                    const categoryObj = endpoints.find(e => e.name === category);
                    const endpointObj = {};
                    endpointObj[module.name || endpointName] = {
                        desc:   module.desc   || 'No description provided',
                        path:   fullPathWithParams,
                        method: module.method || 'GET',
                        params: module.params || []
                    };
                    categoryObj.items.push(endpointObj);
                }
            } catch (e) {
                console.error(`Failed to load module ${itemPath}: ${e.message}`);
            }
        }
    });

    return endpoints;
}

const allEndpoints = loadEndpointsFromDirectory('api');

// ════════════════════════════════════════
//  HTML ROUTES
// ════════════════════════════════════════
app.get('/',             (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/docs',         (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('/contributors', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contributors.html')));
app.get('/status',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));
app.get('/luminaai',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'luminaai.html')));
app.get('/playground',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'playground.html')));
app.get('/admin',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ════════════════════════════════════════
//  API ROUTES
// ════════════════════════════════════════
app.get('/endpoints', (req, res) => {
    res.json({ status: true, count: allEndpoints.reduce((t, c) => t + c.items.length, 0), endpoints: allEndpoints });
});

app.get('/set', (req, res) => {
    res.json({ status: true, ...set });
});

// ════════════════════════════════════════
//  RATE STATUS ROUTE (public) — buat index.html
// ════════════════════════════════════════
app.get('/rate-status', (req, res) => {
    const ip    = (req.ip || req.headers['x-forwarded-for'] || '').replace('::ffff:', '') || 'unknown';
    const now   = Date.now();
    const entry = rateMap.get(ip);

    if (!entry || now > entry.resetAt) {
        // IP belum pernah hit atau windownya udah reset
        return res.json({
            status:    true,
            ip,
            limit:     RATE_LIMIT,
            used:      0,
            remaining: RATE_LIMIT,
            resetAt:   new Date(now + RATE_WINDOW).toISOString(),
            window:    '24 hours'
        });
    }

    const used      = entry.count;
    const remaining = Math.max(0, RATE_LIMIT - used);

    res.json({
        status:    true,
        ip,
        limit:     RATE_LIMIT,
        used,
        remaining,
        resetAt:   new Date(entry.resetAt).toISOString(),
        window:    '24 hours'
    });
});

// ════════════════════════════════════════
//  SERVER INFO ROUTE (public)
// ════════════════════════════════════════
app.get('/server-info', (req, res) => {
    const os      = require('os');
    const uptime  = process.uptime();
    const hours   = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const memUsage  = process.memoryUsage();
    const heapUsed  = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rss       = Math.round(memUsage.rss / 1024 / 1024);
    const memUsed   = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    res.json({
        status: true,
        server: {
            region:        set.server?.region      || 'Asia-Southeast',
            provider:      set.server?.provider    || 'Vercel',
            version:       set.server?.version     || 'v1.0.0',
            nodeVersion:   process.version,
            uptime:        `${hours}h ${minutes}m ${seconds}s`,
            uptimeSeconds: Math.floor(uptime),
            memUsed,
            memDetail:     `${heapUsed}MB / ${heapTotal}MB heap (${rss}MB RSS)`,
            platform:      os.platform(),
            arch:          os.arch()
        },
        owner: {
            name:   set.owner?.name   || set.author,
            github: set.owner?.github || '',
            wa:     set.owner?.wa     || set.info_url,
            avatar: set.owner?.avatar || set.icon
        },
        name:        set.name?.main || set.name,
        description: set.description
    });
});

// ════════════════════════════════════════
//  PUBLIC STATS ROUTE
// ════════════════════════════════════════
app.get('/stats', async (req, res) => {
    try {
        const snap    = await db.collection('traffic').orderBy('timestamp', 'desc').limit(500).get();
        const traffic = snap.docs.map(d => d.data());

        if (!traffic.length) {
            return res.json({ status: true, totalRequests: 0, successRate: 100, avgDuration: 0, topEndpoints: [], recentErrors: 0, last24h: 0 });
        }

        const total   = traffic.length;
        const ok      = traffic.filter(t => t.status >= 200 && t.status < 400);
        const rate    = ((ok.length / total) * 100).toFixed(1);
        const withDur = traffic.filter(t => t.duration);
        const avgDur  = withDur.length ? Math.round(withDur.reduce((s, t) => s + t.duration, 0) / withDur.length) : 0;

        const pathMap = {};
        traffic.forEach(t => {
            if (!t.path) return;
            if (!pathMap[t.path]) pathMap[t.path] = { count: 0, ok: 0, totalDur: 0 };
            pathMap[t.path].count++;
            if (t.status >= 200 && t.status < 400) { pathMap[t.path].ok++; pathMap[t.path].totalDur += (t.duration || 0); }
        });

        const topEndpoints = Object.entries(pathMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([path, d]) => ({ path, count: d.count, successRate: ((d.ok / d.count) * 100).toFixed(0), avgDuration: d.ok ? Math.round(d.totalDur / d.ok) : 0 }));

        const now     = Date.now();
        const last24h = traffic.filter(t => t.timestamp?.seconds && (now - t.timestamp.seconds * 1000) <= 24 * 60 * 60 * 1000).length;

        res.json({ status: true, totalRequests: total, successRate: parseFloat(rate), avgDuration: avgDur, topEndpoints, recentErrors: traffic.filter(t => t.status >= 400).length, last24h });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ════════════════════════════════════════
//  REPORT ROUTES
// ════════════════════════════════════════
const reportRateMap = new Map();
function checkReportLimit(ip) {
    const now   = Date.now();
    const entry = reportRateMap.get(ip);
    if (!entry || now > entry.resetAt) {
        reportRateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
        return true;
    }
    entry.count++;
    return entry.count <= 5;
}

app.post('/report', async (req, res) => {
    const ip = (req.ip || req.headers['x-forwarded-for'] || '').replace('::ffff:', '') || 'unknown';
    if (!checkReportLimit(ip)) return res.status(429).json({ status: false, message: 'Too many reports. Please wait before submitting again.' });

    const { endpoint, type, description, email } = req.body;
    if (!endpoint || endpoint.trim().length < 2) return res.status(400).json({ status: false, message: 'Endpoint URL is required.' });
    if (!type) return res.status(400).json({ status: false, message: 'Issue type is required.' });

    try {
        await db.collection('reports').add({
            endpoint:    endpoint.trim(),
            type,
            description: description?.trim() || '',
            email:       email?.trim() || '',
            ip,
            status:      'open',
            timestamp:   admin.firestore.FieldValue.serverTimestamp(),
            ua:          req.headers['user-agent'] || ''
        });
        res.json({ status: true, message: 'Report submitted successfully. Thank you!' });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ════════════════════════════════════════
//  ADMIN ROUTES
// ════════════════════════════════════════
async function verifyAdmin(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ status: false, message: 'Unauthorized' });
    try {
        const decoded     = await admin.auth().verifyIdToken(token);
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hiura0012@gmail.com';
        if (decoded.email !== ADMIN_EMAIL) return res.status(403).json({ status: false, message: 'Forbidden' });
        req.admin = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ status: false, message: 'Invalid token' });
    }
}

app.get('/admin/reports', verifyAdmin, async (req, res) => {
    try {
        const status = req.query.status || null;
        let query    = db.collection('reports').orderBy('timestamp', 'desc').limit(100);
        if (status) query = db.collection('reports').where('status', '==', status).orderBy('timestamp', 'desc').limit(100);
        const snap    = await query.get();
        const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({ status: true, count: reports.length, reports });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.patch('/admin/reports/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['open','in_progress','resolved','dismissed'].includes(status))
        return res.status(400).json({ status: false, message: 'Invalid status' });
    try {
        await db.collection('reports').doc(id).update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ status: true, message: `Report ${id} → ${status}` });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.delete('/admin/reports/:id', verifyAdmin, async (req, res) => {
    try {
        await db.collection('reports').doc(id).delete();
        res.json({ status: true, message: `Report ${req.params.id} deleted` });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// ════════════════════════════════════════
//  CHANGELOG ROUTES
// ════════════════════════════════════════
app.get('/changelog', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const snap  = await db.collection('changelog').orderBy('timestamp', 'desc').limit(limit).get();
        const entries = snap.docs.map(d => ({
            id: d.id, ...d.data(),
            timestamp: d.data().timestamp?.toDate?.()?.toISOString() || null
        }));
        res.json({ status: true, count: entries.length, entries });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.post('/admin/changelog', verifyAdmin, async (req, res) => {
    try {
        const { version, title, notes, type } = req.body;
        if (!version || !title || !notes?.length)
            return res.status(400).json({ status: false, message: 'version, title, notes wajib diisi' });
        const ref = await db.collection('changelog').add({
            version, title,
            notes: Array.isArray(notes) ? notes : [notes],
            type:  type || 'update',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ status: true, id: ref.id });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.patch('/admin/changelog/:id', verifyAdmin, async (req, res) => {
    try {
        const { version, title, notes, type } = req.body;
        const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (version) update.version = version;
        if (title)   update.title   = title;
        if (notes)   update.notes   = Array.isArray(notes) ? notes : [notes];
        if (type)    update.type    = type;
        await db.collection('changelog').doc(req.params.id).update(update);
        res.json({ status: true });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.delete('/admin/changelog/:id', verifyAdmin, async (req, res) => {
    try {
        await db.collection('changelog').doc(req.params.id).delete();
        res.json({ status: true });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.post('/admin/cache/reload', verifyAdmin, async (req, res) => {
    try {
        await reloadAdminCache();
        res.json({ status: true, message: 'Cache reloaded', blacklisted: blacklistCache.size, disabled: disabledEndpoints.size });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.get('/admin/traffic', verifyAdmin, async (req, res) => {
    try {
        const limit   = parseInt(req.query.limit) || 100;
        const snap    = await db.collection('traffic').orderBy('timestamp', 'desc').limit(limit).get();
        const traffic = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({ status: true, count: traffic.length, traffic });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.get('/admin/blacklist', verifyAdmin, async (req, res) => {
    try {
        const snap = await db.collection('blacklist').get();
        const list = snap.docs.map(d => ({ ip: d.id, ...d.data() }));
        res.json({ status: true, list });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.post('/admin/blacklist', verifyAdmin, async (req, res) => {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ status: false, message: 'IP required' });
    try {
        await db.collection('blacklist').doc(ip).set({ reason: reason || 'No reason', addedAt: admin.firestore.FieldValue.serverTimestamp(), addedBy: req.admin.email });
        await reloadAdminCache();
        res.json({ status: true, message: `IP ${ip} blacklisted` });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.delete('/admin/blacklist/:ip', verifyAdmin, async (req, res) => {
    const ip = decodeURIComponent(req.params.ip);
    try {
        await db.collection('blacklist').doc(ip).delete();
        await reloadAdminCache();
        res.json({ status: true, message: `IP ${ip} removed` });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.get('/admin/endpoints-status', verifyAdmin, async (req, res) => {
    try {
        const snap = await db.collection('endpoints_status').get();
        const list = snap.docs.map(d => ({ key: d.id, ...d.data() }));
        res.json({ status: true, list });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.post('/admin/endpoints-status', verifyAdmin, async (req, res) => {
    const { key, enabled } = req.body;
    if (!key) return res.status(400).json({ status: false, message: 'key required' });
    try {
        await db.collection('endpoints_status').doc(key).set({ enabled: !!enabled }, { merge: true });
        await reloadAdminCache();
        res.json({ status: true, message: `Endpoint ${key} → ${enabled ? 'enabled' : 'disabled'}` });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// ════════════════════════════════════════
//  ERROR HANDLERS
// ════════════════════════════════════════
app.use((req, res, next) => {
    const errorPath = path.join(__dirname, 'docs', 'err', '404.html');
    if (fs.existsSync(errorPath)) res.status(404).sendFile(errorPath);
    else res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
    console.error(`500: ${err.message}`);
    const errorPath = path.join(__dirname, 'docs', 'err', '500.html');
    if (fs.existsSync(errorPath)) res.status(500).sendFile(errorPath);
    else res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
