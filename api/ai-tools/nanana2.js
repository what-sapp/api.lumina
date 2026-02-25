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
        const opts   = {
            hostname: parsed.hostname,
            path:     parsed.pathname + parsed.search,
            method:   options.method || "GET",
            headers:  options.headers || {},
        };

        const req = proto.request(opts, (res) => {
            let data = "";
            res.on("data", d => data += d.toString());
            res.on("end", () => resolve({
                status:  res.statusCode,
                headers: res.headers,
                body:    data,
                json:    () => JSON.parse(data),
            }));
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

const BASE_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "origin":          "https://nanana.app",
    "referer":         "https://nanana.app/en",
};

// ─── TEMPMAIL (sama persis ori) ───────────────────────────────────────────────

async function getInbox(username) {
    const res  = await request(`https://akunlama.com/api/v1/mail/list?recipient=${username}`);
    const data = res.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map(item => ({ region: item.storage.region, key: item.storage.key }));
}

async function getOTP(region, key) {
    const res     = await request(`https://akunlama.com/api/v1/mail/getHtml?region=${region}&key=${key}`);
    const matches = res.body.match(/\b\d{6}\b/g);
    return matches ? matches[0] : null;
}

// ─── AUTH (sama persis ori) ───────────────────────────────────────────────────

async function getAuth() {
    const username = crypto.randomBytes(6).toString("hex");
    const email    = `${username}@akunlama.com`;
    console.log(`[auth] Tempmail: ${email}`);

    const sendRes = await request(
        "https://nanana.app/api/auth/email-otp/send-verification-otp",
        { method: "POST", headers: { ...BASE_HEADERS, "Content-Type": "application/json" } },
        { email, type: "sign-in" }
    );
    console.log(`[auth] OTP sent: ${sendRes.status}`);
    if (sendRes.status !== 200) throw new Error("Gagal kirim OTP: " + sendRes.body);

    let otp = null, attempt = 0;
    console.log("[auth] Menunggu OTP...");
    while (!otp) {
        await sleep(3000);
        const mails = await getInbox(username);
        if (mails.length > 0) otp = await getOTP(mails[0].region, mails[0].key);
        process.stdout.write(`\r[auth] Attempt ${++attempt}...`);
        if (attempt > 20) throw new Error("OTP timeout");
    }
    console.log(`\n[auth] OTP: ${otp}`);

    const signRes = await request(
        "https://nanana.app/api/auth/sign-in/email-otp",
        { method: "POST", headers: { ...BASE_HEADERS, "Content-Type": "application/json" } },
        { email, otp }
    );
    console.log(`[auth] Login: ${signRes.status}`);
    if (signRes.status !== 200) throw new Error("Login gagal: " + signRes.body);

    const setCookie = signRes.headers["set-cookie"] || [];
    const cookieStr = setCookie.map(c => c.split(";")[0]).join("; ");
    console.log(`[auth] Login sukses!`);

    return { ...BASE_HEADERS, "Cookie": cookieStr, "x-fp-id": genFpId() };
}

// ─── UPLOAD (url → buffer, ganti fs.readFileSync) ────────────────────────────

async function uploadImage(imgUrl, authHeaders) {
    const fileBuffer = await urlToBuffer(imgUrl);
    const fileName   = "image.jpg";
    const boundary   = "----FormBoundary" + crypto.randomBytes(8).toString("hex");
    const partH      = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`);
    const partF      = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body       = Buffer.concat([partH, fileBuffer, partF]);

    console.log(`\n[upload] ${(fileBuffer.length/1024).toFixed(1)} KB...`);

    const res  = await request(
        "https://nanana.app/api/upload-img",
        { method: "POST", headers: { ...authHeaders, "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length } },
        body
    );
    console.log(`[upload] Status: ${res.status}`);
    const json = res.json();
    if (!json?.url) throw new Error("Upload gagal: " + res.body);
    console.log(`[upload] OK: ${json.url}`);
    return json.url;
}

// ─── JOB (sama persis ori) ────────────────────────────────────────────────────

async function createJob(imgUrl, prompt, authHeaders) {
    console.log(`\n[job] Prompt: "${prompt}"`);
    const res  = await request(
        "https://nanana.app/api/image-to-image",
        { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" } },
        { prompt, image_urls: [imgUrl] }
    );
    console.log(`[job] Status: ${res.status}`);
    const json = res.json();
    if (!json?.request_id) throw new Error("Job gagal: " + res.body);
    console.log(`[job] ID: ${json.request_id}`);
    return json.request_id;
}

async function pollJob(jobId, authHeaders, maxRetry = 30) {
    console.log(`\n[poll] Polling...`);
    for (let i = 1; i <= maxRetry; i++) {
        await sleep(5000);
        const res    = await request(
            "https://nanana.app/api/get-result",
            { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" } },
            { requestId: jobId, type: "image-to-image" }
        );
        const json   = res.json();
        const images = json?.data?.images;
        console.log(`      [${i}/${maxRetry}] completed: ${json?.completed}`);
        if (json?.completed && Array.isArray(images) && images[0]?.url) {
            console.log(`      Output: ${images[0].url}`);
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

            const authHeaders = await getAuth();
            const uploadUrl   = await uploadImage(url, authHeaders);
            const jobId       = await createJob(uploadUrl, prompt, authHeaders);
            const outputUrl   = await pollJob(jobId, authHeaders);

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
