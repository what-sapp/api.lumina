const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const CONFIG = {
    BASE_ENDPOINT: "https://dydkrpmnafsnivjxmipj.supabase.co",
    SECRET_KEY: "sb_publishable_W_1Ofv9769iYEEn9dfyAHQ_OhuCER6g",
    PATHS: {
        SIGNUP: "/auth/v1/signup",
        REFRESH: "/auth/v1/token",
        EDIT: "/functions/v1/edit-image",
        GENERATE: "/functions/v1/generate-image"
    },
    HEADERS: {
        "User-Agent": "Dart/3.9 (dart:io)",
        "Accept-Encoding": "gzip",
        "x-supabase-client-platform": "android",
        "x-client-info": "supabase-flutter/2.10.3",
        "x-supabase-client-platform-version": "15 A15.0.2.0.VGWIDXM",
        "Content-Type": "application/json; charset=utf-8",
        "x-supabase-api-version": "2024-01-01"
    }
};

let SESSION = {
    access_token: null,
    refresh_token: null,
    expires_at: 0
};

const uploadToCloud = async (buffer, ext = '.png') => {
    try {
        const filename = `flux-${crypto.randomUUID()}${ext}`;
        const contentType = 'image/png';
        const fileSize = buffer.length;

        const { data } = await axios.post('https://api.cloudsky.biz.id/get-upload-url', {
            fileKey: filename,
            contentType: contentType,
            fileSize: fileSize
        });

        await axios.put(data.uploadUrl, buffer, {
            headers: { 
                'Content-Type': contentType, 
                'Content-Length': fileSize,
                'x-amz-server-side-encryption': 'AES256' 
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        return `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
    } catch (error) {
        console.error(`[Upload Cloud Error]: ${error.message}`);
        return null;
    }
};

const toBase64 = async (input) => {
    try {
        let buffer;
        if (Buffer.isBuffer(input)) {
            buffer = input;
        } else if (typeof input === 'string' && input.startsWith('http')) {
            const response = await axios.get(input, { responseType: 'arraybuffer' });
            buffer = Buffer.from(response.data);
        } else if (fs.existsSync(input)) {
            buffer = fs.readFileSync(input);
        } else {
            return null;
        }
        return buffer.toString('base64');
    } catch (e) { return null; }
};

const handleAuth = async () => {
    try {
        if (SESSION.access_token) {
            // Cek jika token masih valid (lebih dari 1 jam dari sekarang)
            const isExpired = Date.now() >= SESSION.expires_at;
            if (!isExpired) {
                return SESSION.access_token;
            }
        }

        const payload = { data: {}, gotrue_meta_security: { captcha_token: null } };
        const headers = { 
            ...CONFIG.HEADERS, 
            "apikey": CONFIG.SECRET_KEY, 
            "Authorization": `Bearer ${CONFIG.SECRET_KEY}` 
        };
        
        const response = await axios.post(CONFIG.BASE_ENDPOINT + CONFIG.PATHS.SIGNUP, payload, { headers });

        if (response.data?.access_token) {
            SESSION.access_token = response.data.access_token;
            SESSION.refresh_token = response.data.refresh_token;
            // Set expiry 1 jam dari sekarang
            SESSION.expires_at = Date.now() + (60 * 60 * 1000);
            return SESSION.access_token;
        }
        return null;
    } catch (error) {
        console.error("Auth Error:", error.message);
        return null;
    }
};

const handleImageEdit = async (imageInput, prompt) => {
    try {
        const token = await handleAuth();
        if (!token) return { success: false, msg: 'Authentication failed' };

        const base64Image = await toBase64(imageInput);
        if (!base64Image) return { success: false, msg: 'Invalid input image' };

        const payload = {
            image: base64Image,
            mimeType: "image/png",
            prompt: prompt,
            model: "auto",
            isFirstAttempt: true
        };

        const headers = { 
            ...CONFIG.HEADERS, 
            "apikey": CONFIG.SECRET_KEY, 
            "Authorization": `Bearer ${token}` 
        };

        const response = await axios.post(CONFIG.BASE_ENDPOINT + CONFIG.PATHS.EDIT, payload, { headers });
        
        if (response.data && response.data.image) {
            const resultBuffer = Buffer.from(response.data.image, 'base64');
            const cloudUrl = await uploadToCloud(resultBuffer);
            
            if (!cloudUrl) return { success: false, msg: 'Failed to upload image to cloud' };

            return {
                success: true,
                prompt: response.data.prompt || prompt,
                model: response.data.model || "auto",
                url: cloudUrl,
                type: "edit"
            };
        }
        return { success: false, msg: 'No image data returned from API' };

    } catch (error) {
        console.error(`[Edit Image Error]: ${error.message}`);
        return { success: false, msg: error.message };
    }
};

const handleImageGenerate = async (prompt, model = "fal-ai/flux-2") => {
    try {
        const token = await handleAuth();
        if (!token) return { success: false, msg: 'Authentication failed' };

        const payload = { 
            prompt: prompt, 
            model: model 
        };
        
        const headers = { 
            ...CONFIG.HEADERS, 
            "apikey": CONFIG.SECRET_KEY, 
            "Authorization": `Bearer ${token}` 
        };
        
        const response = await axios.post(CONFIG.BASE_ENDPOINT + CONFIG.PATHS.GENERATE, payload, { headers });

        if (response.data && response.data.image) {
            const resultBuffer = Buffer.from(response.data.image, 'base64');
            const cloudUrl = await uploadToCloud(resultBuffer);

            if (!cloudUrl) return { success: false, msg: 'Failed to upload image to cloud' };

            return {
                success: true,
                prompt: response.data.prompt || prompt,
                model: response.data.model || model,
                url: cloudUrl,
                type: "generate"
            };
        }
        return { success: false, msg: 'No image data returned from API' };

    } catch (error) {
        console.error(`[Generate Image Error]: ${error.message}`);
        return { success: false, msg: error.message };
    }
};

module.exports = {
    name: "Flux AI",
    desc: "AI Image Editing & Generation - Edit existing images or generate new ones",
    category: "AI-IMAGE",
    params: ["action", "prompt", "_image", "_model"],
    async run(req, res) {
        try {
            const action = req.query.action;
            const prompt = req.query.prompt;
            const image = req.query.image;
            const model = req.query.model || "fal-ai/flux-2";

            // ── Validasi ──
            if (!action) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "action" diperlukan. Pilih: "edit" atau "generate"'
                });
            }

            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "prompt" diperlukan'
                });
            }

            if (!["edit", "generate"].includes(action)) {
                return res.status(400).json({
                    status: false,
                    error: 'Action tidak valid. Pilih: "edit" atau "generate"'
                });
            }

            if (action === "edit" && !image) {
                return res.status(400).json({
                    status: false,
                    error: 'Untuk action "edit", parameter "image" diperlukan (URL atau path file)'
                });
            }

            // ── Handle Action ──
            let result;
            if (action === "edit") {
                result = await handleImageEdit(image, prompt);
            } else {
                result = await handleImageGenerate(prompt, model);
            }

            if (!result.success) {
                return res.status(500).json({ 
                    status: false, 
                    error: result.msg 
                });
            }

            // ── Return ──
            res.status(200).json({
                status: true,
                data: result
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
