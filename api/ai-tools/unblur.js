const axios = require("axios");
const FormData = require("form-data");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         UNBLUR IMAGE — imgupscaler.ai                       ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  FLOW:                                                       ║
 * ║  1. Upload image → create unblur job                         ║
 * ║  2. Poll job → dapat output URL                              ║
 * ║                                                              ║
 * ║  USAGE CLI:                                                  ║
 * ║  node unblur.js "https://example.com/foto.jpg"               ║
 * ║  node unblur.js foto.jpg                                     ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url → URL gambar (wajib)                                    ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios form-data                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const BASE_HEADERS = {
    "accept":             "*/*",
    "accept-language":    "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua":          '"Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":   "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest":     "empty",
    "sec-fetch-mode":     "cors",
    "sec-fetch-site":     "same-site",
    "origin":             "https://imgupscaler.ai",
    "Referer":            "https://imgupscaler.ai/",
    "user-agent":         "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
    "timezone":           "Asia/Jakarta",
};

function randomUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── GET IMAGE BUFFER ─────────────────────────────────────────────────────────

async function getImageBuffer(input) {
    if (/^https?:\/\//i.test(input)) {
        const res = await axios.get(input, { responseType: "arraybuffer" });
        const ext = input.split(".").pop().split("?")[0].toLowerCase();
        return { buffer: Buffer.from(res.data), fileName: `image.${ext || "jpg"}` };
    } else {
        const fs   = require("fs");
        const path = require("path");
        return { buffer: fs.readFileSync(input), fileName: require("path").basename(input) };
    }
}

// ─── STEP 1: CREATE JOB ───────────────────────────────────────────────────────

async function createJob(buffer, fileName) {
    const form = new FormData();
    form.append("original_image_file", buffer, { filename: fileName, contentType: "image/jpeg" });

    const { data } = await axios.post("https://api.imgupscaler.ai/api/image-upscaler/v2/upscale/create-job", form, {
        headers: {
            ...BASE_HEADERS,
            ...form.getHeaders(),
            "authorization":  "",
            "product-serial": randomUUID(),
        },
        maxBodyLength: Infinity,
    });

    const jobId = data?.result?.job_id || data?.data?.job_id || data?.job_id;
    if (!jobId) throw new Error("Job ID tidak ditemukan: " + JSON.stringify(data));
    return jobId;
}

// ─── STEP 2: POLL JOB ────────────────────────────────────────────────────────

async function pollJob(jobId, maxRetry = 40, interval = 3000) {
    for (let i = 1; i <= maxRetry; i++) {
        await sleep(interval);
        try {
            const { data } = await axios.get(`https://api.imgupscaler.ai/api/image-upscaler/v1/universal_upscale/get-job/${jobId}`, {
                headers: { ...BASE_HEADERS, "product-serial": randomUUID() },
            });
            const outputArr = data?.result?.output_url;
            if (data?.code === 100000 && Array.isArray(outputArr) && outputArr[0]) {
                return outputArr[0];
            }
        } catch {}
    }
    throw new Error(`Timeout polling setelah ${maxRetry} percobaan`);
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function unblurImage(input) {
    const { buffer, fileName } = await getImageBuffer(input);
    const jobId    = await createJob(buffer, fileName);
    const outputUrl = await pollJob(jobId);
    return outputUrl;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, input] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node unblur.js "https://example.com/foto.jpg"');
        console.log("  node unblur.js foto.jpg");
        process.exit(1);
    }
    unblurImage(input)
        .then(url => console.log("✅ Output URL:", url))
        .catch(e  => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Unblur Image",
        desc:     "Unblur / sharpen gambar menggunakan imgupscaler.ai — gratis tanpa login.",
        category: "AI TOOLS",
        params:   ["url"],
        async run(req, res) {
            try {
                const { url } = req.query;
                if (!url) return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });

                const outputUrl = await unblurImage(url);
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
