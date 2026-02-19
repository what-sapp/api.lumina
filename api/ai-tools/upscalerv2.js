const axios = require('axios');
const crypto = require('crypto');

/**
 * CONFIG & HELPERS
 */
const SCALES = ['2', '4', '8', '16'];

const unblurHeaders = () => ({
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'origin': 'https://unblurimage.ai',
    'referer': 'https://unblurimage.ai/',
    'Product-Serial': crypto.randomUUID()
});

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Upscaler V2",
    desc: "Meningkatkan resolusi gambar hingga 16x lipat tanpa pecah",
    category: "AI TOOLS",
    params: ["url", "scale"],
    async run(req, res) {
        try {
            const { url, scale = '4' } = req.query;

            if (!url) {
                return res.status(400).json({ status: false, error: 'Parameter "url" wajib diisi!' });
            }
            if (!SCALES.includes(String(scale))) {
                return res.status(400).json({ status: false, error: `Scale tidak valid! Gunakan: ${SCALES.join(', ')}` });
            }

            console.log(`Upscaling image (${scale}x) for: ${url}`);

            // 1. Get Upload URL & Object Name
            const uploadReq = await axios.post('https://api.unblurimage.ai/api/common/upload/upload-image',
                new URLSearchParams({ file_name: `upscale_${Date.now()}.jpg` }).toString(),
                { headers: { ...unblurHeaders(), 'content-type': 'application/x-www-form-urlencoded' } }
            );

            const { url: putUrl, object_name } = uploadReq.data.result;

            // 2. Fetch image dari URL user & Upload ke Storage Unblur
            const imgBuffer = await axios.get(url, { responseType: 'arraybuffer' });
            await axios.put(putUrl, Buffer.from(imgBuffer.data), {
                headers: { 'content-type': 'image/jpeg', 'user-agent': unblurHeaders()['user-agent'] }
            });

            // 3. Create Upscale Job
            const { data: jobRes } = await axios.post('https://api.unblurimage.ai/api/imgupscaler/v1/ai-image-upscaler-v2/create-job',
                new URLSearchParams({
                    original_image_url: `https://cdn.unblurimage.ai/${object_name}`,
                    upscale_type: String(scale)
                }).toString(),
                { headers: { ...unblurHeaders(), 'content-type': 'application/x-www-form-urlencoded', 'authorization': '' } }
            );

            const job = jobRes.result;

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    job_id: job.job_id,
                    scale: scale + 'x',
                    input: job.input_url,
                    output: job.output_url // Link hasil HD
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
