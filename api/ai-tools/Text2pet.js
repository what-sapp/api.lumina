const axios = require('axios');

module.exports = {
    name: "Text2Pet Video",
    desc: "Generate video pendek dari teks menggunakan AI (High Quality)",
    category: "AI TOOLS",
    params: ["prompt"],
    async run(req, res) {
        try {
            const { prompt } = req.query;
            if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi!' });

            // Decrypt Token Logic
            const decrypt = () => {
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
                'authorization': decrypt(),
                'content-type': 'application/json'
            };

            // 1. Create Video Job
            const { data: job } = await axios.post('https://text2pet.zdex.top/videos', {
                deviceID: Math.random().toString(16).substring(2, 18),
                isPremium: 1,
                prompt,
                used: [],
                versionCode: 6
            }, { headers });

            if (job.code !== 0 || !job.key) throw new Error("Gagal membuat antrean video");

            // 2. Polling Status (Maksimal 2 menit)
            let videoUrl = null;
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 3000)); // Tunggu 3 detik per cek
                const { data: check } = await axios.post('https://text2pet.zdex.top/videos/batch', 
                    { keys: [job.key] }, 
                    { headers }
                );

                if (check.code === 0 && check.datas?.[0]?.url) {
                    videoUrl = check.datas[0].url.trim();
                    break;
                }
            }

            if (!videoUrl) throw new Error("Video generation timeout (Terlalu lama)");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    prompt: prompt,
                    url: videoUrl
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
