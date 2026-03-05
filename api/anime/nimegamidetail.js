const axios = require("axios");

/**
 * NIMEGAMI INFO
 * Creator: Shannz x Xena
 */

const BASE = "https://nimegami.id";
const UA   = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";
const ax   = axios.create({ headers: { "user-agent": UA }, decompress: true, timeout: 15000 });

async function get(url, headers = {}) {
    const res = await ax.get(url, { headers });
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

async function getHtmlDetail(slug) {
    const html = await get(`${BASE}/${slug}/`);

    // Rating
    const ratingM = html.match(/ratingx[^>]*>([0-9.]+)/);
    const rating  = ratingM?.[1] || null;

    // Info table
    const info   = {};
    const infoRe = new RegExp('<td class="tablex">([^<]+)<span>[^<]*<\\/span><\\/td>[\\s\\n]*<td[^>]*>([\\s\\S]*?)<\\/td>', 'g');
    let im;
    while ((im = infoRe.exec(html)) !== null) {
        const label = im[1].trim();
        const value = im[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (label && value) info[label] = value;
    }

    // Genres
    const genres = info["Kategori"]
        ? info["Kategori"].split(",").map(g => g.trim()).filter(Boolean)
        : [];

    // Type & status
    const typeM   = html.match(/type-(movie|tv|series|ova|ona|special|drama-movie|drama-series|live-action|live|music|tv-special)/i);
    const statusM = html.match(/tag-(complete|ongoing)/i);

    // Keywords
    const kwM = html.match(/[Kk]eyword[\s\S]{0,100}<(?:p|blockquote)[^>]*>([\s\S]{0,800}?)<\/(?:p|blockquote)>/);
    const keywords = kwM ? kwM[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : null;

    // Downloads — dlgan
    const dlPattern = /dlgan\.space\/\?id=([^&"]+)&(?:amp;)?name=([^"&]+)/g;
    const downloads = {};
    let m;
    while ((m = dlPattern.exec(html)) !== null) {
        const id   = m[1];
        const name = decodeURIComponent(m[2].replace(/&amp;/g, "&"));
        const qm   = name.match(/(360p|480p|720p|1080p)/i);
        const q    = qm?.[1] || "unknown";
        if (!downloads[q]) downloads[q] = [];
        downloads[q].push({
            provider: "dlgan",
            id,
            name,
            downloadUrl: `https://dlgan.space/?id=${id}&name=${name}`
        });
    }

    // Episodes — berkasdrive
    const bdPattern = /berkasdrive\.com\/new\/streaming\.php\?id=([^&"]+)&(?:amp;)?name=([^"&]+)/g;
    const episodes  = [];
    while ((m = bdPattern.exec(html)) !== null) {
        const id   = m[1];
        const name = decodeURIComponent(m[2].replace(/&amp;/g, "&"));
        const epM  = name.match(/[Ee][Pp]?_?(\d+)/);
        const ep   = epM?.[1] ? parseInt(epM[1]) : null;
        const qm   = name.match(/(360p|480p|720p|1080p)/i);
        episodes.push({
            provider: "berkasdrive",
            id,
            name,
            episode: ep,
            quality: qm?.[1] || "unknown",
            streamingUrl: `https://dl.berkasdrive.com/new/streaming.php?id=${id}&name=${name}`
        });
    }

    // Terabox & Kraken
    const terabox = [...html.matchAll(/href="(https:\/\/1024terabox\.com\/[^"]+)"/g)].map(x => x[1]);
    const kraken  = [...html.matchAll(/href="(https:\/\/krakenfiles\.com\/[^"]+)"/g)].map(x => x[1]);

    return {
        rating, info, keywords, downloads, episodes, terabox, kraken,
        genres,
        type:   info["Type"] || typeM?.[1] || null,
        status: info["Status"] || statusM?.[1] || null,
    };
}

async function info(slug) {
    const data = await get(`${BASE}/wp-json/wp/v2/posts?slug=${slug}&per_page=1`);
    if (!Array.isArray(data) || !data.length) throw new Error("Anime tidak ditemukan");

    const post  = data[0];
    const yoast = post.yoast_head_json || {};
    const d     = await getHtmlDetail(post.slug);

    const tags = (post.class_list || [])
        .filter(c => c.startsWith("tag-") && !["tag-complete","tag-ongoing","tag-streaming","tag-movie","tag-ova","tag-ona","tag-special"].includes(c))
        .map(c => c.replace("tag-", ""));

    return cleanResult({
        id:        post.id,
        title:     post.title?.rendered?.replace(/&#[^;]+;/g, "").replace(/&amp;/g, "&") || "",
        slug:      post.slug,
        url:       post.link,
        date:      post.date?.split("T")[0] || "",
        synopsis:  yoast.og_description?.replace(/&#[^;]+;/g, "").replace(/&amp;/g, "&") || "",
        poster:    yoast.og_image?.[0]?.url || null,
        rating:    d.rating,
        type:      d.type,
        status:    d.status,
        genres:    d.genres,
        tags,
        info:      d.info,
        keywords:  d.keywords,
        downloads: d.downloads,
        episodes:  d.episodes,
        terabox:   d.terabox,
        kraken:    d.kraken,
    });
}

module.exports = {
    name: "NimegamiDetail",
    desc: "Mendapatkan detail lengkap anime dari nimegami.id berdasarkan slug.",
    category: "Anime",
    params: ["slug"],

    async run(req, res) {
        try {
            const { slug } = req.query;

            if (!slug || !slug.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz x Xena",
                    error: "Parameter 'slug' wajib diisi. Contoh: ?slug=one-piece-sub-indo"
                });
            }

            const result = await info(slug.trim());

            res.status(200).json({
                status: true,
                creator: "Shannz x Xena",
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
