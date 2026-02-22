const axios = require('axios');

/**
 * DONGHUA COMPLETED LIST
 * Source: Sanka Vollerei
 * Params: _page (Optional)
 */
module.exports = {
    name: "Donghua Completed",
    desc: "Mendapatkan daftar Donghua yang sudah tamat/selesai masa tayangnya",
    category: "Donghua",
    params: ["_page"],
    async run(req, res) {
        try {
            const { _page = 1 } = req.query;
            console.log(`Fetching Donghua Completed - Page: ${_page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/completed/${_page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json'
                }
            });

            if (!data.completed_donghua) {
                throw new Error("Gagal mengambil data completed Donghua.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.completed_donghua
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
