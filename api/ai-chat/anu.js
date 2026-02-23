const axios = require('axios');

/**
 * TITAN MASTER AI (DEEPAI MULTI-MODEL)
 * Feature: 13 Advanced Models Focus
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Titan AI",
    desc: "Titan Ultimate List (13 Models). Gunakan '_model' (1-13) untuk memilih engine.",
    category: "AI Magic",
    params: ["message", "_model"],
    async run(req, res) {
        try {
            const { message, _model } = req.query;

            if (!message) return res.status(400).json({ status: false, error: "Tanya apa hari ini, Senior?" });

            // 1. Setup Default (Model 5 - Qwen 3)
            let selectedModel = 'qwen3-30b-a3b';
            let currentUuid = '7b05cd41-1a46-4b75-ad62-042a5f226c76';

            // 2. Mapping Model & UUID Sync
            const modelList = {
                '1': 'standard', '2': 'deepseek-v3.2', '3': 'gemini-2.5-flash-lite',
                '4': 'online', '5': 'qwen3-30b-a3b', '6': 'llama-4-scout',
                '7': 'gemma2-9b-it', '8': 'llama-3.1-8b-instant', '9': 'llama-3.3-70b-instruct',
                '10': 'gpt-5-nano', '11': 'gemma-3-12b-it', '12': 'gpt-oss-120b', '13': 'gpt-4.1-nano'
            };

            // Logic penentuan UUID berdasarkan pilihan model
            if (_model === '7') {
                selectedModel = modelList['7'];
                currentUuid = 'cbeeb9b3-1687-4bfd-8e14-434f1e8be6';
            } else if (['8','9','10','11','12','13'].includes(_model)) {
                selectedModel = modelList[_model];
                currentUuid = '33693cfb-3399-46d8-ad73-956af59da4'; // UUID khusus model terbaru
            } else if (modelList[_model]) {
                selectedModel = modelList[_model];
            }

            // 3. Request ke DeepAI (Hacking is a serious crime endpoint)
            const formData = new URLSearchParams();
            formData.append('chat_style', 'chat');
            formData.append('chatHistory', JSON.stringify([{ role: "user", content: message }]));
            formData.append('model', selectedModel);
            formData.append('session_uuid', currentUuid);
            formData.append('hacker_is_stinky', 'very_stinky');

            const response = await axios.post('https://api.deepai.org/hacking_is_a_serious_crime', formData, {
                headers: {
                    'api-key': 'tryit-30025425476-8e927d7fe1753ca3829f69519862e6fc',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                    'referer': 'https://deepai.org/chat',
                    'content-type': 'application/x-www-form-urlencoded'
                }
            });

            res.status(200).json({
                status: true,
                character: "Titan Engine",
                model_name: selectedModel,
                result: response.data
            });

        } catch (error) {
            console.error('Titan Error:', error.message);
            res.status(500).json({ 
                status: false, 
                error: "Titan Engine sedang maintenance atau API Key limit!" 
            });
        }
    }
};
