const axios = require('axios');

/**
 * ROLEPLAY AI (SPICYCHAT ENGINE)
 * Fix: Direct Content Response
 */
module.exports = {
    name: "Roleplay AI",
    desc: "Chatting dengan AI Roleplay kepribadian kuat (Fixed Output).",
    category: "AI CHAT",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            const characterId = "03613fb4-766d-4872-8e83-bd21c8e5a895";

            if (!message) return res.status(400).json({ status: false, error: "Tanya apa aja ke bot-nya, Mang!" });

            const response = await axios.post('https://prod.nd-api.com/chat', {
                "character_id": characterId,
                "conversation_id": `gienetic_chat_${Date.now()}`, // Pake timestamp biar unik
                "message": message,
                "autopilot": false,
                "continue_chat": false,
                "inference_model": "default",
                "inference_settings": {
                    "max_new_tokens": 250,
                    "temperature": 0.7,
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

            // Ambil kontennya aja biar user gak pusing baca JSON tumpuk
            const aiReply = response.data.message.content;

            res.status(200).json({
                status: true,
                //creator: "shannz x Xena",
                result: aiReply
            });

        } catch (error) {
            res.status(500).json({
                status: false,
              //  creator: "shannz",
                error: "Duh, bot-nya lagi korslet (Error di Server Spicy)!"
            });
        }
    }
};
