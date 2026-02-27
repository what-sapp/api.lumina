/**
 * HITOMI READER - Fitur ke-130
 * Status: PURE IMAGE SCRAPER
 * Deskripsi: Sedot semua link gambar dari satu ID Hitomi.
 * Creator: Xena
 */

async function readHitomi(id) {
    const CDN = "zrocdn.xyz";
    
    // 1. Ambil info media_id & jumlah halaman
    const res = await fetch(`https://hitomi.moe/reader/info/${id}`, {
        headers: { "referer": "https://hitomi.moe/" }
    }).then(r => r.json());

    if (!res.media_id) throw new Error("ID tidak ditemukan atau Media ID kosong.");

    // 2. Generate semua link gambar berdasarkan jumlah halaman
    const pages = [];
    for (let i = 1; i <= res.num_pages; i++) {
        pages.push(`https://${CDN}/galleries/${res.media_id}/${i}.webp`);
    }

    return {
        id: id,
        title: res.title_en || res.title,
        total_pages: res.num_pages,
        images: pages
    };
}

module.exports = {
    name: "HitomiRead",
    desc: "Ambil semua link gambar dari ID Hitomi.",
    category: "TEST",
    params: ["id"],

    async run(req, res) {
        const { id } = req.query;
        if (!id) return res.status(400).json({ status: false, creator: "Xena", error: "Masukkan ID Gallery!" });

        try {
            const result = await readHitomi(id);
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
