const axios = require('axios');

/**
 * ROLEPLAY AI (UNIVERSAL ENGINE)
 * Feature: Optional Model (_model) & Optional Character (_id)
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Roleplay AI",
    desc: "AI Roleplay bebas pilih karakter. Masukkan Character ID dari URL SpicyChat.ai ke parameter '_id'.",
    category: "AI CHAT",
    params: ["message", "_model", "_id"],
    async run(req, res) {
        try {
            const { message, _model, _id } = req.query;
            
            // Mapping ID Model Internal SpicyChat
            const modelMap = {
                'fantasi': 'squelching_fantasies_8b',
                'spiced': 'spicedq3_a3b',
                'stheno': 'stheno-8b',
                'default': 'default'
            };

            const selectedModel = modelMap[_model?.toLowerCase()] || 'default';

            // Logic Character ID Opsional:
            // Jika user isi _id, pakai itu. Jika kosong, otomatis ke Castorice (Kuro).
            const selectedCharacter = _id || "f8d2b168-3655-45a1-a6bc-39a29019e56f";

            if (!message) return res.status(400).json({ status: false, error: "Isi pesan dulu!" });

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
                    "character_id": selectedCharacter,
                    "conversation_id": `gid_gen_${selectedCharacter.slice(0, 8)}`, // Sesi dinamis biar gak bentrok
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
                character_id: selectedCharacter,
                engine: selectedModel,
                result: resultData
            });

        } catch (error) {
            console.error('SpicyChat Error Detail:', error.response ? error.response.data : error.message);
            res.status(500).json({
                status: false,
                error: "Duh, bot-nya lagi korslet atau ID Karakter tidak valid!"
            });
        }
    }
};
