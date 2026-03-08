module.exports = {
    name: "PhotoToAnime",
    desc: "Convert foto ke style anime menggunakan imgupscaler.ai (Flux Kontext).",
    category: "AI Tools",
    method: "POST",
    params: ["image", "_style", "_prompt"],
    paramsSchema: {
        image: { type: "file", label: "Image", required: true },
        _style: {
            type: "select",
            label: "Style",
            required: false,
            default: "modern",
            options: [
                { label: "Modern Anime",   value: "modern" },
                { label: "Studio Ghibli",  value: "ghibli" },
                { label: "Anime Basic",    value: "basic" },
                { label: "Anime Karakter", value: "karakter" }
            ]
        },
        _prompt: { type: "text", label: "Custom Prompt", required: false }
    },

    GUDANG_GAMBAR: "https://api.imgupscaler.ai/api/common/upload/upload-image",
    PABRIK_ANIME: "https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job",
    SERIAL_RAHASIA: "5846a1bc-a228-4a53-bce2-33fc51444268",

    GAYA_ANIME: {
        basic: "Transform this photo into anime style art, maintain facial features, vibrant colors, clean linework, professional anime illustration",
        ghibli: "Convert to Studio Ghibli anime style, soft watercolor aesthetic, dreamy atmosphere, keep recognizable features, hand-drawn quality",
        modern: "Transform into modern anime style, sharp details, dynamic shading, vibrant color palette, high-quality digital art",
        karakter: "Turn into anime character design, exaggerated expressions, distinctive hairstyle, expressive eyes, manga-style illustration"
    },

    async run(req, res) {
        const file         = req.file;
        const styleKu      = req.query.style || req.body?.style || "modern";
        const promptKustom = req.query.prompt || req.body?.prompt || this.GAYA_ANIME[styleKu] || this.GAYA_ANIME.modern;

        if (!file) return res.status(400).json({ status: false, error: "File image diperlukan." });
        if (req.query.style && !this.GAYA_ANIME[styleKu]) {
            return res.status(400).json({ status: false, error: "Style tidak valid. Pilihan: " + Object.keys(this.GAYA_ANIME).join(", ") });
        }

        try {
            const gambarBuffer  = file.buffer;
            const namaFileNgaco = Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2) + ".png";

            // Step 1: Minta pre-signed URL
            const formUpload = new FormData();
            formUpload.append("file_name", namaFileNgaco);
            const resPreSign = await fetch(this.GUDANG_GAMBAR, {
                method: "POST",
                headers: { "referer": "https://imgupscaler.ai/" },
                body: formUpload
            });
            const dataPreSign = await resPreSign.json();
            if (dataPreSign.code !== 100000) throw new Error("Gagal dapat pre-signed URL");

            const ossUrl     = dataPreSign.result.url;
            const objectName = dataPreSign.result.object_name;
            const publicUrl  = "https://pbs0.iuimg.com/" + objectName;

            // Step 2: Upload ke Aliyun OSS
            const resOss = await fetch(ossUrl, {
                method: "PUT",
                headers: { "content-type": "image/png", "referer": "https://imgupscaler.ai/" },
                body: gambarBuffer
            });
            if (!resOss.ok) throw new Error("Gagal upload ke OSS: " + resOss.status);

            // Step 3: Create job
            const formJob = new FormData();
            formJob.append("model_name", "flux_kontext");
            formJob.append("prompt", promptKustom);
            formJob.append("ratio", "match_input_image");
            formJob.append("output_format", "jpg");
            formJob.append("original_image_url", publicUrl);

            const resJob = await fetch(this.PABRIK_ANIME, {
                method: "POST",
                headers: {
                    "authorization": "",
                    "product-code": "magiceraser",
                    "product-serial": this.SERIAL_RAHASIA,
                    "timezone": "Asia/Jakarta",
                    "referer": "https://imgupscaler.ai/"
                },
                body: formJob
            });
            const dataJob = await resJob.json();
            if (dataJob.code !== 100000) throw new Error("Gagal create job: " + JSON.stringify(dataJob));

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    style:      styleKu,
                    output_url: dataJob.result.output_url[0],
                    job_id:     dataJob.result.job_id
                }
            });
        } catch (salahMulu) {
            res.status(500).json({ status: false, error: salahMulu.message });
        }
    }
};
