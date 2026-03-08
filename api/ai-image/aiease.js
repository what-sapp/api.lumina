const axios = require('axios');
const crypto = require('crypto');

const CONFIG = {
    BASE_URL: "https://www.aiease.ai",
    API: {
        FILTER: "/api/api/common/ai_filter_style",
        VISIT: "/api/api/user/visit",
        UPLOAD: "/api/api/id_photo/s",
        IMG2IMG: "/api/api/gen/img2img",
        TASK: "/api/api/id_photo/task-info"
    },
    SECRET: "Q@D24=oueV%]OBS8i,%eK=5I|7WU$PeE",
    HEADERS: {
        "Accept": "*/*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Content-Type": "application/json",
        "Origin": "https://www.aiease.ai",
        "Referer": "https://www.aiease.ai/",
        "User-Agent": "ScRaPe/9.9 (KaliLinux; Nusantara Os; My/Shannz)"
    }
};

module.exports = {
    name: "AIEase",
    desc: "Generate AI Filter Style dari gambar menggunakan AIEase.",
    category: "AI Image",
    params: ["image", "_filter"],
    paramsSchema: {
        image: { type: "file", label: "Image", required: true },
        _filter: {
            type: "select",
            label: "Filter Style",
            required: false,
            default: "48",
            options: [
                { label: "Cotton Dolls", value: "48" },
                { label: "RickToon",     value: "49" },
                { label: "ToothiePop",   value: "50" },
                { label: "Anime",        value: "41" },
                { label: "Cartoon 3D",   value: "42" },
                { label: "Oil Painting", value: "43" },
                { label: "Watercolor",   value: "44" },
                { label: "Sketch",       value: "45" },
                { label: "Ghibli",       value: "46" },
                { label: "Vintage",      value: "39" },
                { label: "Comic",        value: "34" },
                { label: "Cyberpunk",    value: "40" },
                { label: "Fantasy",      value: "35" },
                { label: "Portrait",     value: "38" },
                { label: "Classic",      value: "2" },
                { label: "Vivid",        value: "4" }
            ]
        }
    },

    cryptoUtils() {
        const keyHash = crypto.createHash("SHA256").update(CONFIG.SECRET).digest();
        return {
            encrypt: (payload) => {
                try {
                    const encoded = encodeURIComponent(payload);
                    const iv = crypto.randomBytes(16);
                    const cipher = crypto.createCipheriv("aes-256-cfb", keyHash, iv);
                    const encrypted = Buffer.concat([cipher.update(encoded, "utf-8"), cipher.final()]);
                    return Buffer.concat([iv, encrypted]).toString("base64");
                } catch { return null; }
            },
            decrypt: (encryptedBase64) => {
                try {
                    const buffer = Buffer.from(encryptedBase64, "base64");
                    const iv = buffer.subarray(0, 16);
                    const data = buffer.subarray(16);
                    const decipher = crypto.createDecipheriv("aes-256-cfb", keyHash, iv);
                    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
                    return decodeURIComponent(decrypted.toString("utf-8"));
                } catch { return null; }
            }
        };
    },

    async run(req, res) {
        const file     = req.file;
        const filterId = parseInt(req.query.filter) || 43;

        if (!file) return res.status(400).json({ status: false, error: "File image diperlukan." });

        try {
            const utils       = this.cryptoUtils();
            const imageBuffer = file.buffer;

            // Get session token
            const visitRes = await axios.post(CONFIG.BASE_URL + CONFIG.API.VISIT, {}, { headers: CONFIG.HEADERS });
            const token    = visitRes.data?.result?.user?.token;
            if (!token) throw new Error('Gagal mendapatkan token sesi.');

            const authHeaders = { ...CONFIG.HEADERS, "Authorization": `JWT ${token}` };

            // Get upload slot
            const uploadPayload = {
                length: imageBuffer.length,
                filetype: "image/jpeg",
                filename: `${crypto.randomBytes(5).toString("hex")}_syn.jpeg`
            };
            const sig           = utils.encrypt(JSON.stringify(uploadPayload));
            const uploadSlotRes = await axios.post(
                CONFIG.BASE_URL + CONFIG.API.UPLOAD,
                JSON.stringify({ t: sig }),
                { headers: authHeaders, params: { time: crypto.randomUUID() } }
            );

            const decryptedUrl = utils.decrypt(uploadSlotRes.data.result);
            if (!decryptedUrl) throw new Error('Gagal dekripsi URL upload.');

            // Upload image
            await axios.put(decryptedUrl, imageBuffer, {
                headers: { ...CONFIG.HEADERS, "Content-Type": "image/jpeg" }
            });

            const urlObj  = new URL(decryptedUrl);
            const cleanUrl = urlObj.origin + urlObj.pathname;

            // Start generation
            const genRes = await axios.post(CONFIG.BASE_URL + CONFIG.API.IMG2IMG, {
                gen_type: "ai_filter",
                ai_filter_extra_data: { img_url: cleanUrl, style_id: filterId }
            }, { headers: authHeaders });

            const taskId = genRes.data?.result?.task_id;
            if (!taskId) throw new Error('Gagal memulai task AI.');

            // Poll result
            const MAX = 30;
            for (let i = 0; i < MAX; i++) {
                await new Promise(r => setTimeout(r, 4000));
                const taskRes = await axios.get(CONFIG.BASE_URL + CONFIG.API.TASK, {
                    headers: authHeaders,
                    params: { task_id: taskId }
                });

                const status = taskRes.data?.result?.data?.queue_info?.status;
                if (status === 'success') {
                    const resultData = taskRes.data?.result?.data;
                    return res.status(200).json({
                        status: true,
                        creator: 'Xena',
                        result: {
                            filter_id: filterId,
                            url: resultData?.img_url || resultData?.output_img_url || null,
                            raw: resultData
                        }
                    });
                }
                if (status === 'failed') throw new Error('Task AI gagal.');
            }

            throw new Error('Timeout: hasil tidak tersedia.');
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
