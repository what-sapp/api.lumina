const axios = require('axios');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Sidompul XL/AXIS Check",
    desc: "Mengecek informasi kartu, paket, dan masa aktif nomor XL/AXIS",
    category: "TOOLS",
    params: ["number"],
    async run(req, res) {
        try {
            const { number } = req.query;

            if (!number) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "number" (Nomor XL/AXIS) wajib diisi!'
                });
            }

            console.log(`Checking Sidompul for: ${number}`);

            const { data } = await axios.get('https://bendith.my.id/end.php', {
                params: {
                    check: 'package',
                    number: number,
                    version: 2
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)'
                }
            });

            if (!data.success) {
                return res.status(400).json({
                    status: false,
                    message: data.message || "Nomor tidak terdaftar atau server sedang sibuk."
                });
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.data
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
