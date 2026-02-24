const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

/**
 * TITAN VIDEO ENHANCER (AI UNBLUR VIDEO)
 * Feature: 2K/4K Video Upscaling via OSS Upload
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Video Enhance AI",
    desc: "Ubah video burik jadi 2K/4K HD. Gunakan parameter 'url' dan '_res' (2k/4k).",
    category: "AI TOOLS",
    params: ["url", "_res"],
    async run(req, res) {
        try {
            const { url, _res } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Mana link videonya, Senior?" });

            const resolution = _res || '2k';
            const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';
            const SITE = 'https://unblurimage.ai';
            const API = 'https://api.unblurimage.ai';
            const SERIAL = crypto.randomBytes(16).toString('hex'); // Dynamic Serial

            const commonHeaders = {
                'product-serial': SERIAL,
                'user-agent': UA,
                'Referer': SITE + '/',
                'Origin': SITE
            };

            // --- TAHAP 1: DOWNLOAD VIDEO INPUT ---
            const videoRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 100000 });
            const buffer = Buffer.from(videoRes.data);
            const fileName = `${crypto.randomBytes(3).toString('hex')}_video.mp4`;

            // --- TAHAP 2: REGISTER FILE KE OSS ---
            const formReg = new FormData();
            formReg.append('video_file_name', fileName);
            const regRes = await axios.post(`${API}/api/upscaler/v1/ai-video-enhancer/upload-video`, formReg, {
                headers: { ...commonHeaders, ...formReg.getHeaders() }
            });

            if (regRes.data.code !== 100000) throw new Error("Gagal register video ke OSS storage.");
            const { url: ossUrl, object_name: objectName } = regRes.data.result;

            // --- TAHAP 3: UPLOAD KE OSS ---
            await axios.put(ossUrl, buffer, {
                headers: { 'Content-Type': 'video/mp4', 'User-Agent': UA }
            });

            // --- TAHAP 4: CREATE ENHANCE JOB ---
            const cdnUrl = `https://cdn.unblurimage.ai/${objectName}`;
            const formJob = new FormData();
            formJob.append('original_video_file', cdnUrl);
            formJob.append('resolution', resolution);
            formJob.append('is_preview', 'false');

            const jobRes = await axios.post(`${API}/api/upscaler/v2/ai-video-enhancer/create-job`, formJob, {
                headers: { ...commonHeaders, ...formJob.getHeaders() }
            });

            if (![100000, 300010].includes(jobRes.data.code)) throw new Error("Gagal membuat job processing video.");
            const jobId = jobRes.data.result.job_id;

            // --- TAHAP 5: POLLING (Fast Polling for API response) ---
            // Kita kasih limit polling 45 detik untuk respon API, kalau lebih user cek manual via Job ID
            let outputUrl = jobRes.data.result.output_url;
            let attempts = 0;

            if (!outputUrl) {
                while (attempts < 8) { // Polling 8x (total ~40 detik)
                    await new Promise(r => setTimeout(r, 5000));
                    const check = await axios.get(`${API}/api/upscaler/v2/ai-video-enhancer/get-job/${jobId}`, { headers: commonHeaders });
                    if (check.data?.code === 100000 && check.data.result?.output_url) {
                        outputUrl = check.data.result.output_url;
                        break;
                    }
                    attempts++;
                }
            }

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                job_id: jobId,
                resolution: resolution,
                result: outputUrl || "Video masih diproses. Silakan cek berkala link hasil nanti.",
                info: outputUrl ? "Selesai" : "Processing (Check Job ID later)"
            });

        } catch (error) {
            console.error('Video Enhance Error:', error.message);
            res.status(500).json({ status: false, error: "Gagal memproses video, mungkin ukuran terlalu besar!" });
        }
    }
};
