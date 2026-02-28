/**
 * LK21 STREAM - Fitur ke-135
 * Status: BYPASS PLAYER
 * Deskripsi: Ambil link embed streaming agar bisa nonton langsung.
 * Creator: Xena
 */

const cheerio = require('cheerio');

async function getStreamLK21(url) {
    const html = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)...' }
    }).then(r => r.text());
    
    const $ = cheerio.load(html);
    const streams = [];

    // Taktik 1: Cari di Iframe Player Utama
    $('iframe').each((_, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('embed') || src.includes('player'))) {
            streams.push({
                provider: 'Primary Player',
                link: src.startsWith('//') ? 'https:' + src : src
            });
        }
    });

    // Taktik 2: Cari di tombol pilihan server (kalau ada)
    $('.download-service tr').each((_, el) => {
        const name = $(el).find('strong').text().trim();
        const link = $(el).find('a').attr('href');
        if (link && link.includes('javascript:void(0)')) {
            // Biasanya butuh klik, tapi kita ambil data-src-nya
            const dataSrc = $(el).find('a').attr('data-src');
            if (dataSrc) streams.push({ provider: name, link: dataSrc });
        }
    });

    return {
        title: $('h1').text().trim(),
        streams: streams.length ? streams : "Link streaming belum tersedia untuk film ini."
    };
}

module.exports = {
    name: "LK21Stream",
    desc: "Ambil link streaming/embed film LK21.",
    category: "TEST",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: "Link filmnya mana, Senior?" });

        try {
            const result = await getStreamLK21(url);
            res.status(200).json({
                status: true,
                creator: "Xena",
                result
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
