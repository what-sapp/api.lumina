const axios = require('axios');

module.exports = {
    name: "Castorice AI",
    desc: "Chatting dengan Castorice. Gunakan parameter '_model' untuk engine & '_session' untuk ID unik.",
    category: "AI CHAT",
    params: ["message", "_model", "_session"],
    async run(req, res) {
        try {
            const { message, _model, _session } = req.query;
            
            const modelMap = {
                'fantasi': 'squelching_fantasies_8b',
                'spiced': 'spicedq3_a3b',
                'stheno': 'stheno-8b',
                'default': 'default'
            };

            const selectedModel = modelMap[_model?.toLowerCase()] || 'default';

            // LOGIC: Kita buat format ID-nya persis kayak aslinya (UUID style)
            // Kalau user gak ngasih _session, kita pake ID default yang udah terbukti work.
            let sessionID = "gid_126f5d14-de31-4956-83c0-9449a617f8bf";
            if (_session) {
                // Generate ID simpel tapi aman (tanpa karakter aneh)
                sessionID = `gid_${Buffer.from(_session).toString('hex').slice(0, 32)}`;
            }

            if (!message) return res.status(400).json({ status: false, error: "Tanya sesuatu ke Castorice!" });

            const response = await axios({
                method: 'post',
                url: 'https://prod.nd-api.com/chat',
                timeout: 15000, // Tambahin timeout biar gak gantung
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json, text/plain, */*',
                    'origin': 'https://spicychat.ai',
                    'referer': 'https://spicychat.ai/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
                    'x-app-id': 'spicychat',
                    'x-guest-userid': '946a71dd-4cf4-424c-8870-4ad494be461c'
                },
                data: {
                    "character_id": "d9564784-8dcc-451e-bd4c-5961ec319520",
                    "conversation_id": sessionID,
                    "message": message,
                    "autopilot": false,
                    "continue_chat": false,
                    "inference_model": selectedModel,
                    "inference_settings": {
                        "max_new_tokens": 180,
                        "temperature": 0.7,
                        "top_p": 0.7,
                        "top_k": 90
                    },
                    "language": "en"
                }
            });

            const resultData = response.data.message ? response.data.message.content : response.data;

            res.status(200).json({
                status: true,
                character: "Castorice",
                session_id: sessionID,
                engine: selectedModel,
                result: resultData
            });

        } catch (error) {
            // Biar di log server keliatan salahnya apa (403/400/500)
            console.error('ERROR_SPICY:', error.response ? error.response.status : error.message);
            
            res.status(500).json({
                status: false,
                error: "Duh, bot-nya lagi korslet atau IP Server diblokir SpicyChat!"
            });
        }
    }
};
