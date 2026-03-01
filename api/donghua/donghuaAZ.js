const axios = require('axios');

/**
 * DONGHUA A-Z LIST
 * Source: Sanka Vollerei
 * Creator: Xena
 */
module.exports = {
    name: "DonghuaAZ",
    desc: "Mendapatkan daftar Donghua berdasarkan abjad (A-Z).",
    category: "Donghua",
    params: ["letter", "page"],

    async run(req, res) {
        try {
            // Ambil parameter, default huruf 'a' dan page 1
            const { letter = 'a', page = 1 } = req.query;
            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            // Request ke endpoint A-Z Sanka
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/az-list/${letter.toLowerCase()}/${page}`, {
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            if (!data || !data.donghua_list || data.donghua_list.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Xena",
                    error: `Data Donghua dengan huruf '${letter}' di halaman ${page} tidak ditemukan.`
                });
            }

            // Response rapi gaya Senior Xena
            res.status(200).json({
                status: true,
                creator: "Xena",
                filter: {
                    letter: letter.toUpperCase(),
                    page: parseInt(page)
                },
                result: data.donghua_list
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Xena",
                error: error.message
            });
        }
    }
};

