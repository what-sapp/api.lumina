const axios = require('axios');
const cheerio = require('cheerio');

/**
 * TIKTOK DOWNLOADER (SAVETT BYPASS)
 * Status: GOD MODE - Fitur ke-95
 * Creator: Xena
 * Feature: Video No-WM, Video WM, Audio MP3, & Photo Slides Support
 */
module.exports = {
    name: "TikTok Downloader",
    desc: "Download video/musik/slide TikTok tanpa watermark.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Link TikTok-nya mana, Xena?" });

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Origin': 'https://savett.cc',
            'Referer': 'https://savett.cc/en1/download',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
        };

        try {
            // STEP 1: Get CSRF & Cookie
            const getRes = await axios.get('https://savett.cc/en1/download');
            const csrf = getRes.data.match(/name="csrf_token" value="([^"]+)"/)?.[1];
            const cookie = getRes.headers['set-cookie'].map(v => v.split(';')[0]).join('; ');

            // STEP 2: POST to Download API
            const postRes = await axios.post('https://savett.cc/en1/download', 
                `csrf_token=${encodeURIComponent(csrf)}&url=${encodeURIComponent(url)}`,
                { headers: { ...headers, Cookie: cookie } }
            );

            // STEP 3: Parsing HTML Jeroan SaveTT (Xena Logic)
            const $ = cheerio.load(postRes.data);
            const stats = [];
            $('#video-info .my-1 span').each((_, el) => { stats.push($(el).text().trim()); });

            const result = {
                username: $('#video-info h3').first().text().trim(),
                stats: {
                    views: stats[0] || "0",
                    likes: stats[1] || "0",
                    bookmarks: stats[2] || "0",
                    comments: stats[3] || "0",
                    shares: stats[4] || "0"
                },
                duration: $('#video-info p.text-muted').first().text().replace(/Duration:/i, '').trim() || null,
                type: 'video',
                downloads: { nowm: [], wm: [], mp3: [] },
                slides: []
            };

            // Logic Photo Slide
            const slides = $('.carousel-item[data-data]');
            if (slides.length) {
                result.type = 'photo';
                slides.each((_, el) => {
                    try {
                        const json = JSON.parse($(el).attr('data-data').replace(/&quot;/g, '"'));
                        if (Array.isArray(json.URL)) result.slides.push(...json.URL);
                    } catch {}
                });
            } else {
                // Logic Video & MP3
                $('#formatselect option').each((_, el) => {
                    const label = $(el).text().toLowerCase();
                    const raw = $(el).attr('value');
                    if (!raw) return;
                    try {
                        const json = JSON.parse(raw.replace(/&quot;/g, '"'));
                        if (!json.URL) return;
                        if (label.includes('mp4') && !label.includes('watermark')) result.downloads.nowm.push(...json.URL);
                        if (label.includes('watermark')) result.downloads.wm.push(...json.URL);
                        if (label.includes('mp3')) result.downloads.mp3.push(...json.URL);
                    } catch {}
                });
            }

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result
            });

        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
