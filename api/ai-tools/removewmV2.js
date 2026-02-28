const axios    = require("axios");
const FormData = require("form-data");
const fs       = require("fs");
const path     = require("path");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         REMOVE WATERMARK — unwatermark.ai                   ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  USAGE CLI:                                                  ║
 * ║  node unwatermark.js "https://example.com/foto.jpg"          ║
 * ║  node unwatermark.js foto.jpg                                ║
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
    "product-code":       "067003",
    "product-serial":     "vymakd",
    "sec-ch-ua":          '"Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":   "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest":     "empty",
    "sec-fetch-mode":     "cors",
    "sec-fetch-site":     "same-site",
    "Referer":            "https://unwatermark.ai/",
};

// ─── GET IMAGE BUFFER ─────────────────────────────────────────────────────────

async function getImageBuffer(input) {
    if (/^https?:\/\//i.test(input)) {
        const res = await axios.get(input, { responseType: "arraybuffer" });
        const ext = input.split(".").pop().split("?")[0].toLowerCase() || "jpg";
        return { buffer: Buffer.from(res.data), fileName: `image.${ext}` };
    } else {
        return { buffer: fs.readFileSync(input), fileName: path.basename(input) };
    }
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function removeWatermark(input, options = {}) {
    const { buffer, fileName } = await getImageBuffer(input);
    const { proxy } = options;

    const form = new FormData();
    form.append("original_image_file", buffer, { filename: fileName, contentType: "image/jpeg" });

    const axiosConfig = {
        headers: { ...form.getHeaders(), ...BASE_HEADERS },
        maxBodyLength: Infinity,
    };

    if (proxy) {
        const { HttpsProxyAgent } = require("https-proxy-agent");
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxy);
        console.log(`[unwatermark] Using proxy: ${proxy}`);
    }

    const { data } = await axios.post(
        "https://api.unwatermark.ai/api/web/v1/image-auto-watermark-remove-front/create-job",
        form,
        axiosConfig
    );

    if (!data?.result?.output_image_url) throw new Error("Gagal: " + JSON.stringify(data));

    return {
        output_url:  data.result.output_image_url,
        input_url:   data.result.input_image_url,
        job_id:      data.result.job_id,
        free_left:   data.result.remaining_free_times,
    };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, input] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node unwatermark.js "https://example.com/foto.jpg"');
        console.log("  node unwatermark.js foto.jpg");
        process.exit(1);
    }

    removeWatermark(input)
        .then(r  => console.log("✅ Result:", JSON.stringify(r, null, 2)))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });

} else {
    module.exports = {
        name:     "Remove Watermark V2",
        desc:     "Hapus watermark dari gambar via unwatermark.ai — gratis tanpa login.",
        category: "AI TOOLS",
        params:   ["url"],
        removeWatermark,

        async run(req, res) {
            const { url } = req.query;
            if (!url) return res.status(400).json({
                status: false,
                error:  'Parameter "url" wajib diisi!'
            });

            try {
                const result = await removeWatermark(url);
                return res.status(200).json({
                    status:  true,
                    creator: "Shannz x Xena",
                    result
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
