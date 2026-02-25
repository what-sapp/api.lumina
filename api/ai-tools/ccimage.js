const https = require("https");
const http  = require("http");

/**
 * ImgUpscaler — AI Photo Colorizer (REST Module)
 * params: url, upscale_type (optional: 2, 4, 8, 16)
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
        req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
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

// Download URL → Buffer (ganti fs.readFileSync)
function urlToBuffer(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith("https") ? https : http;
        proto.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return urlToBuffer(res.headers.location).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on("data", d => chunks.push(d));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        }).on("error", reject);
    });
}

// ─── STEP 1: COLORIZE ────────────────────────────────────────────────────────

async function createColorizeJob(imageUrl) {
    const fileBuffer = await urlToBuffer(imageUrl);
    const boundary   = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18).toUpperCase();
    const partHeader = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="original_image_file"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
    );
    const partFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body       = Buffer.concat([partHeader, fileBuffer, partFooter]);

    const res  = await httpsRequest({
        hostname: "api.imgupscaler.ai",
        path:     "/api/imgupscaler/v2/ai-image-colorize/create-job",
        method:   "POST",
        headers:  {
            ...BASE_HEADERS,
            "content-type":   `multipart/form-data; boundary=${boundary}`,
            "content-length": body.length,
            "authorization":  "",
            "product-serial": PRODUCT_SERIAL,
        }
    }, body);

    const json  = JSON.parse(res.body);
    const jobId = json?.result?.job_id;
    if (!jobId) throw new Error("Colorize job ID tidak ditemukan: " + res.body);
    return jobId;
}

// ─── STEP 2: UPSCALE (OPTIONAL) ──────────────────────────────────────────────

async function createUpscaleJob(colorizedUrl, upscaleType) {
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18).toUpperCase();
    const body     = buildFormData({
        original_image_url: colorizedUrl,
        upscale_type:       String(upscaleType),
        image_width:        "1080",
        image_height:       "1080",
    }, boundary);

    const res  = await httpsRequest({
        hostname: "api.imgupscaler.ai",
        path:     "/api/image-upscaler/v2/universal-upscale-for-url/create-job",
        method:   "POST",
        headers:  {
            ...BASE_HEADERS,
            "content-type":   `multipart/form-data; boundary=${boundary}`,
            "content-length": body.length,
            "authorization":  "",
            "product-serial": PRODUCT_SERIAL,
        }
    }, body);

    const json  = JSON.parse(res.body);
    const jobId = json?.result?.job_id;
    if (!jobId) throw new Error("Upscale job ID tidak ditemukan: " + res.body);
    return jobId;
}

// ─── POLL ─────────────────────────────────────────────────────────────────────

async function pollJob(jobId, label = "", maxRetry = 30, interval = 3000) {
    for (let i = 1; i <= maxRetry; i++) {
        await sleep(interval);

        const res  = await httpsRequest({
            hostname: "api.imgupscaler.ai",
            path:     label === "Colorize"
                ? `/api/imgupscaler/v1/ai-image-colorize/get-job/${jobId}`
                : `/api/image-upscaler/v1/universal_upscale/get-job/${jobId}`,
            method:   "GET",
            headers:  { ...BASE_HEADERS, "product-serial": PRODUCT_SERIAL }
        });

        let json;
        try { json = JSON.parse(res.body); } catch { continue; }

        const code      = json?.code;
        const outputArr = json?.result?.output_url;

        if (code === 100000 && Array.isArray(outputArr) && outputArr[0]) {
            return outputArr[0];
        }
    }

    throw new Error(`Timeout polling ${label}`);
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function colorizePhoto(imageUrl, upscaleType = 0) {
    const colorizeJobId = await createColorizeJob(imageUrl);
    const colorizedUrl  = await pollJob(colorizeJobId, "Colorize");

    if (!upscaleType || upscaleType <= 0) return colorizedUrl;

    const upscaleJobId = await createUpscaleJob(colorizedUrl, upscaleType);
    return await pollJob(upscaleJobId, "Upscale");
}

// ─── MODULE EXPORT ────────────────────────────────────────────────────────────

module.exports = {
    name:     "AI Photo Colorizer",
    desc:     "Colorize foto hitam putih pakai AI imgupscaler — gratis, tanpa login.",
    category: "AI Tools",
    params:   ["url", "upscale_type"],

    async run(req, res) {
        try {
            const { url, upscale_type } = req.query;

            if (!url || !/^https?:\/\/.+/i.test(url))
                return res.status(400).json({ status: false, error: 'Parameter "url" (link gambar) wajib diisi!' });

            const upscaleType = parseInt(upscale_type) || 0;
            const outputUrl   = await colorizePhoto(url, upscaleType);

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
        }
    }
};
