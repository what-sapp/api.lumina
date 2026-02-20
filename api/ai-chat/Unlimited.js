const axios = require('axios');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Unlimited AI (Reasoning)",
    desc: "AI Chat dengan kemampuan penalaran tinggi tanpa batas",
    category: "AI CHAT",
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;
            const chatId = "e6d80bed-6b42-4ea0-a5ac-01d4e9175ee1"; // Default Session
            
            if (!q) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "q" (pertanyaan) wajib diisi!'
                });
            }

            console.log(`Unlimited AI asking: ${q}`);

            const url = `https://app.unlimitedai.chat/chat/${chatId}`;
            const requestData = [{
                chatId: chatId,
                messages: [{
                    id: "025cd08e-4445-4dfc-ac8b-27117973cb71",
                    role: "user",
                    content: q,
                    parts: [{ type: "text", text: q }],
                    createdAt: `$D${new Date().toISOString()}`
                }, {
                    id: "50585339-372e-4785-8a60-c3148c68838e",
                    role: "assistant",
                    content: "",
                    parts: [{ type: "text", text: "" }],
                    createdAt: `$D${new Date().toISOString()}`
                }],
                selectedChatModel: "chat-model-reasoning",
                selectedCharacter: null,
                selectedStory: null
            }];

            const headers = {
                'Accept': 'text/x-component',
                'Next-Action': '40713570958bf1accf30e8d3ddb17e7948e6c379fa',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)'
            };

            const response = await axios.post(url, requestData, { headers });
            
            // Parsing Logic untuk format text/x-component
            let responseText = '';
            const lines = response.data.toString().split('\n');
            
            for (const line of lines) {
                if (line.includes('"diff"')) {
                    try {
                        const jsonStr = line.substring(line.indexOf('{'));
                        const data = JSON.parse(jsonStr);
                        if (data.diff && data.diff[1]) {
                            responseText += data.diff[1];
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            if (!responseText) throw new Error("Gagal mendapatkan respon dari AI.");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    question: q,
                    answer: responseText.trim()
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
