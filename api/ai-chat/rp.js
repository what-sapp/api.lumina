const axios = require('axios');

/**
 * ROLEPLAY AI (SPICYCHAT ENGINE)
 * Feature: Under-score Optional Model (_model)
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Roleplay AI Pro",
    desc: "AI Roleplay High-Class. Gunakan parameter '_model' untuk ganti engine (Opsional).",
    category: "AI Magic",
    params: ["message", "_model"], // _model diawali underscore agar terlihat sebagai opsi tambahan
    async run(req, res) {
        try {
            const { message, _model } = req.query;
            
            // Mapping ID Model Internal SpicyChat
            const modelMap = {
                'fantasi': 'squelching_fantasies_8b',
                'spiced': 'spicedq3_a3b',
                'stheno': 'stheno-8b',
                'default': 'default'
            };

            // LOGIC: Jika _model kosong atau tidak valid, otomatis lari ke 'default'
            const selectedModel = modelMap[_model?.toLowerCase()] || 'default';

            if (!message) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Pesan belum diisi, Senior! (Contoh: ?message=halo&_model=spiced)" 
                });
            }

            console.log(`RP Mode: Active | Engine: ${selectedModel}`);

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
                    "character_id": "03613fb4-766d-4872-8e83-bd21c8e5a895",
                    "conversation_id": `gen_session_${Date.now()}`,
                    "message": message,
                    "autopilot": false,
                    "continue_chat": false,
                    "inference_model": selectedModel, 
                    "inference_settings": {
                        "max_new_tokens": 250,
                        "temperature": 0.7,
                        "top_p": 0.7,
                        "top_k": 90
                    },
                    "language": "id"
                }
            });

            // Proteksi pengambilan data content
            const aiReply = response.data.message ? response.data.message.content : "AI tidak memberikan respon.";

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                engine_active: selectedModel,
                result: aiReply
            });

        } catch (error) {
            console.error('SpicyChat Error Detail:', error.response ? error.response.data : error.message);
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: "Duh, bot-nya lagi ngambek atau IP server kena limit!"
            });
        }
    }
};
