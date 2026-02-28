const axios = require("axios");
const FormData = require("form-data");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         AI VIDEO ENHANCER — imgupscaler.ai                  ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  FLOW:                                                       ║
 * ║  1. Get signed OSS URL                                       ║
 * ║  2. Upload video buffer ke OSS                               ║
 * ║  3. Create enhance job                                       ║
 * ║  4. Poll job → dapat output URL                              ║
 * ║                                                              ║
 * ║  USAGE CLI:                                                  ║
 * ║  node videoenhancer.js "https://example.com/video.mp4"       ║
 * ║  node videoenhancer.js "https://..." 2 30                    ║
 * ║  node videoenhancer.js video.mp4 1 24                        ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url            → URL video (wajib)                          ║
 * ║  _enhance_mode  → 1=normal, 2=strong (default: 1)           ║
 * ║  _force_rate    → fps: 24, 30, 60 (default: 24)             ║
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

// ─── GET VIDEO BUFFER ─────────────────────────────────────────────────────────

async function getVideoBuffer(input) {
    if (/^https?:\/\//i.test(input)) {
        const res = await axios.get(input, { responseType: "arraybuffer", timeout: 60000 });
        const ext = input.split(".").pop().split("?")[0].toLowerCase() || "mp4";
        return { buffer: Buffer.from(res.data), fileName: `video.${ext}` };
    } else {
        const fs   = require("fs");
        const path = require("path");
        return { buffer: fs.readFileSync(input), fileName: require("path").basename(input) };
    }
}

// ─── STEP 1: GET SIGNED URL ───────────────────────────────────────────────────

async function getUploadUrl(fileName) {
    const form = new FormData();
    form.append("video_file_name", fileName);

    const { data } = await axios.post("https://api.imgupscaler.ai/api/upscaler/v1/ai-video-enhancer/upload-video", form, {
        headers: { ...BASE_HEADERS, ...form.getHeaders() },
    });

    const signedUrl = data?.result?.url;
    if (!signedUrl) throw new Error("Signed URL tidak ditemukan: " + JSON.stringify(data));
    return signedUrl;
}

// ─── STEP 2: UPLOAD KE OSS ───────────────────────────────────────────────────

async function uploadToOSS(signedUrl, buffer) {
    await axios.put(signedUrl, buffer, {
        headers: {
            "content-type":   "video/mp4",
            "content-length": buffer.length,
            "origin":         "https://imgupscaler.ai",
            "Referer":        "https://imgupscaler.ai/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "user-agent":     BASE_HEADERS["user-agent"],
        },
        maxBodyLength: Infinity,
        timeout: 120000,
    });

    return "https://cdn.imgupscaler.ai/" + signedUrl.split(".aliyuncs.com/")[1].split("?")[0];
}

// ─── STEP 3: CREATE JOB ───────────────────────────────────────────────────────

async function createJob(cdnUrl, enhanceMode = 1, forceRate = 24) {
    const durationMap = { 1: 10, 2: 5, 3: 10 };
    const duration    = durationMap[parseInt(enhanceMode)] || 10;

    const form = new FormData();
    form.append("original_video_file", cdnUrl);
    form.append("enhance_mode",        String(enhanceMode));
    form.append("duration",            String(duration));
    form.append("force_rate",          String(forceRate));

    const { data } = await axios.post("https://api.imgupscaler.ai/api/image-upscaler/v2/video-upscale/create-job", form, {
        headers: {
            ...BASE_HEADERS,
            ...form.getHeaders(),
            "authorization":  "",
            "product-serial": randomUUID(),
        },
    });

    const jobId = data?.result?.job_id || data?.data?.job_id;
    if (!jobId) throw new Error("Job ID tidak ditemukan: " + JSON.stringify(data));
    return jobId;
}

// ─── STEP 4: POLL JOB ────────────────────────────────────────────────────────

async function pollJob(jobId, maxRetry = 60, interval = 5000) {
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

async function enhanceVideo(input, enhanceMode = 1, forceRate = 24) {
    const { buffer, fileName } = await getVideoBuffer(input);
    const signedUrl = await getUploadUrl(fileName);
    const cdnUrl    = await uploadToOSS(signedUrl, buffer);
    const jobId     = await createJob(cdnUrl, enhanceMode, forceRate);
    return await pollJob(jobId);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, input, enhanceMode = "1", forceRate = "24"] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node videoenhancer.js "https://example.com/video.mp4"');
        console.log('  node videoenhancer.js "https://..." 2 30');
        console.log("  node videoenhancer.js video.mp4 1 24");
        console.log("  enhance_mode: 1=normal, 2=strong");
        console.log("  force_rate:   24, 30, 60 fps");
        process.exit(1);
    }
    enhanceVideo(input, parseInt(enhanceMode), parseInt(forceRate))
        .then(url => console.log("✅ Output URL:", url))
        .catch(e  => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Video Enhancer V2",
        desc:     "Enhance kualitas video menggunakan imgupscaler.ai — gratis tanpa login.",
        category: "AI TOOLS",
        params:   ["url", "_enhance_mode", "_force_rate"],
        async run(req, res) {
            try {
                const { url, _enhance_mode = 1, _force_rate = 24 } = req.query;
                if (!url) return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });

                const outputUrl = await enhanceVideo(url, parseInt(_enhance_mode), parseInt(_force_rate));
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
