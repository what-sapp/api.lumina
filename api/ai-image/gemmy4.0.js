const axios = require('axios');
const crypto = require('crypto');

/**
 * GEMMY IMAGEN 4.0 API MODULE
 * Creator: Xena
 * Updated: March 2026
 */

const CONFIG = {
    URL: "https://firebasevertexai.googleapis.com/v1beta/projects/gemmy-ai-bdc03/models/imagen-4.0-fast-generate-001:predict",
    HEADERS: {
        'User-Agent': 'ktor-client',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-goog-api-key': 'AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ',
        'x-goog-api-client': 'gl-kotlin/2.2.21-ai fire/17.7.0',
        'x-firebase-appid': '1:652803432695:android:c4341db6033e62814f33f2',
        'x-firebase-appversion': '91',
        'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==',
        'x-android-package': 'com.jetkite.gemmy',
        'x-android-cert': '037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2'
    }
};

/**
 * Upload buffer ke Cloud Sky
 */
const uploadToCloud = async (buffer) => {
    try {
        const filename = `gemmy-${crypto.randomUUID()}.png`;
        const { data } = await axios.post('https://api.cloudsky.biz.id/get-upload-url', {
            fileKey: filename,
            contentType: 'image/png',
            fileSize: buffer.length
        });

        await axios.put(data.uploadUrl, buffer, {
            headers: { 
                'Content-Type': 'image/png', 
                'Content-Length': buffer.length,
                'x-amz-server-side-encryption': 'AES256'
            }
        });

        return `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
    } catch (error) {
        return null;
    }
};

module.exports = {
    name: "GemmyImage",
    desc: "Generate AI Image menggunakan Imagen 4.0 Fast.",
    category: "Image",
    params: ["prompt", "aspectRatio"],

    async run(req, res) {
        try {
            const prompt = req.query.prompt || req.body.prompt;
            const aspectRatio = req.query.aspectRatio || req.body.aspectRatio || "1:1";

            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    creator: "Xena",
                    error: "Parameter prompt wajib diisi!"
                });
            }

            const payload = {
                instances: [
                    { prompt: prompt }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: aspectRatio,
                    safetySetting: "block_low_and_above",
                    personGeneration: "allow_adult",
                    imageOutputOptions: {
                        mimeType: "image/jpeg",
                        compressionQuality: 100
                    }
                }
            };

            const response = await axios.post(CONFIG.URL, payload, {
                headers: CONFIG.HEADERS,
                timeout: 30000 // Beri waktu lebih lama untuk proses generate
            });

            const predictions = response.data.predictions;
            
            if (predictions && predictions.length > 0 && predictions[0].bytesBase64Encoded) {
                const imgBuffer = Buffer.from(predictions[0].bytesBase64Encoded, 'base64');
                
                // Proses upload ke cloud
                const url = await uploadToCloud(imgBuffer);
                
                if (url) {
                    return res.status(200).json({
                        status: true,
                        statusCode: 200,
                        creator: "Xena",
                        result: {
                            prompt: prompt,
                            aspectRatio: aspectRatio,
                            url: url,
                            model: "Imagen 4.0 Fast"
                        }
                    });
                } else {
                    return res.status(500).json({
                        status: false,
                        creator: "Xena",
                        error: "Berhasil generate tapi gagal upload ke CloudSky."
                    });
                }
            }

            // Jika respons kosong tanpa error (biasanya karena Safety Filter)
            res.status(403).json({
                status: false,
                creator: "Xena",
                error: "Permintaan ditolak. Prompt mungkin melanggar kebijakan keamanan Google (Safety Filter)."
            });

        } catch (error) {
            // Logging detail error agar Xena bisa debug di console Vercel/Terminal
            const errorData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "Xena",
                error: "Gagal memproses gambar dari server.",
                log: errorData // Menampilkan detail error asli dari Google
            });
        }
    }
};
