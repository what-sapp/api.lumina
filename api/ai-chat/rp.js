const axios = require('axios');

/**
 * ROLEPLAY AI (SPICYCHAT ENGINE)
 * Creator: Xena (Integrated to Gienetic)
 * Character: FIXED NO-LIMIT CHARACTER
 */
module.exports = {
    name: "Roleplay AI",
    desc: "AI Roleplay dengan kepribadian mendalam (Fixed No-Limit Character).",
    category: "AI CHAT",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            
            // FIXED ID (No Limit Jalur Langit)
            const characterId = "03613fb4-766d-4872-8e83-bd21c8e5a895";

            if (!message) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Kasih pesan buat lawan bicaramu, Senior! Masukkan parameter 'message'." 
                });
            }

            console.log(`RP AI Chatting: Character No-Limit Active`);

            const response = await axios.post('https://prod.nd-api.com/chat', {
                "character_id": characterId,
                "conversation_id": `gienetic_rp_${Math.random().toString(36).substring(7)}`,
                "message": message,
                "autopilot": false,
                "continue_chat": false,
                "inference_model": "default",
                "inference_settings": {
                    "max_new_tokens": 300, // Kita panjangin biar puas balesannya
                    "temperature": 0.8,
                    "top_p": 0.7,
                    "top_k": 90
                },
                "language": "id"
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json, text/plain, */*',
                    'origin': 'https://spicychat.ai',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                    'x-app-id': 'spicychat',
                    'x-guest-userid': '946a71dd-4cf4-424c-8870-4ad494be461c'
                }
            });

            // Langsung ambil response teksnya biar gak ribet
            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                result: response.data
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: "Duh, karakternya lagi istirahat atau koneksi SpicyChat sibuk!"
            });
        }
    }
};
