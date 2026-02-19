const axios = require('axios');

/**
 * CONFIGURATION
 */
const LINER_CONFIG = {
    host: "getliner.com",
    user_agent: "Gienetic_sniff/4.11.0"
};

const getHeaders = (cookie = null) => {
    const headers = {
        "user-agent": LINER_CONFIG.user_agent,
        "x-liner-platform-type": "app",
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json; charset=utf-8",
        "host": LINER_CONFIG.host,
    };
    if (cookie) headers["cookie"] = cookie;
    return headers;
};

/**
 * CORE LOGIC: Liner AI DeepSearch
 */
const linerAI = {
    // Tahap 1: Ambil Session & Cookie
    getIdentity: async () => {
        try {
            const resp = await axios.post(`https://${LINER_CONFIG.host}/auth/guest`, {}, { 
                headers: getHeaders() 
            });
            const rawCookie = resp.headers['set-cookie'];
            const cookie = rawCookie ? rawCookie.map(c => c.split(';')[0]).join('; ') : "";
            return { uid: resp.data.id, cookie };
        } catch (e) { return null; }
    },

    // Tahap 2: Cari atau Buat Folder (Space)
    getSpaceId: async (idty) => {
        try {
            const resp = await axios.get(`https://${LINER_CONFIG.host}/v1/spaces?page=1&limit=5`, {
                headers: getHeaders(idty.cookie)
            });
            if (resp.data.items?.[0]) return resp.data.items[0].id;
            
            // Kalau belum ada, buat baru
            const create = await axios.post(`https://${LINER_CONFIG.host}/v1/space`, 
                { "name": "General", "color": "#50555C", "icon": "folder" },
                { headers: getHeaders(idty.cookie) }
            );
            return create.data.id;
        } catch (e) { return null; }
    },

    // Tahap 3: Eksekusi Pencarian
    search: async (query) => {
        try {
            const idty = await linerAI.getIdentity();
            if (!idty) throw new Error("Gagal mendapatkan identitas tamu");

            const spaceId = await linerAI.getSpaceId(idty);
            if (!spaceId) throw new Error("Gagal mendapatkan Space ID");

            // Buat Thread
            const threadPayload = {
                "userId": idty.uid,
                "messagePieces": [{ "type": "text", "content": { "text": query } }],
                "mode": "general",
                "deviceType": "android"
            };
            const thread = await axios.post(`https://${LINER_CONFIG.host}/v1/space/${spaceId}/thread`, 
                threadPayload, { headers: getHeaders(idty.cookie) }
            );

            const { id: threadId, messageId: userMessageId } = thread.data;

            // Ambil Jawaban (Stream Parsing)
            const askPayload = {
                "spaceId": spaceId,
                "threadId": threadId, 
                "userMessageId": userMessageId,
                "userId": idty.uid,
                "query": query,
                "agentId": "researcher",
                "platform": "app",
                "modelType": "liner-pro",
                "mode": "general"
            };

            const stream = await axios.post(`https://${LINER_CONFIG.host}/platform/copilot/v3/answer`, 
                askPayload, { headers: getHeaders(idty.cookie), responseType: 'stream' }
            );

            return new Promise((resolve, reject) => {
                let fullAnswer = "";
                let buffer = "";

                stream.data.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); 

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const json = JSON.parse(line);
                                if (json.answer) fullAnswer += json.answer;
                            } catch (e) {}
                        }
                    }
                });

                stream.data.on('end', () => resolve(fullAnswer));
                stream.data.on('error', (err) => reject(err));
            });
        } catch (e) {
            throw e;
        }
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "AI DeepSearch",
    desc: "Pencarian AI mendalam berbasis Liner AI",
    category: "AI",
    params: ["query"],
    async run(req, res) {
        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "query" wajib diisi!'
                });
            }

            console.log(`DeepSearching for: ${query}`);
            const result = await linerAI.search(query);

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    query: query,
                    answer: result
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
