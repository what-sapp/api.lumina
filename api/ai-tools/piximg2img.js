module.exports = {
    name: "PixWithImg2Img",
    desc: "Transform gambar dengan AI - image to image menggunakan Flux.",
    category: "AI TOOLS",
    params: ["image", "prompt"],

    TOKEN: "2d27429c20f2ac52625f95182b8f0f861",

    _headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
        "content-type": "application/json",
        "origin": "https://pixwith.ai",
        "referer": "https://pixwith.ai/",
        "accept-language": "id-ID,id;q=0.9"
    },

    genmd5() {
        let s = "";
        for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
        return s;
    },

    async run(req, res) {
        const image = req.query.image;
        const prompt = req.query.prompt || "transform this image";
        if (!image) return res.status(400).json({ status: false, error: "Parameter 'image' diperlukan." });

        const BASE = "https://api.pixwith.ai";
        const h = { ...this._headers, "x-session-token": this.TOKEN };

        try {
            // Step 1: Download image
            const imgRes = await fetch(image);
            if (!imgRes.ok) throw new Error("Gagal download gambar");
            const imgBuffer = await imgRes.arrayBuffer();

            // Step 2: Get S3 presigned URL
            const filename = this.genmd5() + ".jpg";
            const preRes = await fetch(`${BASE}/api/chats/pre_url`, {
                method: "POST", headers: h,
                body: JSON.stringify({ image_name: filename, content_type: "image/jpeg" })
            });
            const preData = await preRes.json();
            const uploadData = preData.data?.url;
            if (!uploadData) throw new Error("Gagal get upload URL");

            // Step 3: Upload ke S3 multipart
            const form = new FormData();
            Object.entries(uploadData.fields).forEach(([k, v]) => form.append(k, v));
            form.append("file", new Blob([imgBuffer], { type: "image/jpeg" }), filename);
            const s3Res = await fetch(uploadData.url, { method: "POST", body: form });
            if (s3Res.status !== 204) throw new Error("Upload S3 gagal: " + s3Res.status);

            const imageKey = uploadData.fields.key;

            // Step 4: Create task
            await fetch(`${BASE}/api/items/create`, {
                method: "POST", headers: h,
                body: JSON.stringify({
                    images: { image1: imageKey },
                    prompt,
                    options: { prompt_optimization: true, num_outputs: 1, aspect_ratio: "0" },
                    model_id: "1-0"
                })
            });

            // Step 5: Poll history tool_type=1
            let result = null;
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const histRes = await fetch(`${BASE}/api/items/history`, {
                    method: "POST", headers: h,
                    body: JSON.stringify({ tool_type: "1", tag: "", page: 0, page_size: 1 })
                });
                const histData = await histRes.json();
                const item = histData.data?.items?.[0];
                if (item && item.status === 2) {
                    const output = item.result_urls?.find(u => !u.is_input);
                    if (output) { result = { item, url: output.hd }; break; }
                }
            }
            if (!result) throw new Error("Timeout waiting for result");

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    prompt: result.item.prompt,
                    model: result.item.model_name,
                    image: result.url
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
