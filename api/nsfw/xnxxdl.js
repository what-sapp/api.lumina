const axios = require('axios');

/**
 * XNXX DOWNLOADER
 * Source: api.deline.web.id
 * Creator: Xena
 */
module.exports = {
    name: "XNXXDownloader",
    desc: "Download video dari XNXX berdasarkan URL.",
    category: "NSFW",
    params: ["url"],

    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !url.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "Parameter 'url' wajib diisi. Contoh: ?url=https://www.xnxx.com/video-xxx/..."
                });
            }

            if (!url.includes('xnxx.com')) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "URL harus dari xnxx.com"
                });
            }

            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            const response = await axios.get('https://api.deline.web.id/downloader/xnxx', {
                params: { url: url.trim() },
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
                    'Referer': 'https://api.deline.web.id/',
                    'Origin': 'https://api.deline.web.id',
                    'sec-ch-ua': '"Chromium";v="107", "Not=A?Brand";v="24"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                },
                timeout: 20000,
                responseType: 'text'
            });

            const raw = response.data;

            if (typeof raw === 'string' && raw.trim().startsWith('<')) {
                return res.status(502).json({
                    status: false,
                    creator: "Shannz",
                    error: "Source API mengembalikan HTML, kemungkinan kena rate limit atau block."
                });
            }

            let data;
            try {
                data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            } catch (e) {
                return res.status(502).json({
                    status: false,
                    creator: "Shannz",
                    error: "Gagal parse response dari source API."
                });
            }

            if (!data || !data.status || !data.result) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Video tidak ditemukan atau URL tidak valid."
                });
            }

            const r = data.result;

            res.status(200).json({
                status: true,
                creator: "Shannz",
                result: {
                    title:    r.title    || "",
                    url:      r.URL      || url,
                    duration: r.duration || "",
                    info:     r.info     || "",
                    image:    r.image    || "",
                    files: {
                        low:          r.files?.low          || "",
                        high:         r.files?.high         || "",
                        HLS:          r.files?.HLS          || "",
                        thumb:        r.files?.thumb        || "",
                        thumb69:      r.files?.thumb69      || "",
                        thumbSlide:   r.files?.thumbSlide   || "",
                        thumbSlideBig: r.files?.thumbSlideBig || ""
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Shannz",
                error: error.message
            });
        }
    }
};

