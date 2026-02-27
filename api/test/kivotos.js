/**
 * KIVOTOS AI - Fitur ke-125
 * Status: ACTIVE (NSFW Supported)
 * Deskripsi: Generate gambar anime uncensored dengan support tag karakter.
 * Creator: Xena
 */

async function generateKivotos(prompt) {
    const baseUrl = "https://beta.ftr.pp.ua/api/ai/kivotos";
    const url = `${baseUrl}?prompt=${encodeURIComponent(prompt)}`;

    // Kita cek dulu apakah API-nya ngasih JSON atau langsung Image Buffer
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal generate gambar, mungkin prompt dilarang atau server down.");

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        const json = await response.json();
        return json.result || json.url; // Jika return-nya link
    } else {
        // Jika return-nya langsung gambar (Binary)
        return await response.arrayBuffer();
    }
}

module.exports = {
    name: "Kivotos",
    desc: "AI Image Generator NSFW. Support char tag (Contoh: shiroko, loli, bikini).",
    category: "TEST",
    params: ["prompt"],

    async run(req, res) {
        const { prompt } = req.query;

        if (!prompt) return res.status(400).json({ 
            status: false, 
            creator: "Xena", 
            error: "Masukkan prompt! Contoh: prompt=blue archive, shiroko, naked" 
        });

        try {
            const result = await generateKivotos(prompt);

            if (Buffer.isBuffer(Buffer.from(result))) {
                // Jika hasil berupa buffer gambar, kirim sebagai image
                res.set("Content-Type", "image/png");
                return res.send(Buffer.from(result));
            }

            // Jika hasil berupa link
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result
            });

        } catch (err) {
            res.status(500).json({ 
                status: false, 
                creator: "Xena", 
                error: err.message 
            });
        }
    }
};
