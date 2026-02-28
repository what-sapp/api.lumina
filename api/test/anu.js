const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         TEXT REPLACE IN IMAGE — imgupscaler.ai              ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  FLOW:                                                       ║
 * ║  1. Upload image → dapat signed OSS URL + CDN URL           ║
 * ║  2. PUT binary ke OSS                                        ║
 * ║  3. Create job text-replace                                  ║
 * ║  4. Poll job sampai selesai                                  ║
 * ║  5. Return output URL                                        ║
 * ║                                                              ║
 * ║  USAGE CLI:                                                  ║
 * ║  node textreplace.js foto.jpg "Hello" "Halo"                 ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios form-data                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const PRODUCT_SERIAL = "5846a1bc-a228-4a53-bce2-33fc51444268";
const PRODUCT_CODE   = "magiceraser";

const BASE_HEADERS = {
    "accept":             "*/*",
    "accept-language":    "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua":          '"Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":   "?1",
    "sec-ch-ua-platform": '"Android"',
    "user-agent":         "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
    "Referer":            "https://imgupscaler.ai/",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── STEP 1: GET SIGNED URL ───────────────────────────────────────────────────

async function getUploadUrl(fileName) {
    const form = new FormData();
    form.append("file_name", fileName);

    const { data } = await axios.post("https://api.imgupscaler.ai/api/common/upload/upload-image", form, {
        headers: { ...BASE_HEADERS, ...form.getHeaders(), "sec-fetch-site": "same-site", "sec-fetch-mode": "cors" },
    });

    const signedUrl  = data?.result?.url;
    const objectName = data?.result?.object_name;
    if (!signedUrl) throw new Error("Signed URL tidak ditemukan: " + JSON.stringify(data));
    return { signedUrl, objectName };
}

// ─── STEP 2: UPLOAD KE OSS ───────────────────────────────────────────────────

async function uploadToOSS(signedUrl, imageBuffer, fileName) {
    await axios.put(signedUrl, imageBuffer, {
        headers: {
            "content-type":   "image/jpeg",
            "content-length": imageBuffer.length,
            "origin":         "https://imgupscaler.ai",
            "Referer":        "https://imgupscaler.ai/",
            "user-agent":     BASE_HEADERS["user-agent"],
        },
        maxBodyLength: Infinity,
    });

    // CDN URL tanpa query string
    const cdnUrl = "https://cdn.imgupscaler.ai/" + signedUrl.split(".aliyuncs.com/")[1].split("?")[0];
    return cdnUrl;
}

// ─── STEP 3: CREATE JOB ───────────────────────────────────────────────────────

async function createJob(cdnUrl, originalText, replaceText) {
    const form = new FormData();
    form.append("original_image_url", cdnUrl);
    form.append("original_text", originalText);
    form.append("replace_text", replaceText);

    const { data } = await axios.post("https://api.magiceraser.org/api/magiceraser/v2/text-replace/create-job", form, {
        headers: {
            ...BASE_HEADERS,
            ...form.getHeaders(),
            "sec-fetch-site": "cross-site",
            "sec-fetch-mode": "cors",
            "authorization":  "",
            "product-code":   PRODUCT_CODE,
            "product-serial": PRODUCT_SERIAL,
        },
    });

    const jobId = data?.result?.job_id || data?.data?.job_id || data?.job_id;
    if (!jobId) throw new Error("Job ID tidak ditemukan: " + JSON.stringify(data));
    return jobId;
}

// ─── STEP 4: POLL JOB ────────────────────────────────────────────────────────

async function pollJob(jobId, maxRetry = 30, interval = 3000) {
    for (let i = 1; i <= maxRetry; i++) {
        await sleep(interval);
        try {
            const { data } = await axios.get(`https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`, {
                headers: { ...BASE_HEADERS, "sec-fetch-site": "cross-site", "sec-fetch-mode": "cors" },
            });

            const outputArr = data?.result?.output_url;
            if (data?.code === 100000 && Array.isArray(outputArr) && outputArr.length > 0) {
                return outputArr[0];
            }
        } catch {}
    }
    throw new Error(`Timeout polling setelah ${maxRetry} percobaan`);
}

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────────

async function replaceTextInImage(imagePath, originalText, replaceText) {
    const fileName   = path.basename(imagePath);
    const imageBuffer = fs.readFileSync(imagePath);

    const { signedUrl } = await getUploadUrl(fileName);
    const cdnUrl        = await uploadToOSS(signedUrl, imageBuffer, fileName);
    const jobId         = await createJob(cdnUrl, originalText, replaceText);
    const outputUrl     = await pollJob(jobId);

    return outputUrl;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, imagePath, originalText, replaceText] = process.argv;
    if (!imagePath || !originalText || !replaceText) {
        console.log("Usage: node textreplace.js foto.jpg \"Hello\" \"Halo\"");
        process.exit(1);
    }
    replaceTextInImage(imagePath, originalText, replaceText)
        .then(url => console.log("✅ Output URL:", url))
        .catch(e  => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Text Replace",
        desc:     "Ganti teks di dalam gambar menggunakan imgupscaler.ai — gratis tanpa login.",
        category: "TEST",
        params:   ["url", "original_text", "replace_text"],
        async run(req, res) {
            try {
                const { url, original_text, replace_text } = req.query;

                if (!url || !original_text || !replace_text) {
                    return res.status(400).json({
                        status: false,
                        error: 'Parameter "url", "original_text", dan "replace_text" wajib diisi!'
                    });
                }

                // Download image dari URL dulu
                const imgRes = await axios.get(url, { responseType: "arraybuffer" });
                const buffer = Buffer.from(imgRes.data);
                const tmpPath = `/tmp/tr_${Date.now()}.jpg`;
                fs.writeFileSync(tmpPath, buffer);

                const outputUrl = await replaceTextInImage(tmpPath, original_text, replace_text);
                fs.unlinkSync(tmpPath);

                return res.status(200).json({
                    status: true,
                    creator: "Shannz x Xena",
                    result: { output_url: outputUrl }
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
