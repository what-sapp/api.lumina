const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
const API_BASE = 'https://api.unblurimage.ai/api/upscaler';

module.exports = {
    name: "Video Enhancer 4K",
    desc: "Meningkatkan kualitas video 720p,1080p,2k hingga resolusi 4K menggunakan AI",
    category: "AI TOOLS",
    params: ["url", "res"], // res: 720p, 1080p, 2k, 4k
    async run(req, res) {
        try {
            const { url, res: resolution = '4k' } = req.query;
            if (!url) return res.status(400).json({ status: false, error: 'Url video wajib diisi!' });

            const productSerial = crypto.createHash('md5').update(UA + Date.now()).digest('hex');

            // 1. Get Video Stream & Upload Info
            const videoStream = await axios.get(url, { responseType: 'stream' });
            const formUp = new FormData();
            formUp.append('video_file_name', 'input_video.mp4');

            const { data: upInfo } = await axios.post(`${API_BASE}/v1/ai-video-enhancer/upload-video`, formUp, {
                headers: { ...formUp.getHeaders(), 'user-agent': UA }
            });

            // 2. Put Video to OSS (Stream to Stream agar hemat RAM)
            await axios.put(upInfo.result.url, videoStream.data, {
                headers: { 'content-type': 'video/mp4' },
                maxBodyLength: Infinity
            });

            // 3. Create Job
            const cdnUrl = 'https://cdn.unblurimage.ai/' + upInfo.result.object_name;
            const formJob = new FormData();
            formJob.append('original_video_file', cdnUrl);
            formJob.append('resolution', resolution);
            formJob.append('is_preview', 'false');

            const { data: job } = await axios.post(`${API_BASE}/v2/ai-video-enhancer/create-job`, formJob, {
                headers: { ...formJob.getHeaders(), 'user-agent': UA, 'product-serial': productSerial }
            });

            if (job.code !== 100000) throw new Error("Gagal membuat job video.");

            // 4. Polling (Video butuh waktu lama, kita limit 5 menit)
            let finalResult;
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 10000)); // Cek tiap 10 detik
                const { data: status } = await axios.get(`${API_BASE}/v2/ai-video-enhancer/get-job/${job.result.job_id}`, {
                    headers: { 'user-agent': UA, 'product-serial': productSerial }
                });

                if (status.code === 100000 && status.result?.output_url) {
                    finalResult = status.result;
                    break;
                }
            }

            if (!finalResult) throw new Error("Video masih diproses, silakan cek job_id secara manual nanti.");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    job_id: job.result.job_id,
                    resolution,
                    output: finalResult.output_url
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
