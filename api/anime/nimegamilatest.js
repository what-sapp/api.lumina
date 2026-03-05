const axios = require("axios");

/**
 * NIMEGAMI LATEST
 * Creator: Shannz x Xena
 */

const BASE = "https://nimegami.id";
const UA   = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";
const ax   = axios.create({ headers: { "user-agent": UA }, decompress: true, timeout: 15000 });

async function get(url) {
    const res = await ax.get(url);
    return res.data;
}

function cleanResult(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => {
            if (v === null || v === undefined) return false;
            if (typeof v === "string" && v === "") return false;
            if (Array.isArray(v) && v.length === 0) return false;
            if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) return false;
            return true;
        })
    );
}

async function latest(page = 1) {
    const data = await get(
        `${BASE}/wp-json/wp/v2/posts?orderby=date&order=desc&per_page=10&page=${page}&_fields=id,title,slug,link,date,yoast_head_json,class_list`
    );
    if (!Array.isArray(data)) throw new Error("Gagal fetch latest");

    return Promise.all(data.map(post => {
        const yoast = post.yoast_head_json || {};

        const tags = (post.class_list || [])
            .filter(c => c.startsWith("tag-") && !["tag-complete","tag-ongoing","tag-streaming","tag-movie","tag-ova","tag-ona","tag-special"].includes(c))
            .map(c => c.replace("tag-", ""));

        const typeC  = (post.class_list || []).find(c => c.startsWith("type-"));
        const status = (post.class_list || []).find(c => c === "tag-complete") ? "complete"
                     : (post.class_list || []).find(c => c === "tag-ongoing")  ? "ongoing" : null;

        return cleanResult({
            id:       post.id,
            title:    post.title?.rendered?.replace(/&#[^;]+;/g, "").replace(/&amp;/g, "&") || "",
            slug:     post.slug,
            url:      post.link,
            date:     post.date?.split("T")[0] || "",
            synopsis: yoast.og_description?.replace(/&#[^;]+;/g, "").replace(/&amp;/g, "&") || "",
            poster:   yoast.og_image?.[0]?.url || null,
            type:     typeC ? typeC.replace("type-", "") : null,
            status,
            tags,
        });
    }));
}

module.exports = {
    name: "NimegamiLatest",
    desc: "Mendapatkan anime terbaru dari nimegami.id.",
    category: "Anime",
    params: ["page"],

    async run(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const result = await latest(page);

            if (!result.length) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz x Xena",
                    error: "Tidak ada data."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz x Xena",
                page,
                total: result.length,
                result,
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Shannz x Xena",
                error: error.message
            });
        }
    }
};

