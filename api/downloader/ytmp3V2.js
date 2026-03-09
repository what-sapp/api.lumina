const https = require('https');
const http  = require('http');

function request(url, options = {}) {
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
            res.on('end', () => resolve({ status: res.statusCode, body: data, json: () => JSON.parse(data) }));
        });
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
        req.end();
    });
}

const BASE_HEADERS = {
    'User-Agent':      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'Accept':          'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer':         'https://onlymp3.org/en6/youtube-to-mp3',
    'Origin':          'https://onlymp3.org'
};

function extractVideoId(input) {
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
        const match = input.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    }
    return input;
}

module.exports = {
    name: "YTMP3 V2",
    desc: "Convert YouTube video ke MP3 via goapis.net.",
    category: "Downloader",
    method: "GET",
    params: ["url"],
    paramsSchema: {
        url: { type: "text", label: "YouTube URL / Video ID", required: true }
    },

    async run(req, res) {
        const input = req.query.url;
        if (!input) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        const videoId = extractVideoId(input);
        if (!videoId) return res.status(400).json({ status: false, error: "URL YouTube tidak valid." });

        try {
            const apiUrl = `https://goapis.net/api/v2/convert?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=mp3`;
            const r      = await request(apiUrl, { headers: BASE_HEADERS });
            const data   = r.json();

            const downloadUrl = data.url || data.download_url || data.downloadUrl || data.link || data.file;
            if (!downloadUrl) throw new Error("Gagal mendapatkan link download: " + JSON.stringify(data));

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    videoId,
                    youtube_url:  `https://youtu.be/${videoId}`,
                    download_url: downloadUrl
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

