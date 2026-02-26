const https = require("https");
const crypto = require("crypto");

/**
 * IMGUPSCALER UNBLUR - Fitur ke-116
 * Status: PRO (Serial Bypass)
 * Deskripsi: Mempertajam foto blur/buram secara otomatis.
 * Creator: Xena
 */

const PRODUCT_SERIAL = "5846a1bc-a228-4a53-bce2-33fc51444268";

async function unblurByUrl(imageUrl) {
    // 1. Download gambar ke Buffer
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Gagal ambil gambar dari URL.');
    const buf = Buffer.from(await imgRes.arrayBuffer());
    
    const fileName = `xena_unblur_${Date.now()}.jpg`;
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18).toUpperCase();

    // 2. Create Job (Upload Binary)
    const partHeader = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="original_image_file"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`);
    const partFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([partHeader, buf, partFooter]);

    const createRes = await fetch("https://api.imgupscaler.ai/api/image-upscaler/v2/upscale/create-job", {
        method: "POST",
        headers: {
            "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B)...",
            "content-type": `multipart/form-data; boundary=${boundary}`,
            "product-serial": PRODUCT_SERIAL,
        },
        body: body
    }).then(r => r.json());

    const jobId = createRes?.result?.job_id || createRes?.data?.job_id || createRes?.job_id;
    if (!jobId) throw new Error("Gagal membuat job unblur.");

    // 3. Polling Job (Nunggu hasil)
    let outputUrl = null;
    for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(`https://api.imgupscaler.ai/api/image-upscaler/v1/universal_upscale/get-job/${jobId}`, {
            headers: { "product-serial": PRODUCT_SERIAL }
        }).then(r => r.json());

        if (pollRes?.code === 100000 && pollRes?.result?.output_url?.[0]) {
            outputUrl = pollRes.result.output_url[0];
            break;
        }
    }

    if (!outputUrl) throw new Error("Antrean unblur terlalu lama.");

    // 4. Download hasil dan kembalikan Buffer
    const finalRes = await fetch(outputUrl);
    return Buffer.from(await finalRes.arrayBuffer());
}

module.exports = {
    name: "Unblur",
    desc: "Pertajam foto yang blur menggunakan AI ImgUpscaler.",
    category: "TEST",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, creator: "Xena", error: "Link fotonya mana?" });

        try {
            const resultBuffer = await unblurByUrl(url);
            res.set("Content-Type", "image/jpeg");
            res.status(200).send(resultBuffer);
        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: err.message });
        }
    }
};
