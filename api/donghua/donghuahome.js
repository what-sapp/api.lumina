const axios = require('axios');

/**
 * DONGHUA HOME (Latest & Completed)
 * Source: Sanka Vollerei
 * Params: _page (Optional)
 */
module.exports = {
    name: "Donghua Home",
    desc: "Mendapatkan daftar update Donghua terbaru dan Donghua yang sudah tamat",
    category: "Donghua",
    params: ["_page"],
    async run(req, res) {
        try {
            const { _page = 1 } = req.query;
            console.log(`Fetching Donghua Home - Page: ${_page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/home/${_page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json'
                }
            });

            if (!data.status === "success") {
                throw new Error("Gagal mengambil data Donghua.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    latest: data.latest_release,
                    completed: data.completed_donghua
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
