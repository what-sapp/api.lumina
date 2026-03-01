/**
 * XIAOHONGSHU (XHS) DL - Fitur ke-131
 * Status: BYPASS (Next.js Server Action)
 * Deskripsi: Download video dari Xiaohongshu tanpa watermark.
 * Creator: Shannz x Xena
 */

async function xhsDownloader(xhsUrl) {
    const res = await fetch('https://rednotedownloader.com/id', {
        method: 'POST',
        headers: {
            'accept': 'text/x-component',
            'content-type': 'text/plain;charset=UTF-8',
            'next-action': '352bef296627adedcfc99e32c80dd93a4ee49d35',
            'referer': 'https://rednotedownloader.com/id',
            'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36...'
        },
        body: JSON.stringify([xhsUrl, ""])
    }).then(r => r.text());

    // Parsing format aneh Next.js (Cari baris yang diawali '1:')
    const lines = res.split('\n');
    const jsonLine = lines.find(line => line.startsWith('1:'));
    if (!jsonLine) throw new Error("Gagal bedah data server Xiaohongshu.");

    const data = JSON.parse(jsonLine.substring(2));
    
    // Taktik Decode URL: Ambil string Base64 setelah 'url='
    const media = data.medias[0];
    const base64Part = media.url.split('url=')[1].split('&')[0];
    const directUrl = Buffer.from(decodeURIComponent(base64Part), 'base64').toString('utf-8');

    return {
        title: data.title,
        author: data.author,
        thumbnail: data.thumbnail,
        video: directUrl
    };
}

module.exports = {
    name: "Xiaohongshu",
    desc: "Download video Xiaohongshu (XHS) via RedNoteDownloader.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, creator: "Xena", error: "Link XHS-nya mana?" });

        try {
            const result = await xhsDownloader(url);
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
