const https  = require("https");

/**
 * FLATAI.ORG IMAGE GENERATOR
 * Status: GOD MODE - Fitur ke-97
 * Creator: Xena (Solo Project)
 * Features: Multi-Style, Multi-Ratio, Seed Control
 */
module.exports = {
    name: "Flatai Image",
    desc: "Generate gambar AI gratis tanpa login via flatai.org.",
    category: "AI Image",
    params: ["prompt", "style", "ratio"],

    async run(req, res) {
        const prompt      = req.query.prompt || req.query.text;
        const styleModel  = req.query.style  || "ghibli-style";
        const aspectRatio = req.query.ratio  || "1:1";

        if (!prompt) {
            return res.status(400).json({ 
                status: false, 
                creator: "Xena", 
                error: "Parameter 'prompt' jangan dikosongin, Senior!" 
            });
        }

        try {
            // --- CONFIG DARIPADA INFINIX X6833B ---
            const NONCE  = "b8bc988a5c";
            const COOKIE = "mg_track_id=998234cf4ba9fde6921d55b7a9a74557";
            const seed   = Math.floor(Math.random() * 1000000000);

            const body = new URLSearchParams({
                action: "ai_generate_image",
                nonce: NONCE,
                prompt: prompt,
                aspect_ratio: aspectRatio,
                seed: String(seed),
                style_model: styleModel,
            }).toString();

            const options = {
                hostname: "flatai.org",
                path: "/wp-admin/admin-ajax.php",
                method: "POST",
                headers: {
                    "accept": "*/*",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "content-length": Buffer.byteLength(body),
                    "cookie": COOKIE,
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://flatai.org/ai-image-generator-free-no-signup/",
                }
            };

            const result = await new Promise((resolve, reject) => {
                const request = https.request(options, (response) => {
                    let data = "";
                    response.on("data", d => data += d.toString());
                    response.on("end", () => {
                        try {
                            const json = JSON.parse(data);
                            if (json.success && json.data?.images?.[0]) {
                                resolve(json.data);
                            } else {
                                reject(new Error(data));
                            }
                        } catch (e) { reject(new Error("Format response hancur!")); }
                    });
                });
                request.on("error", reject);
                request.write(body);
                request.end();
            });

            return res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    url: result.images[0],
                    seed: result.seed,
                    prompt: result.prompt,
                    style: styleModel,
                    ratio: aspectRatio
                }
            });

        } catch (e) {
            return res.status(500).json({ 
                status: false, 
                creator: "Xena", 
                error: e.message 
            });
        }
    }
};
