const axios    = require("axios");
const FormData = require("form-data");
const fs       = require("fs");
const path     = require("path");

const PRODUCT_SERIAL = "176ab2b1-0e29-4c5f-a131-132eee8d94e8";

const HEADERS = {
    "accept":          "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "user-agent":      "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getUploadUrl(filename) {
    const form = new FormData();
    form.append("file_name", filename);

    const { data } = await axios.post(
        "https://api.imgupscaler.ai/api/common/upload/upload-image",
        form,
        {
            headers: {
                ...form.getHeaders(),
                ...HEADERS,
                "origin":  "https://magiceraser.org",
                "referer": "https://magiceraser.org/",
            }
        }
    );

    if (data?.code !== 100000) throw new Error("Get upload URL gagal: " + JSON.stringify(data));
    return { uploadUrl: data.result.url, objectName: data.result.object_name };
}

async function uploadToOSS(uploadUrl, buffer) {
    await axios.put(uploadUrl, buffer, {
        headers: {
            "content-type":   "image/png",
            "content-length": buffer.length,
            "origin":         "https://magiceraser.org",
            "referer":        "https://magiceraser.org/",
            ...HEADERS,
        },
        maxBodyLength: Infinity,
    });
}

async function createJob(buffer, filename) {
    const form = new FormData();
    form.append("original_image_file", buffer, { filename, contentType: "image/png" });
    form.append("object_type", "mark");
    form.append("target_pixel", "1");

    const { data } = await axios.post(
        "https://api.magiceraser.org/api/magiceraser/v1/auto-remove-object/create-job",
        form,
        {
            headers: {
                ...form.getHeaders(),
                ...HEADERS,
                "authorization":  "",
                "product-code":   "magiceraser",
                "product-serial": PRODUCT_SERIAL,
                "origin":         "https://magiceraser.org",
                "referer":        "https://magiceraser.org/",
            },
            maxBodyLength: Infinity,
        }
    );

    if (data?.code !== 100000) throw new Error("Create job gagal: " + JSON.stringify(data));
    return data.result.job_id;
}

async function pollJob(jobId, maxTry = 30, interval = 3000) {
    for (let i = 0; i < maxTry; i++) {
        const { data } = await axios.get(
            `https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`,
            {
                headers: {
                    ...HEADERS,
                    "product-serial": PRODUCT_SERIAL,
                    "referer":        "https://magiceraser.org/",
                }
            }
        );

        if (data?.code === 100000 && data?.result?.output_url?.length) {
            return data.result.output_url[0];
        }

        console.log(`[magiceraser] Polling ${i + 1}/${maxTry}...`);
        await sleep(interval);
    }
    throw new Error("Timeout polling");
}

async function removeLogo(imageInput) {
    let buffer, filename;

    if (typeof imageInput === "string") {
        buffer   = fs.readFileSync(imageInput);
        filename = path.basename(imageInput);
    } else if (Buffer.isBuffer(imageInput)) {
        buffer   = imageInput;
        filename = "image.png";
    } else {
        throw new Error("imageInput harus path string atau Buffer");
    }

    console.log(`[magiceraser] Getting upload URL...`);
    const { uploadUrl } = await getUploadUrl(filename);

    console.log(`[magiceraser] Uploading to OSS...`);
    await uploadToOSS(uploadUrl, buffer);

    console.log(`[magiceraser] Creating job...`);
    const jobId = await createJob(buffer, filename);
    console.log(`[magiceraser] Job ID: ${jobId}`);

    console.log(`[magiceraser] Polling result...`);
    const outputUrl = await pollJob(jobId);

    return { jobId, url: outputUrl };
}

if (require.main === module) {
    const [,, imgPath, outPath] = process.argv;
    if (!imgPath) {
        console.log("Usage: node magiceraser.js <image> [output]");
        process.exit(1);
    }

    removeLogo(imgPath).then(async r => {
        const ext    = path.extname(imgPath);
        const base   = path.basename(imgPath, ext);
        const output = outPath || `${base}_removed${ext}`;
        const img    = (await axios.get(r.url, { responseType: "arraybuffer" })).data;
        fs.writeFileSync(output, img);
        console.log(`✅ Saved: ${output}`);
        console.log(`🔗 URL: ${r.url}`);
    }).catch(e => { console.error("❌", e.message); process.exit(1); });

} else {
    module.exports = {
        name:     "Logo Remover",
        desc:     "Hapus logo/objek dari gambar.",
        category: "AI TOOLS",
        params:   ["url"],
        removeLogo,

        async run(req, res) {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" wajib!' });
            try {
                const resp   = await axios.get(url, { responseType: "arraybuffer" });
                const result = await removeLogo(Buffer.from(resp.data));
                return res.status(200).json({ status: true, result });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}

