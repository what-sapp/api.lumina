const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const CONFIG = {
    URLS: {
        CHAT: 'https://deepseekv2-qbvg2hl3qq-uc.a.run.app',
        KEY: 'https://rotatingkey-qbvg2hl3qq-uc.a.run.app'
    },
    HEADERS: {
        'User-Agent': 'okhttp/4.12.0',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json'
    },
    AES_INPUT_KEY: "NiIsImtpZCI6I56"
};

async function getSecretKey() {
    try {
        const response = await axios.get(CONFIG.URLS.KEY, {
            headers: { 'User-Agent': 'Android', 'Accept-Encoding': 'gzip' }
        });
        return response.data?.rotatingKey || null;
    } catch (error) {
        return null;
    }
}

function generateSecurityHeaders(secretKey) {
    try {
        const iv = crypto.randomBytes(16);
        const ivBase64 = iv.toString('base64');
        const keyBuffer = Buffer.from(secretKey, 'utf8');
        
        const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, iv);
        let encrypted = cipher.update(CONFIG.AES_INPUT_KEY, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return {
            iv: ivBase64 + '\n',
            authorization: "Bearer " + encrypted.toString('base64')
        };
    } catch (error) {
        return null;
    }
}

const toBase64 = async (input) => {
    try {
        let buffer;
        if (Buffer.isBuffer(input)) buffer = input;
        else if (input.startsWith('http')) {
            const res = await axios.get(input, { responseType: 'arraybuffer' });
            buffer = Buffer.from(res.data);
        } else if (fs.existsSync(input)) {
            buffer = fs.readFileSync(input);
        } else return null;
        return buffer.toString('base64');
    } catch (e) { return null; }
};

const handleDeepseekChat = async (prompt, options = {}) => {
    try {
        const {
            image = null,
            history = [],
            model = 'deepseek-chat'
        } = options;

        const secretKey = await getSecretKey();
        if (!secretKey) return { success: false, msg: 'Failed to fetch secret key' };

        const security = generateSecurityHeaders(secretKey);
        if (!security) return { success: false, msg: 'Failed to generate security headers' };

        let finalModel = model;
        let base64Image = null;
        let payloadMessages = [];

        // ── Handle Image (Vision Mode) ──
        if (image) {
            const rawBase64 = await toBase64(image);
            if (!rawBase64) {
                return { success: false, msg: 'Failed to process image' };
            }
            base64Image = `data:image/jpeg;base64,${rawBase64}`;
            finalModel = 'gpt-4o-mini';
        } else {
            // ── Handle Text Chat with History ──
            let messages = [...history];
            const currentMessage = { role: "user", content: prompt };
            payloadMessages = [...messages, currentMessage];
        }

        const dataPayload = {
            data: prompt,
            iv: security.iv,
            messages: payloadMessages,
            model: finalModel,
            secretKey: secretKey
        };

        if (base64Image) {
            dataPayload.image1 = base64Image;
        }

        const response = await axios.post(CONFIG.URLS.CHAT, dataPayload, {
            headers: { ...CONFIG.HEADERS, 'authorization': security.authorization }
        });

        const apiResult = response.data?.data;

        if (apiResult && apiResult.choices && apiResult.choices.length > 0) {
            const messageObj = apiResult.choices[0].message;
            const replyText = messageObj.content || "";
            const reasoningText = messageObj.reasoning_content || null;
            
            let newHistory = [];
            if (!image) {
                // Update history hanya untuk mode text
                const currentMessage = { role: "user", content: prompt };
                const messages = [...history, currentMessage];
                newHistory = [...messages, { role: "assistant", content: replyText }];
            }

            return {
                success: true,
                reply: replyText,
                reasoning: reasoningText,
                history: newHistory,
                modelUsed: finalModel,
                usage: apiResult.usage,
                hasImage: !!image
            };
        }

        return { success: false, msg: 'Empty response choices' };

    } catch (error) {
        console.error(`[Deepseek Error]: ${error.message}`);
        return { success: false, msg: error.message };
    }
};

module.exports = {
    name: "Deepseek AI",
    desc: "Deepseek AI Chat & Vision - Support text, history, reasoning, dan image analysis",
    category: "AI",
    params: ["prompt", "_image", "_model", "_history"],
    async run(req, res) {
        try {
            const prompt = req.query.prompt;
            const image = req.query.image || null;
            const model = req.query.model || 'deepseek-chat';
            const historyParam = req.query.history;

            // ── Validasi ──
            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "prompt" diperlukan'
                });
            }

            // ── Parse History jika ada ──
            let history = [];
            if (historyParam) {
                try {
                    history = JSON.parse(historyParam);
                    if (!Array.isArray(history)) {
                        return res.status(400).json({
                            status: false,
                            error: 'Parameter "history" harus berupa array JSON'
                        });
                    }
                } catch (e) {
                    return res.status(400).json({
                        status: false,
                        error: 'Format history tidak valid. Harus JSON array'
                    });
                }
            }

            // ── Validasi Model ──
            const validModels = ['deepseek-chat', 'deepseek-reasoner', 'gpt-4o-mini'];
            if (!validModels.includes(model)) {
                return res.status(400).json({
                    status: false,
                    error: `Model tidak valid. Pilih: ${validModels.join(', ')}`
                });
            }

            // ── Jika ada image, otomatis gunakan model vision ──
            const finalModel = image ? 'gpt-4o-mini' : model;

            // ── Handle Deepseek Chat ──
            const result = await handleDeepseekChat(prompt, {
                image,
                history,
                model: finalModel
            });

            if (!result.success) {
                return res.status(500).json({ status: false, error: result.msg });
            }

            // ── Return ──
            const responseData = {
                reply: result.reply,
                modelUsed: result.modelUsed,
                usage: result.usage,
                hasImage: result.hasImage
            };

            // Tambahkan reasoning jika ada
            if (result.reasoning) {
                responseData.reasoning = result.reasoning;
            }

            // Tambahkan history jika mode text (bukan image)
            if (!image && result.history) {
                responseData.history = result.history;
            }

            res.status(200).json({
                status: true,
                data: responseData
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
