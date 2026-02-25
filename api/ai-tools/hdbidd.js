const https = require("https");
const http  = require("http");
const fs    = require("fs");
const path  = require("path");
const os    = require("os");

/**
 * ImgUpscaler — AI Video Enhancer (REST Module)
 * params: url, enhance_mode (1=1080P, 2=2K), force_rate (fps)
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const PRODUCT_SERIAL = "5846a1bc-a228-4a53-bce2-33fc51444268";

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
    "Referrer-Policy":    "strict-origin-when-cross-origin",
    "user-agent":         "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
    "timezone":           "Asia/Jakarta",
};

// ─── HELPER ───────────────────────────────────────────────────────────────────

function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", d => data += d.toString());
            res.on("end", () => resolve({ status: res.statusCode, body: data }));
        });
        req.setTimeout(60000, () => { req.destroy(); reject(new Error("Timeout")); });
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildFormData(fields, boundary) {
    let body = "";
    for (const [name, value] of Object.entries(fields)) {
        body += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    return Buffer.from(body);
}

// Download URL → temp file
function downloadToTemp(url) {
    return new Promise((resolve, reject) => {
        const tmpPath = path.join(os.tmpdir(), `vid_${Date.now()}.mp4`);
        const file    = fs.createWriteStream(tmpPath);
        const proto   = url.startsWith("https") ? https : http;

        proto.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                fs.unlinkSync(tmpPath);
                return downloadToTemp(res.headers.location).then(resolve).catch(reject);
            }
            res.pipe(file);
            file.on("finish", () => { file.close(); resolve(tmpPath); });
        }).on("error", (e) => { fs.unlink(tmpPath, () => {}); reject(e); });
    });
}

// ─── STEP 1: GET SIGNED URL ───────────────────────────────────────────────────

async function getUploadUrl(videoPath) {
    const fileName = path.basename(videoPath);
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18).toUpperCase();
    const body     = buildFormData({ video_file_name: fileName }, boundary);

    const res  = await httpsRequest({
        hostname: "api.imgupscaler.ai",
        path:     "/api/upscaler/v1/ai-video-enhancer/upload-video",
        method:   "POST",
        headers:  { ...BASE_HEADERS, "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": body.length }
    }, body);

    let json;
    try { json = JSON.parse(res.body); } catch { throw new Error("Response bukan JSON: " + res.body); }

    const signedUrl = json?.result?.url;
    if (!signedUrl) throw new Error("Signed URL tidak ditemukan: " + res.body);
    return { signedUrl };
}

// ─── STEP 2: UPLOAD KE OSS ────────────────────────────────────────────────────

async function uploadToOSS(signedUrl, videoPath) {
    const fileBuffer = fs.readFileSync(videoPath);
    const parsedUrl  = new URL(signedUrl);

    const res = await httpsRequest({
        hostname: parsedUrl.hostname,
        path:     parsedUrl.pathname + parsedUrl.search,
        method:   "PUT",
        headers:  {
            "content-type":   "video/mp4",
            "content-length": fileBuffer.length,
            "origin":         "https://imgupscaler.ai",
            "Referer":        "https://imgupscaler.ai/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "user-agent":     BASE_HEADERS["user-agent"],
        }
    }, fileBuffer);

    if (res.status !== 200) throw new Error(`Upload OSS gagal: ${res.status}`);

    const objectName = signedUrl.split(".aliyuncs.com/")[1].split("?")[0];
    return `https://cdn.imgupscaler.ai/${objectName}`;
}

// ─── STEP 3: CREATE JOB ───────────────────────────────────────────────────────

async function createJob(cdnUrl, enhanceMode, duration, forceRate) {
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18).toUpperCase();
    const body     = buildFormData({
        original_video_file: cdnUrl,
        enhance_mode:        String(enhanceMode),
        duration:            String(duration),
        force_rate:          String(forceRate),
    }, boundary);

    const res  = await httpsRequest({
        hostname: "api.imgupscaler.ai",
        path:     "/api/image-upscaler/v2/video-upscale/create-job",
        method:   "POST",
        headers:  {
            ...BASE_HEADERS,
            "content-type":   `multipart/form-data; boundary=${boundary}`,
            "content-length": body.length,
            "authorization":  "",
            "product-serial": PRODUCT_SERIAL,
        }
    }, body);

    let json;
    try { json = JSON.parse(res.body); } catch { throw new Error("Job response bukan JSON: " + res.body); }

    const jobId = json?.result?.job_id || json?.data?.job_id;
    if (!jobId) throw new Error("Job ID tidak ditemukan: " + res.body);
    return jobId;
}

// ─── STEP 4: POLL ─────────────────────────────────────────────────────────────

async function pollJob(jobId, maxRetry = 120, interval = 5000) {
    for (let i = 1; i <= maxRetry; i++) {
        await sleep(interval);
        const res  = await httpsRequest({
            hostname: "api.imgupscaler.ai",
            path:     `/api/image-upscaler/v1/universal_upscale/get-job/${jobId}`,
            method:   "GET",
            headers:  { ...BASE_HEADERS, "product-serial": PRODUCT_SERIAL }
        });

        let json;
        try { json = JSON.parse(res.body); } catch { continue; }

        const code      = json?.code;
        const outputArr = json?.result?.output_url;
        if (code === 100000 && Array.isArray(outputArr) && outputArr[0]) return outputArr[0];
    }
    throw new Error("Timeout polling");
}

// ─── MODULE EXPORT ────────────────────────────────────────────────────────────

module.exports = {
    name:     "AI Video Enhancer",
    desc:     "Enhance kualitas video pakai imgupscaler.ai — gratis, tanpa login.",
    category: "Video Tools",
    params:   ["url", "enhance_mode", "_force_rate"],

    async run(req, res) {
        let tmpPath = null;
        try {
            const { url, enhance_mode, force_rate } = req.query;

            if (!url || !/^https?:\/\/.+/i.test(url))
                return res.status(400).json({ status: false, error: 'Parameter "url" (link video) wajib diisi!' });

            const enhanceMode = parseInt(enhance_mode) || 1;
            const forceRate   = parseInt(force_rate)   || 24;
            const durationMap = { 1: 10, 2: 5, 3: 10 };
            const duration    = durationMap[enhanceMode] || 10;

            // Download video dari URL ke temp file
            tmpPath = await downloadToTemp(url);

            const { signedUrl } = await getUploadUrl(tmpPath);
            const cdnUrl        = await uploadToOSS(signedUrl, tmpPath);
            const jobId         = await createJob(cdnUrl, enhanceMode, duration, forceRate);
            const outputUrl     = await pollJob(jobId);

            return res.status(200).json({
                status:  true,
                creator: "Shannz x Xena",
                result:  { output_url: outputUrl }
            });

        } catch (error) {
            return res.status(500).json({
                status:  false,
                creator: "Shannz x Xena",
                error:   error.message
            });
        } finally {
            // Hapus temp file
            if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        }
    }
};
