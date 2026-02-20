const axios = require('axios');

module.exports = {
    name: "Text2Pet Image",
    desc: "Generate gambar AI berkualitas tinggi berdasarkan prompt teks",
    category: "AI IMAGE",
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

            const { data } = await axios.post('https://text2pet.zdex.top/images', 
                { prompt }, 
                { 
                    headers: { 
                        'user-agent': 'AgungDevX FreeScrape/1.0.0',
                        'authorization': decrypt(),
                        'content-type': 'application/json'
                    } 
                }
            );

            if (data.code !== 0) throw new Error("Gagal generate gambar");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    prompt: prompt,
                    url: data.data
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
