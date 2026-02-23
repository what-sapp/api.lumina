const axios = require('axios');

module.exports = {
    name: "Roleplay AI2",
    desc: "AI Roleplay kepribadian kuat (Fixed Connection).",
    category: "AI Magic",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            if (!message) return res.status(400).json({ status: false, error: "Isi pesan dulu!" });

            // Pake config yang persis sama dengan test Termux kamu
            const response = await axios({
                method: 'post',
                url: 'https://prod.nd-api.com/chat',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json, text/plain, */*',
                    'origin': 'https://spicychat.ai',
                    'referer': 'https://spicychat.ai/', // Tambahin Referer biar dikira dari web resmi
                    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
                    'x-app-id': 'spicychat',
                    'x-guest-userid': '946a71dd-4cf4-424c-8870-4ad494be461c'
                },
                data: {
                    "character_id": "03613fb4-766d-4872-8e83-bd21c8e5a895",
                    "conversation_id": "gid_2c7b780e-ec8b-45b6-99ee-b1bae36713b7", // Samain ID konversinya
                    "message": message,
                    "autopilot": false,
                    "continue_chat": false,
                    "inference_model": "default",
                    "inference_settings": {
                        "max_new_tokens": 180,
                        "temperature": 0.7,
                        "top_p": 0.7,
                        "top_k": 90
                    },
                    "language": "en"
                }
            });

            // Proteksi kalau structure response-nya beda
            const resultData = response.data.message ? response.data.message.content : response.data;

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                result: resultData
            });

        } catch (error) {
            // Log detail error biar kita tau dia kena 403 (Block) atau 400 (Bad Request)
            console.error('SpicyChat Error Detail:', error.response ? error.response.data : error.message);
            
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: "Duh, bot-nya lagi korslet atau IP Server diblokir SpicyChat!"
            });
        }
    }
};
