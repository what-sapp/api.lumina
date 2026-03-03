const axios = require('axios');
const crypto = require('crypto');

/**
 * GEMMY IMAGEN 4.0 API MODULE
 * Creator: Xena
 */
const CONFIG = {
    URL: "https://firebasevertexai.googleapis.com/v1beta/projects/gemmy-ai-bdc03/models/imagen-4.0-fast-generate-001:predict",
    HEADERS: {
        'User-Agent': 'ktor-client',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-goog-api-key': 'AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ', // API Key Firebase Imagen
        'x-goog-api-client': 'gl-kotlin/2.2.21-ai fire/17.7.0',
        'x-firebase-appid': '1:652803432695:android:c4341db6033e62814f33f2',
        'x-firebase-appversion': '91',
        'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=='
    }
};

/**
 * Upload buffer ke Cloud Sky (Sesuai wrapper aslimu)
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
                'Content-Length': buffer.length
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
            const { prompt, aspectRatio = "1:1" } = req.query;

            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    creator: "Xena",
                    error: "Parameter prompt wajib diisi!"
                });
            }

            const payload = {
                instances: [{ prompt: prompt }],
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
                headers: CONFIG.HEADERS
            });

            const predictions = response.data.predictions;
            if (predictions && predictions.length > 0 && predictions[0].bytesBase64Encoded) {
                const imgBuffer = Buffer.from(predictions[0].bytesBase64Encoded, 'base64');
                
                // Proses upload agar user dapet link, bukan base64 panjang
                const url = await uploadToCloud(imgBuffer);
                
                if (url) {
                    return res.status(200).json({
                        status: true,
                        creator: "Xena",
                        result: {
                            prompt: prompt,
                            aspectRatio: aspectRatio,
                            url: url
                        }
                    });
                }
            }

            throw new Error('Gagal memproses gambar dari server.');

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Xena",
                error: error.message
            });
        }
    }
};
