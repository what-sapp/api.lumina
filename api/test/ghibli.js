const https = require("https");
const http = require("http");

/**
 * GHIBLI CONVERTER - Fitur ke-117
 * Engine: GPT-Image-1 (Ghibli Style)
 * Creator: Shannz x Xena
 */

async function convertGhibli(imageUrl) {
    // 1. Download & Convert ke Base64 (Ghibli API butuh Base64)
    const response = await fetch(imageUrl);
    const buf = Buffer.from(await response.arrayBuffer());
    const mime = response.headers.get("content-type") || "image/jpeg";
    const imgData = `data:${mime};base64,${buf.toString("base64")}`;

    const payload = JSON.stringify({
        image: imgData,
        model: "gpt-image-1",
        n: 1,
        prompt: "Transform this image into beautiful Studio Ghibli anime style artwork",
        quality: "low",
        size: "1024x1024"
    });

    // 2. Tembak Proxy Netlify
    const res = await fetch("https://ghibli-proxy.netlify.app/.netlify/functions/ghibli-proxy", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "origin": "https://overchat.ai",
            "referer": "https://overchat.ai/",
            "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B)..."
        },
        body: payload
    }).then(r => r.json());

    if (!res?.success || !res?.data?.[0]?.b64_json) throw new Error("Gagal konversi Ghibli.");

    return Buffer.from(res.data[0].b64_json, "base64");
}

module.exports = {
    name: "Ghibli",
    desc: "Ubah foto apa saja menjadi style anime Studio Ghibli.",
    category: "TEST",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, creator: "Xena", error: "Link fotonya mana?" });

        try {
            const resultBuffer = await convertGhibli(url);
            res.set("Content-Type", "image/png");
            res.status(200).send(resultBuffer);
        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: err.message });
        }
    }
};
