const axios = require('axios');

/**
 * ROLEPLAY AI (CASTORICE BY KURO_709)
 * Stability: High (98.0k Chats)
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Castorice AI",
    desc: "Chatting dengan Castorice (Kuro Version). Gunakan parameter '_model' untuk ganti engine.",
    category: "AI CHAT",
    params: ["message", "_model"],
    async run(req, res) {
        try {
            const { message, _model } = req.query;
            
            const modelMap = {
                'fantasi': 'squelching_fantasies_8b',
                'spiced': 'spicedq3_a3b',
                'stheno': 'stheno-8b',
                'default': 'default'
            };

            const selectedModel = modelMap[_model?.toLowerCase()] || 'default';

            if (!message) return res.status(400).json({ status: false, error: "Tanya sesuatu ke Castorice, Senior!" });

            const response = await axios({
                method: 'post',
                url: 'https://prod.nd-api.com/chat',
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
                    "character_id": "f8d2b168-3655-45a1-a6bc-39a29019e56f", // ID Castorice Kuro
                    "conversation_id": "gid_860fc707-ff9b-4644-910f-bd69cadc8146", // Session ID Kuro
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
                character: "Castorice (Kuro)",
                engine: selectedModel,
                result: resultData
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: "Castorice lagi istirahat, coba lagi nanti!"
            });
        }
    }
};
