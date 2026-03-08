const https  = require('https');
const http   = require('http');
const crypto = require('crypto');

function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const proto  = parsed.protocol === 'https:' ? https : http;
        const opts   = {
            hostname: parsed.hostname,
            path:     parsed.pathname + parsed.search,
            method:   options.method || 'GET',
            headers:  options.headers || {},
        };
        const req = proto.request(opts, (res) => {
            let data = '';
            res.on('data', d => data += d.toString());
            res.on('end', () => resolve({
                status:  res.statusCode,
                headers: res.headers,
                body:    data,
                json:    () => JSON.parse(data),
            }));
        });
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const BASE_HEADERS = {
    'accept':           '*/*',
    'accept-language':  'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'content-type':     'application/json',
    'origin':           'https://vera.sc',
    'referer':          'https://vera.sc/',
    'sec-ch-ua':        '"Chromium";v="107", "Not=A?Brand";v="24"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest':   'empty',
    'sec-fetch-mode':   'cors',
    'sec-fetch-site':   'same-site',
    'user-agent':       'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
};

// ─── TEMPMAIL ────────────────────────────────────────────────────────────────

async function getInbox(username) {
    const res = await request(`https://akunlama.com/api/v1/mail/list?recipient=${username}`);
    let data; try { data = res.json(); } catch { return []; }
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map(item => ({ region: item.storage.region, key: item.storage.key }));
}

async function getOTP(region, key) {
    const res     = await request(`https://akunlama.com/api/v1/mail/getHtml?region=${region}&key=${key}`);
    const matches = res.body.match(/\b\d{6}\b/g);
    return matches ? matches[0] : null;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

let cachedAuth = null;

async function getAuth() {
    if (cachedAuth && cachedAuth.expiry > Date.now()) return cachedAuth.cookie;

    const username = crypto.randomBytes(6).toString('hex');
    const email    = `${username}@akunlama.com`;

    const sendRes = await request(
        'https://workers.vera.sc/identity/email-auth',
        { method: 'POST', headers: BASE_HEADERS },
        { email }
    );
    if (sendRes.status !== 200) throw new Error('Gagal kirim OTP: ' + sendRes.body);

    // Ambil otpToken dari set-cookie
    const sendCookies = sendRes.headers['set-cookie'] || [];
    const otpToken    = sendCookies.map(c => c.split(';')[0]).join('; ');

    let otp = null, attempt = 0;
    while (!otp) {
        await sleep(3000);
        const mails = await getInbox(username);
        if (mails.length > 0) otp = await getOTP(mails[0].region, mails[0].key);
        if (++attempt > 20) throw new Error('OTP timeout');
    }

    const signRes = await request(
        'https://workers.vera.sc/identity/verify-otp',
        { method: 'POST', headers: { ...BASE_HEADERS, 'cookie': otpToken } },
        { otp }
    );
    if (signRes.status !== 200) throw new Error('Login gagal: ' + signRes.body);

    const setCookie = signRes.headers['set-cookie'] || [];
    const cookieStr = setCookie.map(c => c.split(';')[0]).join('; ');

    // Cache 6 hari (expire 7 hari)
    cachedAuth = { cookie: cookieStr, expiry: Date.now() + 6 * 24 * 60 * 60 * 1000 };
    return cookieStr;
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────

async function chat(prompt, cookie) {
    const res = await request(
        'https://workers.vera.sc/chat/new-conversation',
        { method: 'POST', headers: { ...BASE_HEADERS, 'cookie': cookie } },
        { message: prompt, attachments: [] }
    );

    const lines   = res.body.split('\n');
    let fullText  = '';

    for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try {
            const data = JSON.parse(line.slice(5).trim());
            if (data?.role === 'assistant' && data?.delta && data.delta !== '[REDACTED]') {
                fullText += data.delta;
            }
        } catch {}
    }

    return fullText.trim() || 'No response';
}

module.exports = {
    name: 'VeraAI',
    desc: 'Chat dengan Vera AI by Vectrum via vera.sc.',
    category: 'AI CHAT',
    method: 'GET',
    params: ['prompt'],
    paramsSchema: {
        prompt: { type: 'text', label: 'Prompt', required: true }
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const cookie   = await getAuth();
            const response = await chat(prompt, cookie);

            res.status(200).json({
                status: true,
                creator: 'Xena',
                result: { response }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
