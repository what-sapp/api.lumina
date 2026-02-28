/**
 * LK21 LATEST - Fitur ke-136
 * Status: MASTER (Home/Latest)
 * Deskripsi: Ambil daftar film terbaru dari halaman depan LK21.
 * Creator: Xena
 */

const cheerio = require('cheerio');

async function getHomeLK21(page = 1) {
    const base = 'https://tv3.lk21online.mom';
    const url = page > 1 ? `${base}/page/${page}` : base;
    
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
            'Referer': 'https://google.com'
        }
    });

    if (!res.ok) throw new Error(`Server LK21 lagi sibuk (HTTP ${res.status})`);
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const result = [];

    // Pakai logic extractMetadata dari kitab Senior
    $('article').each((_, el) => {
        const item = {
            title: $(el).find('[itemprop="name"]').text().trim(),
            thumbnail: $(el).find('img').attr('src'),
            rating: $(el).find('[itemprop="ratingValue"]').text().trim() || 'N/A',
            year: $(el).find('.year').text().trim(),
            quality: $(el).find('.label').first().text().trim() || 'Unknown',
            duration: $(el).find('.duration').text().trim(),
            url: base + $(el).find('a[itemprop="url"]').attr('href')
        };
        if (item.title) result.push(item);
    });

    if (!result.length) throw new Error('Gagal mengekstrak data home.');
    return result;
}

module.exports = {
    name: "LK21Latest",
    desc: "Ambil daftar film terbaru dari halaman utama LK21.",
    category: "TEST",
    params: ["page"],

    async run(req, res) {
        const { page } = req.query;
        try {
            const result = await getHomeLK21(page || 1);
            res.status(200).json({
                status: true,
                creator: "Xena",
                page: page || 1,
                count: result.length,
                result: result
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
