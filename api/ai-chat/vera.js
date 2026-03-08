const https = require('https');
const http  = require('http');

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

const BASE_HEADERS = {
    'accept':             '*/*',
    'accept-language':    'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'content-type':       'application/json',
    'origin':             'https://vera.sc',
    'referer':            'https://vera.sc/',
    'sec-ch-ua':          '"Chromium";v="107", "Not=A?Brand";v="24"',
    'sec-ch-ua-mobile':   '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest':     'empty',
    'sec-fetch-mode':     'cors',
    'sec-fetch-site':     'same-site',
    'user-agent':         'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

let cachedAuth = null;

async function getAuth() {
    if (cachedAuth && cachedAuth.expiry > Date.now()) return cachedAuth.cookie;

    const res = await request('https://workers.vera.sc/identity/get-id', {
        method: 'GET',
        headers: BASE_HEADERS
    });

    if (res.status !== 200) throw new Error('Gagal generate JWT');

    const setCookie = res.headers['set-cookie'] || [];
    const cookieStr = setCookie.map(c => c.split(';')[0]).join('; ');
    if (!cookieStr) throw new Error('Tidak ada cookie dari get-id');

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

    const lines  = res.body.split('\n');
    let fullText = '';

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
