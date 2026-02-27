/**
 * CAPCUT DL BYPASS - Fitur ke-130
 * Status: SAKTI (With cf_clearance Cookie)
 * Deskripsi: Bypass Cloudflare 3bic buat ambil direct link CapCut.
 * Creator: Xena
 */

// Simpan Cookie di luar biar gampang Senior ganti kalau expired
const CAPCUT_CONFIG = {
    COOKIE: 'cf_clearance=Houk7BPC9pVNJrJ.JScb0RTDOmMpeuWZiSuM6uo9NKM-1772221148-1.2.1.1-eXHv7OlZEb_LKj7gbxhnm4.tVdnQy7TkZNS2b6C1aqjDE.ICHSfjoQ4pOlDvASslIaFfbnzgf6sy4UKEVJsIF6OtAAtixiLaBsvdNUWad29u3olrCEs9awdgGaTrPS6f.9xk7xoY6c7n1Krb4.Kpvp16bh6KGM37iJXpfw3T3HHJC85IlXBVVzYoa30OdL0BEZi9vz7rf8C.GxP4Y3DzR3tLbwryQncKe7TK3bnB0Q4'
};

async function downloadCapCutSakti(url) {
    const res = await fetch('https://3bic.com/api/download', {
        method: 'POST',
        headers: {
            'authority': '3bic.com',
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'origin': 'https://3bic.com',
            'referer': 'https://3bic.com/id',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
            'cookie': CAPCUT_CONFIG.COOKIE
        },
        body: JSON.stringify({ url })
    }).then(r => r.json());

    if (res.code !== 200) throw new Error("Cookie Expired atau Server Capek.");

    // Decode Base64
    const base64Data = res.originalVideoUrl.split('/api/cdn/')[1];
    const directUrl = Buffer.from(base64Data, 'base64').toString('utf-8');

    return {
        title: res.title,
        author: res.authorName,
        video: directUrl,
        thumbnail: res.coverUrl
    };
}

module.exports = {
    name: "CapCutSakti",
    desc: "Download CapCut via 3bic Bypass Cloudflare. [Params: url]",
    category: "TEST",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: "Link-nya mana Senior?" });

        try {
            const result = await downloadCapCutSakti(url);
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                creator: "Xena", 
                error: "Cloudflare terdeteksi, Senior Xena harus ganti Cookie cf_clearance!" 
            });
        }
    }
};
