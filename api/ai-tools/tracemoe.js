module.exports = {
    name: "TraceMoe",
    desc: "Cari sumber anime dari screenshot/gambar menggunakan trace.moe.",
    category: "Anime",
    method: "POST",
    params: ["image"],
    paramsSchema: {
        image: { type: "file", label: "Screenshot Anime", required: true }
    },

    async run(req, res) {
        const file = req.file;
        if (!file) return res.status(400).json({ status: false, error: "File image diperlukan." });

        try {
            const form = new FormData();
            form.append("image", new Blob([file.buffer], { type: file.mimetype }), file.originalname || "image.png");

            const r    = await fetch("https://api.trace.moe/search?anilistInfo=2&cutBorders", { method: "POST", body: form });
            const data = await r.json();

            if (!data.result?.length) throw new Error("Tidak ada hasil ditemukan.");

            const top = data.result[0];
            const ani = top.anilist;

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    similarity:   (top.similarity * 100).toFixed(2) + "%",
                    episode:      top.episode,
                    timestamp:    top.at,
                    title: {
                        romaji:  ani.title?.romaji,
                        english: ani.title?.english,
                        native:  ani.title?.native
                    },
                    format:       ani.format,
                    status:       ani.status,
                    genres:       ani.genres,
                    cover:        ani.coverImage?.extraLarge,
                    banner:       ani.bannerImage,
                    anilist_url:  ani.siteUrl,
                    preview: {
                        image: top.image,
                        video: top.video
                    }
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
