const axios = require('axios');

const BASE_URL = 'https://spotmate.online';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

async function getCsrf() {
    const r       = await axios.get(`${BASE_URL}/en1`, { headers: { 'User-Agent': UA } });
    const cookies = (r.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    const match   = r.data.match(/content="([a-zA-Z0-9]{40,})"/);
    const csrf    = match ? match[1] : '';
    return { cookies, csrf };
}

module.exports = {
    name: "Spotify V2",
    desc: "Download lagu Spotify via spotmate.online.",
    category: "Downloader",
    method: "GET",
    params: ["url"],
    paramsSchema: {
        url: { type: "text", label: "Spotify Track URL", required: true }
    },

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });
        if (!url.includes('spotify.com')) return res.status(400).json({ status: false, error: "URL Spotify tidak valid." });

        try {
            const { cookies, csrf } = await getCsrf();

            const r = await axios.post(`${BASE_URL}/getTrackData`, { spotify_url: url }, {
                headers: {
                    'User-Agent':      UA,
                    'Accept':          '*/*',
                    'Accept-Language': 'id-ID,id;q=0.9',
                    'Content-Type':    'application/json',
                    'Origin':          BASE_URL,
                    'Referer':         BASE_URL + '/en1',
                    'Cookie':          cookies,
                    'X-CSRF-TOKEN':    csrf
                }
            });

            const data = r.data;
            if (!data || data.error) throw new Error(data?.error || 'Gagal mendapatkan data track');

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: data
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

