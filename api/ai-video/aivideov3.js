const axios = require('axios');

module.exports = {
    name: "AI Video Generator V3",
    desc: "Generate video AI versi terbaru (V3) dengan durasi lebih stabil",
    category: "AI VIDEO",
    params: ["prompt"],
    async run(req, res) {
        try {
            const { prompt } = req.query;
            if (!prompt) return res.status(400).json({ status: false, error: 'Promptna tong kosong!' });

            const decrypt = () => {
                const cipher = 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW';
                const shift = 3;
                return [...cipher].map(c =>
                    /[a-z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97) :
                    /[A-Z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65) : c
                ).join('');
            };

            const token = decrypt();
            const headers = { 'user-agent': 'AgungDevX Coder/1.0.0', 'authorization': token };

            // Step 1: Request Key
            const { data: job } = await axios.post('https://text2video.aritek.app/txt2videov3', {
                deviceID: Math.random().toString(16).slice(2, 18),
                isPremium: 1,
                prompt,
                used: [],
                versionCode: 59
            }, { headers: { ...headers, 'content-type': 'application/json' } });

            if (job.code !== 0 || !job.key) throw new Error("Gagal meunangkeun antrian video.");

            // Step 2: Polling
            let videoUrl = null;
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 3000));
                const { data: check } = await axios.post('https://text2video.aritek.app/video', { keys: [job.key] }, { headers });
                if (check.datas?.[0]?.url) {
                    videoUrl = check.datas[0].url.trim();
                    break;
                }
            }

            if (!videoUrl) throw new Error("Video generation timeout.");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: { prompt, url: videoUrl }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
