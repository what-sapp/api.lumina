const axios = require('axios');
const crypto = require('crypto');

/**
 * CONFIG & HELPERS
 */
const BASE_URL = "https://aiapi.thinkyeah.com";
const HEADERS = {
    "accept": "application/json",
    "content-type": "application/json; charset=utf-8",
    "user-agent": "okhttp/4.11.0"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateIdentity = () => ({
    adid: crypto.randomUUID(),
    dcid: crypto.randomUUID(),
    is_pro_user: "false",
    region: "ID",
    language: "in",
    app_version_code: "2310",
    package_name: "photoeditor.photocut.background.eraser.collagemaker.cutout",
    firebase_user_id: crypto.randomBytes(16).toString('hex')
});

/**
 * HELPER: Download & Upload ke Cloud
 */
const downloadAndUpload = async (url) => {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data);
        const filename = `enhanced_${Date.now()}.jpg`;
        
        // Memakai API Cloudsky seperti di script TikTok kamu
        const { data: cloud } = await axios.post('https://api.cloudsky.biz.id/get-upload-url', {
            fileKey: filename,
            contentType: 'image/jpeg',
            fileSize: buffer.length
        });

        await axios.put(cloud.uploadUrl, buffer, { headers: { 'Content-Type': 'image/jpeg' } });
        return `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
    } catch (e) {
        return url; // Balikin URL asli kalau gagal upload
    }
};

/**
 * CORE LOGIC: Enhance Image
 */
const handleEnhance = async (imageUrl) => {
    try {
        const identity = generateIdentity();
        
        // 1. Convert URL to Base64
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(imgRes.data).toString('base64');

        // 2. Submit Task
        const payload = {
            "upscale": "2",
            "is_upscale": "true", 
            "model": "default",
            "imagedata": base64Data
        };

        const { data: taskRes } = await axios.post(`${BASE_URL}/api/enhance/async`, payload, {
            headers: HEADERS,
            params: { ...identity, request_id: crypto.randomUUID() }
        });

        if (taskRes?.code !== 200 || !taskRes.data.task_id) {
            throw new Error("Gagal mengirim tugas ke server AI");
        }

        const taskId = taskRes.data.task_id;

        // 3. Polling Result (Max 30 detik)
        let attempts = 0;
        while (attempts < 20) {
            const { data: queryRes } = await axios.get(`${BASE_URL}/api/task/query`, {
                headers: HEADERS,
                params: { ...identity, task_id: taskId }
            });

            if (queryRes?.data?.status === 'success') {
                const rawUrl = queryRes.data.result.result_url || queryRes.data.result.url;
                // Upload hasil ke cloud biar permanen
                const finalUrl = await downloadAndUpload(rawUrl);
                return { success: true, url: finalUrl };
            } 
            
            if (queryRes?.data?.status === 'fail') throw new Error("Server AI gagal memproses gambar");
            
            attempts++;
            await sleep(2000); // Tunggu 2 detik tiap pengecekan
        }

        throw new Error("Waktu tunggu habis (Timeout)");

    } catch (error) {
        return { success: false, msg: error.message };
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "AI Image Enhancer",
    desc: "Memperjelas dan meningkatkan kualitas gambar (HD)",
    category: "AI",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !/^https?:\/\/.+/i.test(url)) {
                return res.status(400).json({
                    status: false,
                    error: 'Masukkan URL gambar yang valid!'
                });
            }

            console.log(`Enhancing image: ${url}`);
            const result = await handleEnhance(url);

            if (!result.success) {
                return res.status(500).json({ status: false, error: result.msg });
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    enhanced_url: result.url
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
