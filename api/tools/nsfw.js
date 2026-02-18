const axios = require('axios');
const FormData = require('form-data');

/**
 * HELPER: Mendownload gambar dari URL menjadi Buffer
 */
const getBuffer = async (url) => {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`Buffer Error: ${error.message}`);
        return null;
    }
};

/**
 * CORE LOGIC: NSFW Check via Nyckel
 */
const checkNSFWStatus = async (imageUrl) => {
    try {
        // 1. Ambil Buffer gambar
        const buffer = await getBuffer(imageUrl);
        if (!buffer || buffer.length < 50) throw new Error("Gambar kosong atau rusak saat di-download");

        // 2. Siapkan Form Data
        const form = new FormData();
        form.append("file", buffer, {
            filename: `check_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        });

        // 3. Tembak API Nyckel
        console.log(`Checking NSFW status for: ${imageUrl}`);
        const { data } = await axios.post(
            "https://www.nyckel.com/v1/functions/o2f0jzcdyut2qxhu/invoke",
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Accept': 'application/json, text/plain, */*'
                },
                timeout: 45000
            }
        );

        if (!data) throw new Error("API Nyckel tidak memberikan respon");

        return {
            success: true,
            label: data.labelName, // Biasanya 'SFW' atau 'NSFW'
            confidence: (data.confidence * 100).toFixed(2) + '%',
            id: data.labelId,
            raw: data
        };

    } catch (error) {
        return { 
            success: false, 
            msg: error.message 
        };
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "NSFW Checker",
    desc: "Cek apakah sebuah gambar mengandung konten dewasa (NSFW)",
    category: "Tools",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            // Validasi input
            if (!url) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" (link gambar) wajib diisi!'
                });
            }

            if (!/^https?:\/\/.+/i.test(url)) {
                return res.status(400).json({
                    status: false,
                    error: 'Format URL tidak valid!'
                });
            }

            const result = await checkNSFWStatus(url);

            if (!result.success) {
                return res.status(500).json({ 
                    status: false, 
                    error: result.msg 
                });
            }

            // Response Akhir
            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    is_nsfw: result.label.toLowerCase() === 'nsfw',
                    status_label: result.label,
                    confidence_score: result.confidence,
                    original_data: result.raw
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
