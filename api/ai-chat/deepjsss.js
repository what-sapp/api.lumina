const crypto = require("crypto");
const https = require("https");
const vm = require("vm");

module.exports = {
    name: "DeepSeekChat",
    desc: "Chat dengan DeepSeek AI dari APK resmi.",
    category: "AI CHAT",
    //path: "/ai/deepseek",
   // method: "GET",
    params: ["prompt", "_system"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        _system: { type: "text", label: "System Prompt (opsional)", required: false }
    },

    BASE_URL: "https://chat.deepseek.com/api/v0",
    HEADERS: {
        "User-Agent": "DeepSeek/1.6.4 Android/35",
        "Accept": "application/json",
        "x-client-platform": "android",
        "x-client-version": "1.6.4",
        "x-client-locale": "id",
        "x-client-bundle-id": "com.deepseek.chat",
        "x-rangers-id": "7392079989945982465",
        "accept-charset": "UTF-8"
    },

    CREDS: { email: "robinvschina@gmail.com", password: "ROBIN12345" },
    TOKEN: null,
    workerCache: null,
    wasmCache: null,

    WORKER_URL: "https://static.deepseek.com/chat/static/33614.25c7f8f220.js",
    WASM_URL: "https://static.deepseek.com/chat/static/sha3_wasm_bg.7b9ca65ddd.wasm",

    download(url) {
        return new Promise((resolve, reject) => {
            https.get(url, res => {
                const data = [];
                res.on("data", c => data.push(c));
                res.on("end", () => resolve(Buffer.concat(data)));
                res.on("error", reject);
            }).on("error", reject);
        });
    },

    async loadAssets() {
        if (!this.workerCache) this.workerCache = (await this.download(this.WORKER_URL)).toString();
        if (!this.wasmCache) this.wasmCache = await this.download(this.WASM_URL);
        return { workerScript: this.workerCache, wasmBuffer: this.wasmCache };
    },

    generateFinalToken(payload, answer) {
        return Buffer.from(JSON.stringify({
            algorithm: payload.algorithm, challenge: payload.challenge,
            salt: payload.salt, answer, signature: payload.signature,
            target_path: payload.target_path
        })).toString("base64");
    },

    async solvePow(payload) {
        const cleanPayload = {
            algorithm: payload.algorithm, challenge: payload.challenge,
            salt: payload.salt, difficulty: payload.difficulty,
            signature: payload.signature, expireAt: payload.expire_at || payload.expireAt
        };
        const { workerScript, wasmBuffer } = await this.loadAssets();
        const self = this;

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error("PoW timeout")), 60000);

            class MockResponse {
                constructor(buffer) {
                    this._buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
                    this.ok = true; this.status = 200;
                    this.headers = { get: () => "application/wasm" };
                }
                async arrayBuffer() { return this._buf.buffer.slice(this._buf.byteOffset, this._buf.byteOffset + this._buf.byteLength); }
                async bytes() { return new Uint8Array(this._buf); }
            }

            const patchedWebAssembly = {
                ...WebAssembly,
                instantiateStreaming: async (source, imports) => {
                    const resp = await source;
                    const buf = typeof resp.arrayBuffer === "function" ? await resp.arrayBuffer() : resp;
                    return WebAssembly.instantiate(buf, imports);
                }
            };

            const sandbox = {
                console: { log: () => {} },
                setTimeout, clearTimeout, setInterval, clearInterval,
                TextEncoder, TextDecoder, URL,
                Response: MockResponse,
                location: { href: self.WORKER_URL, origin: "https://static.deepseek.com", pathname: "/chat/static/33614.25c7f8f220.js", toString: () => self.WORKER_URL },
                WebAssembly: patchedWebAssembly,
                fetch: async (input) => {
                    if (input.toString().includes("wasm")) return new MockResponse(wasmBuffer);
                    throw new Error("Blocked");
                },
                postMessage: (msg) => {
                    if (msg?.type === "pow-answer") { clearTimeout(timeoutId); resolve(self.generateFinalToken(payload, msg.answer.answer)); }
                    else if (msg?.type === "pow-error") { clearTimeout(timeoutId); reject(new Error("POW error")); }
                }
            };
            sandbox.self = sandbox; sandbox.window = sandbox; sandbox.globalThis = sandbox;

            const context = vm.createContext(sandbox);
            try {
                vm.runInContext(workerScript, context);
                setTimeout(() => {
                    if (sandbox.onmessage) sandbox.onmessage({ data: { type: "pow-challenge", challenge: cleanPayload } });
                    else if (sandbox.self?.onmessage) sandbox.self.onmessage({ data: { type: "pow-challenge", challenge: cleanPayload } });
                    else reject(new Error("No onmessage handler"));
                }, 1000);
            } catch (e) { clearTimeout(timeoutId); reject(e); }
        });
    },

    async getPowToken(token, targetPath) {
        const res = await fetch(`${this.BASE_URL}/chat/create_pow_challenge`, {
            method: "POST",
            headers: { ...this.HEADERS, "Authorization": `Bearer ${token}`, "content-type": "application/json" },
            body: JSON.stringify({ target_path: targetPath })
        });
        const data = await res.json();
        return await this.solvePow(data.data.biz_data.challenge);
    },

    generateDeviceId() {
        const base = "BUelgEoBdkHyhwE8q/4YOodITQ1Ef99t7Y5KAR4CyHwdApr+lf4LJ+QAKXEUJ2lLtPQ+mmFtt6MpbWxpRmnWITA==";
        let chars = base.split("");
        const c62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 3; i++) chars[Math.floor(Math.random() * 20) + 50] = c62[Math.floor(Math.random() * c62.length)];
        return chars.join("");
    },

    async login() {
        const res = await fetch(`${this.BASE_URL}/users/login`, {
            method: "POST",
            headers: { ...this.HEADERS, "content-type": "application/json" },
            body: JSON.stringify({ email: this.CREDS.email, password: this.CREDS.password, device_id: this.generateDeviceId(), os: "android" })
        });
        const data = await res.json();
        if (data.code !== 0) throw new Error("Login failed: " + data.msg);
        this.TOKEN = data.data.biz_data.user.token;
        return this.TOKEN;
    },

    parseSSE(text) {
        const events = [];
        let cur = { event: "message", data: "" };
        for (const line of text.split("\n")) {
            if (line.startsWith("event:")) { if (cur.data) events.push({ ...cur }); cur = { event: line.substring(6).trim(), data: "" }; }
            else if (line.startsWith("data:")) cur.data += line.substring(5).trim();
            else if (line === "" && cur.data) { events.push({ ...cur }); cur = { event: "message", data: "" }; }
        }
        if (cur.data) events.push(cur);
        return events;
    },

    extractText(obj) {
        if (obj.content && typeof obj.content === "string") return obj.content;
        if (Array.isArray(obj.v)) return obj.v.map(o => this.extractText(o)).join("");
        if (typeof obj.v === "string" && (!obj.p || obj.p.endsWith("content"))) return obj.v;
        return "";
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        const system = req.query.system || null;

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const token = this.TOKEN || await this.login();

            // Create session
            const sessRes = await fetch(`${this.BASE_URL}/chat_session/create`, {
                method: "POST",
                headers: { ...this.HEADERS, "Authorization": `Bearer ${token}`, "content-type": "application/json" },
                body: JSON.stringify({})
            });
            const sessData = await sessRes.json();
            const sessionId = sessData.data.biz_data.id;

            // Get PoW
            const powToken = await this.getPowToken(token, "/api/v0/chat/completion");

            // Build chat body
            const chatBody = {
                chat_session_id: sessionId,
                parent_message_id: null,
                prompt,
                ref_file_ids: [],
                thinking_enabled: false,
                search_enabled: false,
                audio_id: null
            };

            // Inject system prompt dengan prepend ke prompt
            if (system) chatBody.prompt = `${system}\n\n${prompt}`;

            // Chat via streaming
            const chatRes = await fetch(`${this.BASE_URL}/chat/completion`, {
                method: "POST",
                headers: {
                    ...this.HEADERS,
                    "content-type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-ds-pow-response": powToken
                },
                body: JSON.stringify(chatBody)
            });

            const text = await chatRes.text();
            let fullText = "";
            for (const line of (text + "\n\n").split("\n\n")) {
                for (const event of this.parseSSE(line + "\n\n")) {
                    if (!event.data || event.event === "keep-alive") continue;
                    try {
                        const parsed = JSON.parse(event.data);
                        const t = this.extractText(parsed);
                        if (t) fullText += t;
                    } catch (e) {}
                }
            }

            // Delete session
            await fetch(`${this.BASE_URL}/chat_session/delete`, {
                method: "POST",
                headers: { ...this.HEADERS, "Authorization": `Bearer ${token}`, "content-type": "application/json" },
                body: JSON.stringify({ chat_session_id: sessionId })
            });

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: { response: fullText.trim() || "No response" }
            });
        } catch (e) {
            if (e.message.includes("Login") || e.message.includes("token")) {
                try { await this.login(); } catch (_) {}
            }
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
