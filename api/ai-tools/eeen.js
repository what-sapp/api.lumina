const https = require("https");
const fs    = require("fs");

/**
 * NANANA.APP — TEXT TO IMAGE
 * Status: PERFECT CODE - Fitur ke-90 (Legenraid Edition)
 * Creator: Shannz x Xena (Original Scraper Logic)
 * Note: Stabil dengan session cookie & fingerprinting.
 */
module.exports = {
    name: "Nanana Text2Img waduh",
    desc: "Generate gambar dari teks pakai nanana.app.",
    category: "AI Image",
    params: ["prompt"],

    async run(req, res) {
        const prompt = req.query.prompt || req.query.text;
        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' harus diisi!" });

        // --- CONFIG ASLI DARI SCRAPER KAMU (Sangat Krusial) ---
        const COOKIE  = `_ga=GA1.1.1536459666.1771962401; __Secure-better-auth.session_token=WpvxpadaSiPqKYUW9id2yOpL61cjsbpA.l0Rwyvc9x%2BrKz52DwFPRVyf31wJMOiZ61UtGMnO5%2BbQ%3D`;
        const FP_ID   = "YTFjMmEyNjU4MGQxNjU1ZThmM2I1MjMzNTlmZDkwMmMuZTMxZjE5OTNhNzQ4ZDI2ZGM3NTcxZDU0MTk3YTc3OWNjMTdlNDEzN2I4MWE1OGJlMmI2ZGNmZDQ2MWQ4MWNkZA";

        const BASE_HEADERS = {
            "accept": "*/*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
            "x-fp-id": FP_ID,
            "cookie": COOKIE,
            "Referer": "https://nanana.app/en/create",
        };

        // --- HELPER FUNCTIONS (ORIGINAL LOGIC) ---
        const httpsRequest = (options, body) => {
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
        };

        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        try {
            // STEP 1: GENERATE
            const bodyGen = JSON.stringify({ prompt });
            const resGen = await httpsRequest({
                hostname: "nanana.app",
                path: "/api/text-to-image",
                method: "POST",
                headers: { ...BASE_HEADERS, "content-length": Buffer.byteLength(bodyGen) }
            }, bodyGen);

            const jsonGen = JSON.parse(resGen.body);
            if (!jsonGen?.success) throw new Error("Generate gagal: " + resGen.body);
            const requestId = jsonGen.request_id;

            // STEP 2: POLL
            let outputUrl = null;
            const bodyPoll = JSON.stringify({ requestId, type: "text-to-image" });

            for (let i = 1; i <= 30; i++) {
                await sleep(3000);
                const resPoll = await httpsRequest({
                    hostname: "nanana.app",
                    path: "/api/get-result",
                    method: "POST",
                    headers: { ...BASE_HEADERS, "content-length": Buffer.byteLength(bodyPoll) }
                }, bodyPoll);

                const jsonPoll = JSON.parse(resPoll.body);
                if (jsonPoll?.completed && jsonPoll?.data?.images?.[0]?.url) {
                    outputUrl = jsonPoll.data.images[0].url;
                    break;
                }
            }

            if (!outputUrl) throw new Error("Timeout polling");

            res.status(200).json({
                status: true,
                creator: "Shannz x Xena",
                result: {
                    prompt: prompt,
                    output_url: outputUrl
                }
            });

        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
