const axios = require('axios');

/**
 * DONGHUA ONGOING LIST
 * Source: Sanka Vollerei
 * Params: _page (Optional)
 */
module.exports = {
    name: "Donghua Ongoing",
    desc: "Mendapatkan daftar series Donghua yang masih berstatus Ongoing",
    category: "Donghua",
    params: ["_page"],
    async run(req, res) {
        try {
            const { _page = 1 } = req.query;
            console.log(`Fetching Donghua Ongoing - Page: ${_page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/ongoing/${_page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json'
                }
            });

            if (!data.ongoing_donghua) {
                throw new Error("Gagal mengambil data ongoing Donghua.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.ongoing_donghua
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
