/*
Base : https://teraboxdl.site
Author : ZennzXD
Created : Jumat 6 Maret 2026
*/

module.exports = {
    name: "TeraboxDL",
    desc: "Download file dari Terabox via teraboxdl.site.",
    category: "Downloader",
    params: ["url"],
    paramsSchema: {
        url: { type: "text", label: "Terabox URL", required: true }
    },

    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'origin': 'https://teraboxdl.site',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://teraboxdl.site/',
        'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
    },

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const r = await fetch('https://teraboxdl.site/api/proxy', {
                method: 'POST',
                headers: this.HEADERS,
                body: JSON.stringify({ url })
            });

            const data = await r.json();

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
