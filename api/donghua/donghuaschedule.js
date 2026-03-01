const axios = require('axios');

/**
 * DONGHUA SCHEDULE
 * Source: Sanka Vollerei
 * Creator: Xena
 */
module.exports = {
    name: "DonghuaSchedule",
    desc: "Mendapatkan jadwal rilis Donghua mingguan.",
    category: "Donghua",
    params: ["day"], // Optional: Saturday, Sunday, Monday, etc.

    async run(req, res) {
        try {
            const { day } = req.query;
            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/schedule`, {
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            if (!data || !data.schedule) {
                return res.status(404).json({
                    status: false,
                    creator: "Xena",
                    error: "Gagal mengambil jadwal rilis."
                });
            }

            let result = data.schedule;

            // Jika Senior masukin param hari, kita filter biar nggak kepanjangan
            if (day) {
                const filtered = data.schedule.find(s => s.day.toLowerCase() === day.toLowerCase());
                if (filtered) {
                    result = filtered;
                } else {
                    return res.status(400).json({
                        status: false,
                        creator: "Xena",
                        error: "Hari tidak valid. Gunakan: Monday, Tuesday, etc."
                    });
                }
            }

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result
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

