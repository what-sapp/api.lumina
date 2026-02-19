const axios = require('axios');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Remove Background V2",
    desc: "Menghapus background gambar (Alternatif High Speed)",
    category: "AI TOOLS", // Kategori Baru!
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !/^https?:\/\/.+/i.test(url)) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" (link gambar) wajib diisi!'
                });
            }

            console.log(`Removing background (V2) for: ${url}`);
            
            // Fetch dari API Snowping
            const { data } = await axios.get(`https://api.snowping.my.id/api/tools/removebg`, {
                params: { url }
            });

            if (data.status !== 200) {
                throw new Error("Server Snowping gagal memproses gambar.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    output_url: data.result.url
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
