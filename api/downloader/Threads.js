const axios = require('axios');
const cheerio = require('cheerio');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Threads Downloader",
    desc: "Download video atau foto dari postingan Threads",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !url.includes('threads.net')) {
                return res.status(400).json({
                    status: false,
                    error: 'Masukkan URL Threads yang valid!'
                });
            }

            console.log(`Downloading Threads content: ${url}`);

            const base = 'https://threadster.app';
            const headers = {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
            };

            // 1. Ambil Cookie Sesi
            const home = await axios.get(base, { headers });
            const cookies = home.headers['set-cookie'] ? home.headers['set-cookie'].map(v => v.split(';')[0]).join('; ') : '';

            // 2. Submit URL ke Download Engine
            const body = new URLSearchParams();
            body.append('url', url);

            const { data: html } = await axios.post(`${base}/download`, body.toString(), {
                headers: {
                    ...headers,
                    'content-type': 'application/x-www-form-urlencoded',
                    'referer': base + '/',
                    'cookie': cookies
                }
            });

            const $ = cheerio.load(html);
            const result = {
                image: null,
                video: null
            };

            // 3. Scraping Image & Video Token
            $('img').each((_, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('/threadster/image?token=')) {
                    result.image = 'https://downloads.acxcdn.com/threadster/image?token=' + src.split('token=')[1];
                }
            });

            $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('/threadster/video?token=')) {
                    result.video = 'https://downloads.acxcdn.com/threadster/video?token=' + href.split('token=')[1];
                }
            });

            if (!result.image && !result.video) {
                return res.status(404).json({
                    status: false,
                    error: "Konten tidak ditemukan. Pastikan postingan publik."
                });
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: result
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
