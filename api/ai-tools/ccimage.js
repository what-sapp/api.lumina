const axios = require("axios");
const FormData = require("form-data");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         AI PHOTO COLORIZER — imgupscaler.ai                 ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  FLOW:                                                       ║
 * ║  1. Upload image → colorize job                              ║
 * ║  2. Poll colorize job → dapat colorized URL                  ║
 * ║  3. (Opsional) Upscale colorized URL                         ║
 * ║  4. Poll upscale job → dapat final URL                       ║
 * ║                                                              ║
 * ║  USAGE CLI:                                                  ║
 * ║  node colorize.js "https://example.com/foto.jpg"             ║
 * ║  node colorize.js "https://example.com/foto.jpg" 2           ║
 * ║  node colorize.js foto.jpg 4                                 ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url          → URL gambar (wajib)                           ║
 * ║  upscale_type → 0=off, 2=2K, 4=4K, 8=8K, 16=16K (default 0)║
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
        return { buffer: fs.readFileSync(input), fileName: path.basename(input) };
    }
}

// ─── STEP 1: CREATE COLORIZE JOB ─────────────────────────────────────────────

async function createColorizeJob(buffer, fileName) {
    const form = new FormData();
    form.append("original_image_file", buffer, { filename: fileName, contentType: "image/jpeg" });

    const { data } = await axios.post("https://api.imgupscaler.ai/api/imgupscaler/v2/ai-image-colorize/create-job", form, {
        headers: {
            ...BASE_HEADERS,
            ...form.getHeaders(),
            "authorization":  "",
            "product-serial": randomUUID(),
        },
        maxBodyLength: Infinity,
    });

    const jobId = data?.result?.job_id;
    if (!jobId) throw new Error("Colorize job ID tidak ditemukan: " + JSON.stringify(data));
    return jobId;
}

// ─── STEP 2: CREATE UPSCALE JOB (OPTIONAL) ───────────────────────────────────

async function createUpscaleJob(colorizedUrl, upscaleType) {
    const form = new FormData();
    form.append("original_image_url", colorizedUrl);
    form.append("upscale_type",       String(upscaleType));
    form.append("image_width",        "1080");
    form.append("image_height",       "1080");

    const { data } = await axios.post("https://api.imgupscaler.ai/api/image-upscaler/v2/universal-upscale-for-url/create-job", form, {
        headers: {
            ...BASE_HEADERS,
            ...form.getHeaders(),
            "authorization":  "",
            "product-serial": randomUUID(),
        },
    });

    const jobId = data?.result?.job_id;
    if (!jobId) throw new Error("Upscale job ID tidak ditemukan: " + JSON.stringify(data));
    return jobId;
}

// ─── POLL JOB ─────────────────────────────────────────────────────────────────

async function pollJob(jobId, type = "colorize", maxRetry = 30, interval = 3000) {
    const path = type === "colorize"
        ? `/api/imgupscaler/v1/ai-image-colorize/get-job/${jobId}`
        : `/api/image-upscaler/v1/universal_upscale/get-job/${jobId}`;

    for (let i = 1; i <= maxRetry; i++) {
        await sleep(interval);
        try {
            const { data } = await axios.get(`https://api.imgupscaler.ai${path}`, {
                headers: { ...BASE_HEADERS, "product-serial": randomUUID() },
            });
            const outputArr = data?.result?.output_url;
            if (data?.code === 100000 && Array.isArray(outputArr) && outputArr[0]) {
                return outputArr[0];
            }
        } catch {}
    }
    throw new Error(`Timeout polling ${type} job`);
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function colorizePhoto(input, upscaleType = 0) {
    const { buffer, fileName } = await getImageBuffer(input);

    // Step 1: Colorize
    const colorizeJobId = await createColorizeJob(buffer, fileName);
    const colorizedUrl  = await pollJob(colorizeJobId, "colorize");

    // Step 2: Upscale (optional)
    if (!upscaleType || upscaleType <= 0) return { colorized_url: colorizedUrl };

    const upscaleJobId = await createUpscaleJob(colorizedUrl, upscaleType);
    const finalUrl     = await pollJob(upscaleJobId, "upscale");

    return { colorized_url: colorizedUrl, upscaled_url: finalUrl };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, input, upscaleType] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node colorize.js "https://example.com/foto.jpg"');
        console.log('  node colorize.js "https://example.com/foto.jpg" 2');
        console.log("  node colorize.js foto.jpg 4");
        console.log("  upscale_type: 0=off (default), 2=2K, 4=4K, 8=8K, 16=16K");
        process.exit(1);
    }
    colorizePhoto(input, parseInt(upscaleType) || 0)
        .then(r  => console.log("✅ Result:", JSON.stringify(r, null, 2)))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "AI Photo Colorizer",
        desc:     "Colorize foto hitam putih + upscale.",
        category: "AI TOOLS",
        params:   ["url", "_upscale_type"],
        async run(req, res) {
            try {
                const { url, upscale_type = 0 } = req.query;
                if (!url) return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });

                const result = await colorizePhoto(url, parseInt(upscale_type) || 0);
                return res.status(200).json({
                    status: true,
                    creator: "Shannz x Xena",
                    result
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
