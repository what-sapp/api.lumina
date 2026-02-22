const axios = require('axios');

/**
 * AI DEGREE GURU (Stanford Academic Assistant)
 * Source: Siputzx API
 * Params: message (Pertanyaan)
 */
module.exports = {
    name: "DegreeGuru AI",
    desc: "AI Spesialis Akademik dan Edukasi (Stanford Base). Cocok untuk konsultasi pendidikan.",
    category: "AI CHAT",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            
            if (!message) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Mau tanya apa soal pendidikan, Senior? Isi parameter 'message'!" 
                });
            }

            console.log(`Asking DegreeGuru: ${message}`);

            const { data } = await axios.get(`https://apis-liart.vercel.app/api/degreeguru`, {
                params: { message }
            });

            if (data.status !== 200) {
                throw new Error("Gagal terhubung ke DegreeGuru.");
            }

            res.status(200).json({
                status: true,
               // creator: "shannz",
                result: data.data.response
            });

        } catch (error) {
            res.status(500).json({
                status: false,
               // creator: "shannz",
                error: error.message
            });
        }
    }
};
