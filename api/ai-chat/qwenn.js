const crypto = require("crypto");

module.exports = {
    name: "QwenChat",
    desc: "Chat dengan Qwen AI dari APK resmi.",
    category: "AI Tools",
    params: ["prompt", "model"],

    BASE_URL: "https://chat.qwen.ai/api/v2",
    HEADERS: {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; 25028RN03A Build/AP3A.240905.015.A2) AliApp(QWENCHAT/1.16.1) AppType/Release AplusBridgeLite",
        "Connection": "Keep-Alive",
        "Accept": "application/json",
        "X-Platform": "android",
        "source": "app",
        "Accept-Language": "en-US",
        "Accept-Charset": "UTF-8"
    },

    MODELS: [
        "qwen3.5-flash",
        "qwen3.5-397b-a17b",
        "qwen3.5-122b-a10b",
        "qwen3.5-27b",
        "qwen3.5-35b-a3b",
        "qwen3-max-2026-01-23",
        "qwen-plus-2025-07-28",
        "qwen3-coder-plus",
        "qwen3-vl-plus",
        "qwen3-omni-flash-2025-12-01",
        "qwen-max-latest",
        "qwen3.5-plus"
    ],

    // Credentials — ganti jika expired
    CREDS: {
        email: "robinvschina@email.com",
        password: "ROBIN12345"
    },
    TOKEN: null,

    genUUID() { return crypto.randomUUID(); },

    authHeaders(token) {
        return { ...this.HEADERS, "Authorization": `Bearer ${token}`, "x-request-id": this.genUUID() };
    },

    async login() {
        const hashed = crypto.createHash("sha256").update(this.CREDS.password).digest("hex");
        const res = await fetch(`${this.BASE_URL}/auths/signin`, {
            method: "POST",
            headers: { ...this.HEADERS, "x-request-id": this.genUUID(), "content-type": "application/json" },
            body: JSON.stringify({ email: this.CREDS.email, password: hashed })
        });
        const data = await res.json();
        if (!data.success) throw new Error("Login failed");
        this.TOKEN = data.data.token;
        return this.TOKEN;
    },

    async createSession(token) {
        const res = await fetch(`${this.BASE_URL}/chats/new`, {
            method: "POST",
            headers: { ...this.authHeaders(token), "content-type": "application/json" },
            body: JSON.stringify({ chat_mode: "normal", project_id: "" })
        });
        const data = await res.json();
        if (!data.success) throw new Error("Failed to create session");
        return data.data.id;
    },

    async deleteSession(token, chatId) {
        await fetch(`${this.BASE_URL}/chats/${chatId}`, {
            method: "DELETE",
            headers: this.authHeaders(token)
        });
    },

    async chat(token, chatId, prompt, model) {
        const res = await fetch(`${this.BASE_URL}/chat/completions?chat_id=${chatId}`, {
            method: "POST",
            headers: {
                ...this.authHeaders(token),
                "Accept": "*/*,text/event-stream",
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({
                stream: true,
                incremental_output: true,
                chat_id: chatId,
                chat_mode: "normal",
                model,
                messages: [{
                    chat_type: "t2t",
                    content: prompt,
                    role: "user",
                    feature_config: {
                        output_schema: "phase",
                        thinking_enabled: false,
                        thinking_format: "summary",
                        auto_thinking: false,
                        auto_search: false
                    },
                    timestamp: Math.floor(Date.now() / 1000),
                    sub_chat_type: "t2t",
                    models: [model],
                    fid: this.genUUID(),
                    user_action: "chat",
                    extra: { meta: { subChatType: "t2t" } }
                }],
                timestamp: Math.floor(Date.now() / 1000),
                share_id: "",
                origin_branch_message_id: ""
            })
        });

        // Parse SSE
        const text = await res.text();
        let fullText = "";
        for (const line of text.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
                const parsed = JSON.parse(line.substring(5).trim());
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.phase === "answer" && delta.content) fullText += delta.content;
            } catch (e) {}
        }
        return fullText.trim() || "No response";
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        const model = req.query.model || "qwen3.5-plus";
        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });
        if (!this.MODELS.includes(model)) return res.status(400).json({ status: false, error: `Model tidak valid. Pilihan: ${this.MODELS.join(", ")}` });

        try {
            const token = this.TOKEN || await this.login();
            const chatId = await this.createSession(token);
            const response = await this.chat(token, chatId, prompt, model);
            await this.deleteSession(token, chatId);

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: { model, response }
            });
        } catch (e) {
            // Coba re-login jika token expired
            if (e.message.includes("auth") || e.message.includes("token")) {
                try {
                    const token = await this.login();
                    const chatId = await this.createSession(token);
                    const response = await this.chat(token, chatId, prompt, model);
                    await this.deleteSession(token, chatId);
                    return res.status(200).json({
                        status: true,
                        creator: "Xena",
                        result: { model, response }
                    });
                } catch (e2) {
                    return res.status(500).json({ status: false, error: e2.message });
                }
            }
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
