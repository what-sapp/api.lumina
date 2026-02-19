(async () => {
    const cors = require('cors');
    const express = require('express');
    const fs = require('fs');
    const path = require('path');
    const set = require('./settings');
    const chalk = require('chalk');
    const admin = require('firebase-admin');

    const app = express();
    const PORT = process.env.PORT || 4000;

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

    const logger = {
        info:  (msg) => console.log(chalk.dim.blue('•')  + chalk.dim(' info  - ') + msg),
        ready: (msg) => console.log(chalk.dim.green('•') + chalk.dim(' ready - ') + msg),
        warn:  (msg) => console.log(chalk.dim.yellow('•')+ chalk.dim(' warn  - ') + msg),
        error: (msg) => console.log(chalk.dim.red('•')   + chalk.dim(' error - ') + msg),
        event: (msg) => console.log(chalk.dim.cyan('•')  + chalk.dim(' event - ') + msg),
    };

    app.set('trust proxy', true);
    app.set('json spaces', 2);

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
    app.use('/', express.static(path.join(__dirname, 'docs')));

    // ════════════════════════════════════════
    //  CACHE — reload tiap 30 detik
    // ════════════════════════════════════════
    let blacklistCache    = new Set();
    let disabledEndpoints = new Set();

    async function reloadAdminCache() {
        try {
            const blSnap = await db.collection('blacklist').get();
            blacklistCache = new Set(blSnap.docs.map(d => d.id));

            const epSnap = await db.collection('endpoints_status').where('enabled', '==', false).get();
            disabledEndpoints = new Set(epSnap.docs.map(d => d.id));

            logger.info(`Cache refreshed — ${blacklistCache.size} blocked IPs, ${disabledEndpoints.size} disabled endpoints`);
        } catch (e) {
            logger.warn(`Cache reload failed: ${e.message}`);
        }
    }

    await reloadAdminCache();
    setInterval(reloadAdminCache, 30000); // background sync tiap 30 detik

    // ════════════════════════════════════════
    //  SIMPLE IN-MEMORY RATE LIMITER
    // ════════════════════════════════════════
    const rateMap = new Map(); // ip -> { count, resetAt }
    const RATE_LIMIT    = 60;  // max request per window
    const RATE_WINDOW   = 60 * 1000; // 1 menit

    function checkRateLimit(ip) {
        const now  = Date.now();
        const entry = rateMap.get(ip);
        if (!entry || now > entry.resetAt) {
            rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
            return true;
        }
        entry.count++;
        if (entry.count > RATE_LIMIT) return false;
        return true;
    }

    // Bersihkan rateMap tiap 5 menit biar ga numpuk
    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of rateMap.entries()) {
            if (now > entry.resetAt) rateMap.delete(ip);
        }
    }, 5 * 60 * 1000);

    // ════════════════════════════════════════
    //  MIDDLEWARE — IP Blacklist check
    // ════════════════════════════════════════
    app.use((req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const cleanIp = ip?.replace('::ffff:', '') || 'unknown';

        // Cek blacklist
        if (blacklistCache.has(cleanIp)) {
            logger.warn(`Blocked IP: ${cleanIp} → ${req.path}`);
            return res.status(403).json({
                status: false,
                message: 'Access denied. Your IP has been blocked.'
            });
        }

        // Cek rate limit (skip untuk static files & admin)
        if (!req.path.startsWith('/admin') && !req.path.match(/\.(html|css|js|png|ico)$/)) {
            if (!checkRateLimit(cleanIp)) {
                logger.warn(`Rate limited: ${cleanIp} → ${req.path}`);
                return res.status(429).json({
                    status: false,
                    message: 'Too many requests. Please slow down.',
                    retryAfter: '60s'
                });
            }
        }

        next();
    });

    // ════════════════════════════════════════
    //  MIDDLEWARE — Response wrapper + Traffic logging
    // ════════════════════════════════════════
    app.use((req, res, next) => {
        const startTime = Date.now();
        const ip = (req.ip || req.headers['x-forwarded-for'] || '').replace('::ffff:', '');

        const originalJson = res.json;
        res.json = function (data) {
            if (data && typeof data === 'object') {
                const statusCode = res.statusCode || 200;
                const responseData = {
                    status: data.status,
                    statusCode,
                    creator: set.author.toLowerCase(),
                    ...data
                };

                // Log traffic ke Firestore (non-blocking)
                const duration = Date.now() - startTime;
                if (!req.path.startsWith('/admin') && req.path !== '/endpoints' && req.path !== '/set') {
                    db.collection('traffic').add({
                        path:      req.path,
                        method:    req.method,
                        ip:        ip || 'unknown',
                        status:    statusCode,
                        duration,
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

    logger.info('Loading scraper module...');
    global.scraper = new (await require('./lib/scrape.js'))('./lib/scrape_file');
    global.scrape  = await scraper.list();

    setInterval(async () => {
        try { await scraper.load(); }
        catch (e) { logger.error(`Failed to reload scraper: ${e.message}`); }
    }, 2000);

    function loadEndpointsFromDirectory(directory, baseRoute = '') {
        let endpoints = [];
        const fullPath = path.join(__dirname, directory);

        if (!fs.existsSync(fullPath)) {
            logger.warn(`Directory not found: ${fullPath}`);
            return endpoints;
        }

        logger.info(`Scanning directory: ${directory}...`);
        const items = fs.readdirSync(fullPath);

        items.forEach(item => {
            const itemPath = path.join(fullPath, item);
            const stats    = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                console.log('');
                logger.info(`Found subdirectory: ${item}`);
                const nested = loadEndpointsFromDirectory(path.join(directory, item), `${baseRoute}/${item}`);
                endpoints = [...endpoints, ...nested];
            } else if (stats.isFile() && item.endsWith('.js')) {
                try {
                    const module       = require(itemPath);
                    if (module?.run && typeof module.run === 'function') {
                        const endpointName = item.replace('.js', '');
                        const endpointPath = `${baseRoute}/${endpointName}`;

                        // ── Wrap run dengan disabled check ──
                        app.all(endpointPath, (req, res, next) => {
                            const key = endpointPath.replace(/^\//, '').replace(/\//g, '_');
                            if (disabledEndpoints.has(key)) {
                                return res.status(503).json({
                                    status:   false,
                                    message:  'This endpoint is temporarily disabled.'
                                });
                            }
                            return module.run(req, res, next);
                        });

                        const category      = module.category || 'Other';
                        const categoryIndex = endpoints.findIndex(e => e.name === category);
                        if (categoryIndex === -1) endpoints.push({ name: category, items: [] });

                        const categoryObj  = endpoints.find(e => e.name === category);
                        const endpointObj  = {};
                        endpointObj[module.name || endpointName] = {
                            desc:   module.desc   || 'No description provided',
                            path:   endpointPath,
                            method: module.method || 'GET',
                            params: module.params || [],
                            status: module.status || 'ready',
                        };
                        categoryObj.items.push(endpointObj);

                        logger.ready(`${chalk.green(endpointPath)} ${chalk.dim('(')}${chalk.cyan(category)}${chalk.dim(')')}`);
                    }
                } catch (e) {
                    logger.error(`Failed to load module ${itemPath}: ${e.message}`);
                }
            }
        });

        return endpoints;
    }

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'docs', 'index.html'));
    });

    logger.info('Loading API endpoints...');
    const allEndpoints = loadEndpointsFromDirectory('api');
    console.log('');
    logger.ready(`Loaded ${allEndpoints.reduce((t, c) => t + c.items.length, 0)} endpoints`);

    app.get('/endpoints', (req, res) => {
        res.json({
            status:    true,
            count:     allEndpoints.reduce((t, c) => t + c.items.length, 0),
            endpoints: allEndpoints
        });
    });

    app.get('/set', (req, res) => {
        res.json({ status: true, ...set });
    });

    // ════════════════════════════════════════
    //  ADMIN API ROUTES
    // ════════════════════════════════════════

    // Middleware — verify Firebase ID token
    async function verifyAdmin(req, res, next) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ status: false, message: 'Unauthorized' });

        try {
            const decoded = await admin.auth().verifyIdToken(token);
            const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'robin@gmail.com';
            if (decoded.email !== ADMIN_EMAIL) {
                return res.status(403).json({ status: false, message: 'Forbidden' });
            }
            req.admin = decoded;
            next();
        } catch (e) {
            return res.status(401).json({ status: false, message: 'Invalid token' });
        }
    }

    // POST /admin/cache/reload — force reload cache instan
    app.post('/admin/cache/reload', verifyAdmin, async (req, res) => {
        try {
            await reloadAdminCache();
            res.json({ status: true, message: 'Cache reloaded', blacklisted: blacklistCache.size, disabled: disabledEndpoints.size });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // GET /admin/traffic — ambil data traffic
    app.get('/admin/traffic', verifyAdmin, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const snap  = await db.collection('traffic')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const traffic = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.json({ status: true, count: traffic.length, traffic });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // GET /admin/blacklist — list IP
    app.get('/admin/blacklist', verifyAdmin, async (req, res) => {
        try {
            const snap = await db.collection('blacklist').get();
            const list = snap.docs.map(d => ({ ip: d.id, ...d.data() }));
            res.json({ status: true, list });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // POST /admin/blacklist — tambah IP
    app.post('/admin/blacklist', verifyAdmin, async (req, res) => {
        const { ip, reason } = req.body;
        if (!ip) return res.status(400).json({ status: false, message: 'IP required' });
        try {
            await db.collection('blacklist').doc(ip).set({
                reason:    reason || 'No reason',
                addedAt:   admin.firestore.FieldValue.serverTimestamp(),
                addedBy:   req.admin.email
            });
            await reloadAdminCache();
            res.json({ status: true, message: `IP ${ip} blacklisted` });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // DELETE /admin/blacklist/:ip — hapus IP
    app.delete('/admin/blacklist/:ip', verifyAdmin, async (req, res) => {
        const ip = decodeURIComponent(req.params.ip);
        try {
            await db.collection('blacklist').doc(ip).delete();
            await reloadAdminCache();
            res.json({ status: true, message: `IP ${ip} removed` });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // GET /admin/endpoints-status — list status
    app.get('/admin/endpoints-status', verifyAdmin, async (req, res) => {
        try {
            const snap = await db.collection('endpoints_status').get();
            const list = snap.docs.map(d => ({ key: d.id, ...d.data() }));
            res.json({ status: true, list });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // POST /admin/endpoints-status — toggle endpoint
    app.post('/admin/endpoints-status', verifyAdmin, async (req, res) => {
        const { key, enabled } = req.body;
        if (!key) return res.status(400).json({ status: false, message: 'key required' });
        try {
            await db.collection('endpoints_status').doc(key).set({ enabled: !!enabled }, { merge: true });
            await reloadAdminCache();
            res.json({ status: true, message: `Endpoint ${key} → ${enabled ? 'enabled' : 'disabled'}` });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    app.use((req, res, next) => {
        logger.info(`404: ${req.method} ${req.path}`);
        res.status(404).sendFile(process.cwd() + '/docs/err/404.html');
    });

    app.use((err, req, res, next) => {
        logger.error(`500: ${err.message}`);
        res.status(500).sendFile(process.cwd() + '/docs/err/500.html');
    });

    app.listen(PORT, () => {
        console.log('');
        logger.ready('Server started successfully');
        logger.info(`Local:   ${chalk.cyan(`http://localhost:${PORT}`)}`);
        try {
            const { networkInterfaces } = require('os');
            const nets = networkInterfaces();
            for (const [, addresses] of Object.entries(nets)) {
                for (const net of addresses) {
                    if (net.family === 'IPv4' && !net.internal) {
                        logger.info(`Network: ${chalk.cyan(`http://${net.address}:${PORT}`)}`);
                    }
                }
            }
        } catch (e) { logger.warn(`Cannot detect network: ${e.message}`); }
        logger.info(chalk.dim('Ready for connections'));
    });

    module.exports = app;
})();
