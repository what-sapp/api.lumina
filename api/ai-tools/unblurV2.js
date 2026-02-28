const axios    = require("axios");
const FormData = require("form-data");
const fs       = require("fs");
const path     = require("path");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           UNBLUR IMAGE — unblurimage.ai                     ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
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

const PRODUCT_SERIAL = "2af2315faaacc1785282767cdaa29e80";

const BASE_HEADERS = {
    "accept":             "*/*",
    "accept-language":    "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "authorization":      "",
    "product-serial":     PRODUCT_SERIAL,
    "sec-ch-ua":          '"Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":   "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest":     "empty",
    "sec-fetch-mode":     "cors",
    "sec-fetch-site":     "same-site",
    "Referer":            "https://unblurimage.ai/",
};

async function getImageBuffer(input) {
    if (/^https?:\/\//i.test(input)) {
        const res = await axios.get(input, { responseType: "arraybuffer" });
        const ext = input.split(".").pop().split("?")[0].toLowerCase() || "jpg";
        return { buffer: Buffer.from(res.data), fileName: `image.${ext}` };
    } else {
        return { buffer: fs.readFileSync(input), fileName: path.basename(input) };
    }
}

async function unblur(input) {
    const { buffer, fileName } = await getImageBuffer(input);

    const form = new FormData();
    form.append("original_image_file", buffer, { filename: fileName, contentType: "image/jpeg" });

    console.log(`[unblur] Uploading: ${fileName}...`);
    const { data: job } = await axios.post(
        "https://api.unblurimage.ai/api/imgupscaler/v2/ai-image-unblur/create-job",
        form,
        { headers: { ...form.getHeaders(), ...BASE_HEADERS }, maxBodyLength: Infinity }
    );

    if (!job?.result?.job_id) throw new Error("Gagal create job: " + JSON.stringify(job));
    const jobId = job.result.job_id;
    console.log(`[unblur] Job ID: ${jobId}`);
    console.log(`[unblur] Processing...`);

    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const { data: result } = await axios.get(
            `https://api.unblurimage.ai/api/imgupscaler/v2/ai-image-unblur/get-job/${jobId}`,
            { headers: BASE_HEADERS }
        );
        if (result?.result?.output_url?.length) {
            return {
                output_url: result.result.output_url[0],
                input_url:  result.result.input_url,
                job_id:     jobId,
            };
        }
    }

    throw new Error("Timeout: job tidak selesai dalam 60 detik");
}

if (require.main === module) {
    const [,, input] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node unblur.js "https://example.com/foto.jpg"');
        console.log("  node unblur.js foto.jpg");
        process.exit(1);
    }
    unblur(input)
        .then(r  => console.log("✅ Result:", JSON.stringify(r, null, 2)))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Unblur Image V2",
        desc:     "Perjelas/unblur gambar via unblurimage.ai — gratis tanpa login.",
        category: "AI TOOLS",
        params:   ["url"],
        unblur,
        async run(req, res) {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" wajib diisi!' });
            try {
                const result = await unblur(url);
                return res.status(200).json({ status: true, creator: "Shannz x Xena", result });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
