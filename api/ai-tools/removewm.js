const axios = require('axios');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Remove Watermark",
    desc: "Menghapus watermark atau objek pengganggu pada gambar secara otomatis",
    category: "AI TOOLS",
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

            console.log(`Removing watermark for: ${url}`);
            
            // Fetch dari API Snowping
            const { data } = await axios.get(`https://api.snowping.my.id/api/tools/removewm`, {
                params: { url }
            });

            if (data.status !== 200) {
                throw new Error("Gagal memproses penghapusan watermark dari server pusat.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    id: data.result.id,
                    input_url: data.result.input,
                    // Kita ambil index pertama dari array output
                    output_url: data.result.output[0] 
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
