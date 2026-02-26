/**
 * PIXELCUT NOBG - Fitur ke-115
 * Status: ULTIMATE (Direct API)
 * Deskripsi: Hapus background gambar secara instan dengan hasil sangat rapi.
 * Creator: Xena
 */

async function removeBgPixelcut(imageUrl) {
    // 1. Download gambar dari URL
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Gagal mendownload gambar dari URL.');
    const arrayBuffer = await response.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const fileName = `xena_nobg_${Date.now()}.jpg`;

    // 2. Siapkan FormData (Bypass Client Version)
    const form = new FormData();
    form.append('image', new Blob([buf], { type: 'image/jpeg' }), fileName);
    form.append('format', 'png');
    form.append('model', 'v1');

    // 3. Tembak API Pixelcut
    const res = await fetch('https://api2.pixelcut.app/image/matte/v1', {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36...',
            'Accept': 'application/json, text/plain, */*',
            'x-client-version': 'web:pixa.com:4a5b0af2', // Key bypass
            'origin': 'https://www.pixa.com',
            'referer': 'https://www.pixa.com/'
        },
        body: form
    });

    if (!res.ok) throw new Error('Pixelcut API menolak request, Senior.');

    // 4. Return sebagai Buffer
    return Buffer.from(await res.arrayBuffer());
}

module.exports = {
    name: "RemoveBG",
    desc: "Hapus background gambar otomatis pakai Pixelcut Engine.",
    category: "AI TOOLS",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, creator: "Xena", error: "Link fotonya mana?" });

        try {
            const resultBuffer = await removeBgPixelcut(url);
            
            // Set header agar browser/bot ngebaca ini sebagai file gambar
            res.set("Content-Type", "image/png");
            res.status(200).send(resultBuffer);

        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: err.message });
        }
    }
};

