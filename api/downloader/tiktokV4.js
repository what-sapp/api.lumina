const axios = require("axios");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         TIKTOK DOWNLOADER — kol.id                          ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  USAGE CLI:                                                  ║
 * ║  node tiktokdl.js "https://vt.tiktok.com/ZSmCgrhKC/"        ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url → URL TikTok (wajib)                                    ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";

// ─── GET TOKEN + COOKIE ───────────────────────────────────────────────────────

async function getTokenAndCookie() {
    const res = await axios.get("https://kol.id/download-video/tiktok", {
        headers: { "user-agent": UA, "accept": "text/html" },
    });

    const tokenMatch = res.data.match(/name="_token"\s+value="([^"]+)"/);
    const token      = tokenMatch?.[1];
    if (!token) throw new Error("Token tidak ditemukan");

    const cookies = (res.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
    return { token, cookies };
}

// ─── PARSE HTML RESULT ────────────────────────────────────────────────────────

function parseHtml(html) {
    // Thumbnail
    const thumbM  = html.match(/src="([^"]+)"[^>]*id="popupCover"|id="popupCover"[^>]*src="([^"]+)"/);
    const thumb   = (thumbM?.[1] || thumbM?.[2])?.replace(/&amp;/g, "&") || null;

    // Title
    const titleM  = html.match(/<h2>([^<]+)<\/h2>/);
    const title   = titleM?.[1]?.trim() || null;

    // Author
    const authorM = html.match(/@([a-zA-Z0-9_.]+)<\/span>/);
    const author  = authorM?.[1] || null;

    // Video URL (dengan watermark)
    const videoM  = html.match(/href="([^"]+)"[^>]*>Download Video<\/a>/);
    const video   = videoM?.[1]?.replace(/&amp;/g, "&") || null;

    // No watermark HD
    const nowmM   = html.match(/href="([^"]+)"[^>]*>Download Tanpa Watermark Full HD<\/a>/);
    const nowm    = nowmM?.[1]?.replace(/&amp;/g, "&") || null;

    // MP3
    const mp3M    = html.match(/href="([^"]+)"[^>]*>Download Mp3<\/a>/);
    const mp3     = mp3M?.[1]?.replace(/&amp;/g, "&") || null;

    return { title, author, thumbnail: thumb, video_url: video, no_watermark: nowm, mp3_url: mp3 };
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function tiktokDl(url) {
    const { token, cookies } = await getTokenAndCookie();

    const { data } = await axios.post("https://kol.id/download-video/tiktok",
        `url=${encodeURIComponent(url)}&_token=${token}`,
        {
            headers: {
                "accept":           "*/*",
                "accept-language":  "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                "content-type":     "application/x-www-form-urlencoded; charset=UTF-8",
                "cookie":           cookies,
                "origin":           "https://kol.id",
                "referer":          "https://kol.id/download-video/tiktok",
                "user-agent":       UA,
                "x-requested-with": "XMLHttpRequest",
                "sec-fetch-dest":   "empty",
                "sec-fetch-mode":   "cors",
                "sec-fetch-site":   "same-origin",
            },
        }
    );

    if (!data?.status) throw new Error("Gagal: " + JSON.stringify(data));
    return parseHtml(data.html);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, url] = process.argv;
    if (!url) {
        console.log("Usage:");
        console.log('  node tiktokdl.js "https://vt.tiktok.com/ZSmCgrhKC/"');
        process.exit(1);
    }
    tiktokDl(url)
        .then(r  => console.log("✅ Result:", JSON.stringify(r, null, 2)))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "TikTok V4",
        desc:     "Download video TikTok tanpa watermark via kol.id — gratis tanpa login.",
        category: "Downloader",
        params:   ["url"],
        async run(req, res) {
            try {
                const { url } = req.query;
                if (!url) return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });

                const result = await tiktokDl(url);
                return res.status(200).json({
                    status: true,
                    creator: "Shannz x Xena",
                    result
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
