const https = require("https");
const http  = require("http");
const path  = require("path");

/**
 * AI TEXT EDITOR (REPLACE TEXT IN IMAGE)
 * Creator: Shannz x Xena
 * Flow: Download URL -> Signed OSS -> Upload OSS -> MagicEraser Job -> Poll -> Return URL
 */

const PRODUCT_SERIAL = "5846a1bc-a228-4a53-bce2-33fc51444268";
const PRODUCT_CODE   = "magiceraser";

const BASE_HEADERS = {
    "accept":             "*/*",
    "accept-language":    "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua":          '"Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":   "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest":     "empty",
    "sec-fetch-mode":     "cors",
    "user-agent":         "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
    "Referer":            "https://imgupscaler.ai/",
    "Referrer-Policy":    "strict-origin-when-cross-origin",
};

function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", d => data += d.toString());
            res.on("end", () => resolve({ status: res.statusCode, body: data }));
        });
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

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith("https") ? https : http;
        proto.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadBuffer(res.headers.location).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on("data", d => chunks.push(d));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        }).on("error", reject);
    });
}

async function replaceTextFromUrl(imageUrl, originalText, replaceText) {
    const fileBuffer = await downloadBuffer(imageUrl);
    const fileName   = path.basename(imageUrl.split("?")[0]) || "image.jpg";

    const boundary1 = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18).toUpperCase();
    const body1     = buildFormData({ file_name: fileName }, boundary1);

    const res1      = await httpsRequest({
        hostname: "api.imgupscaler.ai",
        path:     "/api/common/upload/upload-image",
        method:   "POST",
        headers:  { ...BASE_HEADERS, "sec-fetch-site": "same-site", "content-type": `multipart/form-data; boundary=${boundary1}`, "content-length": body1.length }
    }, body1);

    const json1      = JSON.parse(res1.body);
    const signedUrl  = json1?.result?.url;
    const objectName = json1?.result?.object_name;
    if (!signedUrl) throw new Error("Gagal dapat signed URL: " + res1.body);

    const parsedUrl = new URL(signedUrl);
    const ossRes    = await httpsRequest({
        hostname: parsedUrl.hostname,
        path:     parsedUrl.pathname + parsedUrl.search,
        method:   "PUT",
        headers:  { "content-type": "image/jpeg", "content-length": fileBuffer.length, "origin": "https://imgupscaler.ai", "Referer": "https://imgupscaler.ai/", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "cross-site", "user-agent": BASE_HEADERS["user-agent"] }
    }, fileBuffer);

    if (ossRes.status !== 200) throw new Error(`Upload OSS gagal: ${ossRes.status}`);

    const cdnUrl    = objectName
        ? `https://cdn.imgupscaler.ai/${objectName}`
        : "https://cdn.imgupscaler.ai/" + signedUrl.split(".aliyuncs.com/")[1].split("?")[0];

    const boundary2 = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18).toUpperCase();
    const body2     = buildFormData({ original_image_url: cdnUrl, original_text: originalText, replace_text: replaceText }, boundary2);

    const res2  = await httpsRequest({
        hostname: "api.magiceraser.org",
        path:     "/api/magiceraser/v2/text-replace/create-job",
        method:   "POST",
        headers:  { ...BASE_HEADERS, "sec-fetch-site": "cross-site", "content-type": `multipart/form-data; boundary=${boundary2}`, "content-length": body2.length, "authorization": "", "product-code": PRODUCT_CODE, "product-serial": PRODUCT_SERIAL }
    }, body2);

    const json2 = JSON.parse(res2.body);
    const jobId = json2?.result?.job_id || json2?.data?.job_id;
    if (!jobId) throw new Error("Gagal dapat job ID: " + res2.body);

    for (let i = 0; i < 30; i++) {
        await sleep(3000);
        const resPoll  = await httpsRequest({
            hostname: "api.magiceraser.org",
            path:     `/api/magiceraser/v1/ai-remove/get-job/${jobId}`,
            method:   "GET",
            headers:  { ...BASE_HEADERS, "sec-fetch-site": "cross-site" }
        });
        const jsonPoll = JSON.parse(resPoll.body);
        if (jsonPoll.code === 100000 && jsonPoll.result?.output_url?.[0]) {
            return jsonPoll.result.output_url[0];
        }
    }

    throw new Error("Timeout, hasil tidak tersedia");
}

module.exports = {
    name:     "AI Text Editor",
    desc:     "Mengganti teks di dalam gambar dengan teks baru secara otomatis menggunakan AI.",
    category: "Image Tools",
    params:   ["url", "old_text", "new_text"],

    async run(req, res) {
        const imageUrl     = req.query.url;
        const originalText = req.query.old_text;
        const replaceText  = req.query.new_text;

        if (!imageUrl)
            return res.status(400).json({ status: false, statusCode: 400, creator: "Shannz x Xena", error: "Parameter 'url' harus diisi!" });
        if (!originalText || !replaceText)
            return res.status(400).json({ status: false, statusCode: 400, creator: "Shannz x Xena", error: "Parameter 'old_text' dan 'new_text' harus diisi!" });

        try {
            const outputUrl = await replaceTextFromUrl(imageUrl, originalText, replaceText);
            return res.status(200).json({
                status:     true,
                statusCode: 200,
                creator:    "Shannz x Xena",
                result:     { original_text: originalText, replaced_with: replaceText, output_url: outputUrl }
            });
        } catch (e) {
            return res.status(500).json({ status: false, statusCode: 500, creator: "Shannz x Xena", error: e.message });
        }
    }
};
