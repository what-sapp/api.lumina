const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * XNXX DETAIL
 * Creator: Shannz
 */
module.exports = {
    name: "XNXXDetail",
    desc: "Mendapatkan detail lengkap video XNXX berdasarkan URL.",
    category: "NSFW",
    params: ["url"],

    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !url.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "Parameter 'url' wajib diisi. Contoh: ?url=https://www.xnxx.com/video-xxx/slug"
                });
            }

            if (!url.includes('xnxx.com')) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "URL harus dari xnxx.com"
                });
            }

            const { data: html } = await axios.get(url.trim(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.xnxx.com/',
                },
                timeout: 20000,
                decompress: true,
                httpsAgent: agent,
            });

            const extract = (pattern) => {
                const m = html.match(pattern);
                return m ? m[1] : '';
            };

            // ── Title ──
            const title = extract(/html5player\.setVideoTitle\('([^']+)'\)/)
                       || extract(/"video_title":"([^"]+)"/)
                       || '';

            // ── Thumb ──
            const thumb    = extract(/setThumbUrl\('([^']+)'\)/) || '';
            const thumb169 = extract(/setThumbUrl169\('([^']+)'\)/) || '';

            // ── Video files ──
            const videoLow  = extract(/html5player\.setVideoUrlLow\('([^']+)'\)/) || '';
            const videoHigh = extract(/html5player\.setVideoUrlHigh\('([^']+)'\)/) || '';
            const videoHLS  = extract(/html5player\.setVideoHLS\('([^']+)'\)/) || '';

            // ── Duration — og:duration meta ──
            const durationRaw = extract(/og:duration"\s+content="(\d+)"/) || '';
            const duration = durationRaw
                ? `${Math.floor(parseInt(durationRaw) / 60)}min ${parseInt(durationRaw) % 60}s`
                : '';

            // ── Views — "- 1,202,930 <span class="icon-f icf-eye">" ──
            const views = extract(/- ([\d,]+)\s*<span class="icon-f icf-eye"/) || '';

            // ── Rating ──
            const ratingPercent = extract(/rating-box value">([^<]+)<\/span>/) || '';
            const ratingUp = (() => {
                const m = html.match(/vote-action-good[^>]+>[\s\S]*?<span class="value">([\d,]+)<\/span>/);
                return m ? m[1] : '';
            })();
            const ratingDown = (() => {
                const m = html.match(/vote-action-bad[^>]+>[\s\S]*?<span class="value">([\d,]+)<\/span>/);
                return m ? m[1] : '';
            })();

            // ── Tags ──
            const tags = [];
            for (const m of html.matchAll(/class="is-keyword"[^>]*>([^<]+)<\/a>/g)) {
                tags.push(m[1].trim());
            }

            if (!title) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Video tidak ditemukan atau URL tidak valid."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
                result: {
                    title,
                    url: url.trim(),
                    thumb,
                    thumb169,
                    duration,
                    durationSec: durationRaw,
                    views,
                    rating: {
                        percent: ratingPercent,
                        up:      ratingUp,
                        down:    ratingDown,
                    },
                    tags,
                    files: {
                        low:  videoLow,
                        high: videoHigh,
                        hls:  videoHLS,
                    },
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

