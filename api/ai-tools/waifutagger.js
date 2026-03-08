module.exports = {
    name: "WaifuTagger",
    desc: "Detect tags karakter anime dari gambar menggunakan WD Tagger.",
    category: "AI Tools",
    params: ["image", "_model"],
    paramsSchema: {
        image: { type: "text", label: "Image URL", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "SmilingWolf/wd-swinv2-tagger-v3",
            options: [
                { label: "WD SwinV2 Tagger V3",          value: "SmilingWolf/wd-swinv2-tagger-v3" },
                { label: "WD EVA02 Large Tagger V3",      value: "SmilingWolf/wd-eva02-large-tagger-v3" },
                { label: "WD ViT Large Tagger V3",        value: "SmilingWolf/wd-vit-large-tagger-v3" },
                { label: "WD ViT Tagger V3",              value: "SmilingWolf/wd-vit-tagger-v3" },
                { label: "WD ConvNext Tagger V3",         value: "SmilingWolf/wd-convnext-tagger-v3" },
                { label: "WD V1.4 MOAT Tagger V2",       value: "SmilingWolf/wd-v1-4-moat-tagger-v2" },
                { label: "WD V1.4 SwinV2 Tagger V2",     value: "SmilingWolf/wd-v1-4-swinv2-tagger-v2" },
                { label: "WD V1.4 ConvNext Tagger V2",   value: "SmilingWolf/wd-v1-4-convnext-tagger-v2" },
                { label: "WD V1.4 ConvNextV2 Tagger V2", value: "SmilingWolf/wd-v1-4-convnextv2-tagger-v2" },
                { label: "WD V1.4 ViT Tagger V2",        value: "SmilingWolf/wd-v1-4-vit-tagger-v2" },
                { label: "IdolSankaku EVA02 Large V1",   value: "deepghs/idolsankaku-eva02-large-tagger-v1" },
                { label: "IdolSankaku SwinV2 V1",        value: "deepghs/idolsankaku-swinv2-tagger-v1" }
            ]
        }
    },

    KANDANG_WAIFU: "https://smilingwolf-wd-tagger.hf.space/gradio_api",

    DAFTAR_WAIFU: [
        "SmilingWolf/wd-swinv2-tagger-v3",
        "SmilingWolf/wd-eva02-large-tagger-v3",
        "SmilingWolf/wd-vit-large-tagger-v3",
        "SmilingWolf/wd-vit-tagger-v3",
        "SmilingWolf/wd-convnext-tagger-v3",
        "SmilingWolf/wd-v1-4-moat-tagger-v2",
        "SmilingWolf/wd-v1-4-swinv2-tagger-v2",
        "SmilingWolf/wd-v1-4-convnext-tagger-v2",
        "SmilingWolf/wd-v1-4-convnextv2-tagger-v2",
        "SmilingWolf/wd-v1-4-vit-tagger-v2",
        "deepghs/idolsankaku-eva02-large-tagger-v1",
        "deepghs/idolsankaku-swinv2-tagger-v1"
    ],

    formatMarkdown(data) {
        const prompt     = data[0] || "";
        const ratings    = data[1]?.confidences || [];
        const character  = data[2] || {};
        const tags       = data[3] || {};

        const pct = (v) => (v * 100).toFixed(1) + "%";

        // Rating section
        const ratingLines = ratings.map(r =>
            `| ${r.label} | ${pct(r.confidence)} |`
        ).join("\n");

        // Character section
        const charLines = (character.confidences || []).slice(0, 5).map(c =>
            `| ${c.label} | ${pct(c.confidence)} |`
        ).join("\n");

        // Tags section — top 10
        const tagLines = (tags.confidences || []).slice(0, 10).map(t =>
            `| ${t.label} | ${pct(t.confidence)} |`
        ).join("\n");

        return [
            `## 🎨 Prompt\n\`\`\`\n${prompt}\n\`\`\``,

            `## ⭐ Rating\n| Label | Confidence |\n|---|---|\n${ratingLines}`,

            character.label
                ? `## 👤 Character\n**${character.label}**\n\n| Name | Confidence |\n|---|---|\n${charLines}`
                : `## 👤 Character\n*No character detected*`,

            tags.label
                ? `## 🏷️ Tags (Top 10)\n**${tags.label}**\n\n| Tag | Confidence |\n|---|---|\n${tagLines}`
                : `## 🏷️ Tags\n*No tags detected*`
        ].join("\n\n");
    },

    async run(req, res) {
        const imageUrl     = req.query.image;
        const modelPilihan = req.query.model || "SmilingWolf/wd-swinv2-tagger-v3";

        if (!imageUrl) return res.status(400).json({ status: false, error: "Parameter 'image' diperlukan." });
        if (!this.DAFTAR_WAIFU.includes(modelPilihan)) return res.status(400).json({ status: false, error: "Model tidak valid." });

        try {
            const gambarRes = await fetch(imageUrl);
            if (!gambarRes.ok) throw new Error("Gagal download gambar");
            const gambarBuffer = Buffer.from(await gambarRes.arrayBuffer());
            const namaFile = "waifu_" + Date.now() + ".jpg";

            const uploadId = Math.random().toString(36).substring(2);
            const formData = new FormData();
            formData.append("files", new Blob([gambarBuffer], { type: "image/jpeg" }), namaFile);

            const uploadRes = await fetch(this.KANDANG_WAIFU + "/upload?upload_id=" + uploadId, {
                method: "POST",
                body: formData
            });
            const uploadData = await uploadRes.json();
            const filePath = uploadData[0];

            const sesiNgawur = Math.random().toString(36).substring(2);
            await fetch(this.KANDANG_WAIFU + "/queue/join", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    data: [{
                        path: filePath,
                        url: "https://smilingwolf-wd-tagger.hf.space/gradio_api/file=" + filePath,
                        orig_name: namaFile,
                        size: gambarBuffer.length,
                        mime_type: "image/jpeg",
                        meta: { _type: "gradio.FileData" }
                    }, modelPilihan, 0.35, false, 0.85, false],
                    event_data: null,
                    fn_index: 2,
                    trigger_id: 18,
                    session_hash: sesiNgawur
                })
            });

            const hasilNyokot = await fetch(this.KANDANG_WAIFU + "/queue/data?session_hash=" + sesiNgawur, {
                headers: { "accept": "text/event-stream" }
            });
            const teksGeje = await hasilNyokot.text();

            let dataMisterius = null;
            for (const barisAneh of teksGeje.split("\n\n")) {
                if (!barisAneh.startsWith("data:")) continue;
                try {
                    const isiRahasia = JSON.parse(barisAneh.substring(5).trim());
                    if (isiRahasia.msg === "process_completed") {
                        dataMisterius = isiRahasia.output.data;
                    }
                } catch (e) {}
            }

            if (!dataMisterius) throw new Error("Timeout atau gagal mendapatkan hasil");

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    markdown: this.formatMarkdown(dataMisterius),
                    prompt: dataMisterius[0],
                    rating: dataMisterius[1]?.confidences,
                    character: {
                        name: dataMisterius[2]?.label,
                        confidences: dataMisterius[2]?.confidences
                    },
                    tags: {
                        name: dataMisterius[3]?.label,
                        confidences: dataMisterius[3]?.confidences
                    }
                }
            });
        } catch (errorNyasar) {
            res.status(500).json({ status: false, error: errorNyasar.message });
        }
    }
};

