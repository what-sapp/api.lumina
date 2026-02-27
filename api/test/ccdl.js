/**
 * CAPCUT DOWNLOADER - Fitur ke-130
 * Status: ULTIMATE (Direct Link Bypass)
 * Deskripsi: Download video CapCut tanpa watermark via 3bic API.
 * Creator: Shannz x Xena
 */

async function downloadCapCut(url) {
    const res = await fetch('https://3bic.com/api/download', {
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'origin': 'https://3bic.com',
            'referer': 'https://3bic.com/id',
            'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36...'
        },
        body: JSON.stringify({ url })
    }).then(r => r.json());

    if (res.code !== 200) throw new Error("Gagal mengambil data dari server 3bic.");

    // Taktik Sakti: Decode Base64 dari path CDN
    const base64Data = res.originalVideoUrl.split('/api/cdn/')[1];
    const directUrl = Buffer.from(base64Data, 'base64').toString('utf-8');

    return {
        title: res.title,
        author: res.authorName,
        thumbnail: res.coverUrl,
        videoUrl: directUrl, // Jalur Langit (Direct Server)
        proxyUrl: `https://3bic.com${res.originalVideoUrl}`
    };
}

module.exports = {
    name: "CapCutDL",
    desc: "Download video CapCut tanpa WM. Cukup masukkan link template/video.",
    category: "TEST",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, creator: "Xena", error: "Link CapCut-nya mana, Senior?" });

        try {
            const result = await downloadCapCut(url);
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result
            });
        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: err.message });
        }
    }
};
