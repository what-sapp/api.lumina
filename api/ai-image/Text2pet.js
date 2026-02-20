const axios = require('axios');

/**
 * TEXT2PET PLUGIN
 * Fitur: Text-to-Image & Text-to-Video
 * Bypass Auth: Caesar Cipher Decryption
 */
module.exports = {
    name: "Text2Pet AI",
    desc: "Generate Gambar atau Video AI menggunakan prompt (High Speed)",
    category: "AI IMAGE",
    params: ["prompt", "type"], // type: image atau video
    async run(req, res) {
        try {
            const { prompt, type = 'image' } = req.query;

            if (!prompt) {
                return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi!' });
            }

            // --- Decryption Engine ---
            const decryptToken = () => {
                const cipher = 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW';
                const shift = 3;
                return [...cipher].map(c => {
                    if (/[a-z]/.test(c)) return String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97);
                    if (/[A-Z]/.test(c)) return String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65);
                    return c;
                }).join('');
            };

            const headers = {
                'user-agent': 'AgungDevX FreeScrape/1.0.0',
                'content-type': 'application/json',
                'authorization': decryptToken()
            };

            const baseUrl = 'https://text2pet.zdex.top';

            // --- Logic Image ---
            if (type === 'image') {
                const response = await axios.post(`${baseUrl}/images`, { prompt }, { headers });
                if (response.data.code !== 0) throw new Error("Image Generation Failed");

                return res.status(200).json({
                    status: true,
                    creator: "shannz",
                    type: "image",
                    result: response.data.data
                });
            }

            // --- Logic Video ---
            if (type === 'video') {
                const deviceID = Math.random().toString(16).substring(2, 18);
                const start = await axios.post(`${baseUrl}/videos`, {
                    deviceID, isPremium: 1, prompt, used: [], versionCode: 6
                }, { headers });

                if (start.data.code !== 0) throw new Error("Video Job Failed");
                const key = start.data.key;

                // Polling Video
                let resultUrl = null;
                for (let i = 0; i < 30; i++) {
                    await new Promise(r => setTimeout(r, 3000));
                    const check = await axios.post(`${baseUrl}/videos/batch`, { keys: [key] }, { headers });
                    if (check.data.code === 0 && check.data.datas?.[0]?.url) {
                        resultUrl = check.data.datas[0].url.trim();
                        break;
                    }
                }

                if (!resultUrl) throw new Error("Video Generation Timeout");

                return res.status(200).json({
                    status: true,
                    creator: "shannz",
                    type: "video",
                    result: resultUrl
                });
            }

        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    }
};
