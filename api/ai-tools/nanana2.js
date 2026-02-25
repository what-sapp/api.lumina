const https  = require("https");
const http   = require("http");
const crypto = require("crypto");

/**
 * Nanana.app — Image to Image (REST Module)
 * Auto Login via Tempmail akunlama.com
 */

// ─── HELPER ───────────────────────────────────────────────────────────────────

function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const proto  = parsed.protocol === "https:" ? https : http;
        const req    = proto.request({
            hostname: parsed.hostname,
            path:     parsed.pathname + parsed.search,
            method:   options.method || "GET",
            headers:  options.headers || {},
        }, (res) => {
            let data = "";
            res.on("data", d => data += d.toString());
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data, json: () => JSON.parse(data) }));
        });
        req.setTimeout(20000, () => { req.destroy(); reject(new Error("Timeout")); });
        req.on("error", reject);
        if (body) {
            if (Buffer.isBuffer(body)) req.write(body);
            else req.write(typeof body === "string" ? body : JSON.stringify(body));
        }
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function genFpId() {
    const p1 = crypto.randomBytes(16).toString("hex");
    const p2 = crypto.randomBytes(32).toString("hex");
    return Buffer.from(`${p1}.${p2}`).toString("base64");
}

// Download URL ke buffer
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

const BASE_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "origin":          "https://nanana.app",
    "referer":         "https://nanana.app/en",
};

// ─── TEMPMAIL ─────────────────────────────────────────────────────────────────

async function getAuth() {
    const username = crypto.randomBytes(6).toString("hex");
    const email    = `${username}@akunlama.com`;

    const sendRes = await request(
        "https://nanana.app/api/auth/email-otp/send-verification-otp",
        { method: "POST", headers: { ...BASE_HEADERS, "Content-Type": "application/json" } },
        { email, type: "sign-in" }
    );
    if (sendRes.status !== 200) throw new Error("Gagal kirim OTP: " + sendRes.body);

    let otp = null, attempt = 0;
    while (!otp) {
        await sleep(3000);
        try {
            const listRes = await request(`https://akunlama.com/api/v1/mail/list?recipient=${username}`);
            const mails   = listRes.json();
            if (Array.isArray(mails) && mails.length > 0) {
                const { region, key } = mails[0].storage;
                const mailRes = await request(`https://akunlama.com/api/v1/mail/getHtml?region=${region}&key=${key}`);
                const match   = mailRes.body.match(/\b\d{6}\b/);
                if (match) otp = match[0];
            }
        } catch {}
        if (++attempt > 20) throw new Error("OTP timeout");
    }

    const signRes = await request(
        "https://nanana.app/api/auth/sign-in/email-otp",
        { method: "POST", headers: { ...BASE_HEADERS, "Content-Type": "application/json" } },
        { email, otp }
    );
    if (signRes.status !== 200) throw new Error("Login gagal: " + signRes.body);

    const cookieStr = (signRes.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
    return { ...BASE_HEADERS, "Cookie": cookieStr, "x-fp-id": genFpId() };
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function nananaI2I(imageUrl, prompt) {
    const authHeaders = await getAuth();

    // Download gambar dari URL ke buffer
    const fileBuffer = await urlToBuffer(imageUrl);
    const fileName   = "image.jpg";
    const boundary   = "----FormBoundary" + crypto.randomBytes(8).toString("hex");
    const partH      = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`);
    const partF      = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body       = Buffer.concat([partH, fileBuffer, partF]);

    // Upload
    const uploadRes = await request(
        "https://nanana.app/api/upload-img",
        { method: "POST", headers: { ...authHeaders, "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length } },
        body
    );
    const uploadJson = uploadRes.json();
    if (!uploadJson?.url) throw new Error("Upload gagal: " + uploadRes.body);

    // Create job
    const jobRes  = await request(
        "https://nanana.app/api/image-to-image",
        { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" } },
        { prompt, image_urls: [uploadJson.url] }
    );
    const jobJson = jobRes.json();
    if (!jobJson?.request_id) throw new Error("Job gagal: " + jobRes.body);

    // Poll
    const pollBody = JSON.stringify({ requestId: jobJson.request_id, type: "image-to-image" });
    for (let i = 0; i < 30; i++) {
        await sleep(5000);
        const pollRes  = await request(
            "https://nanana.app/api/get-result",
            { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" } },
            pollBody
        );
        const pollJson = pollRes.json();
        const images   = pollJson?.data?.images;
        if (pollJson?.completed && Array.isArray(images) && images[0]?.url) {
            return images[0].url;
        }
    }
    throw new Error("Timeout polling");
}

// ─── MODULE EXPORT ────────────────────────────────────────────────────────────

module.exports = {
    name:     "Nanana Image Editor",
    desc:     "Edit gambar dengan AI prompt pakai nanana.app — auto login tempmail.",
    category: "AI Tools",
    params:   ["url", "prompt"],

    async run(req, res) {
        try {
            const { url, prompt } = req.query;

            if (!url || !/^https?:\/\/.+/i.test(url))
                return res.status(400).json({ status: false, error: 'Parameter "url" (link gambar) wajib diisi!' });

            if (!prompt)
                return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi!' });

            const outputUrl = await nananaI2I(url, prompt);

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
