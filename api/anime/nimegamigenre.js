const axios = require("axios");

/**
 * NIMEGAMI GENRE
 * Creator: Shannz x Xena
 */

const BASE = "https://nimegami.id";
const UA   = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";
const ax   = axios.create({ headers: { "user-agent": UA }, decompress: true, timeout: 15000 });

async function get(url) { return (await ax.get(url)).data; }

function clean(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([_,v]) => {
        if (v === null || v === undefined) return false;
        if (typeof v === "string" && v === "") return false;
        if (Array.isArray(v) && v.length === 0) return false;
        if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) return false;
        return true;
    }));
}

async function parsePost(post) {
    const yoast  = post.yoast_head_json || {};
    const tags   = (post.class_list||[]).filter(c=>c.startsWith("tag-")&&!["tag-complete","tag-ongoing","tag-streaming","tag-movie","tag-ova","tag-ona","tag-special"].includes(c)).map(c=>c.replace("tag-",""));
    const typeC  = (post.class_list||[]).find(c=>c.startsWith("type-"));
    const status = (post.class_list||[]).find(c=>c==="tag-complete")?"complete":(post.class_list||[]).find(c=>c==="tag-ongoing")?"ongoing":null;
    return clean({
        id: post.id, title: post.title?.rendered?.replace(/&#[^;]+;/g,"").replace(/&amp;/g,"&")||"",
        slug: post.slug, url: post.link, date: post.date?.split("T")[0]||"",
        synopsis: yoast.og_description?.replace(/&#[^;]+;/g,"").replace(/&amp;/g,"&")||"",
        poster: yoast.og_image?.[0]?.url||null,
        type: typeC?typeC.replace("type-",""):null, status, tags,
    });
}

async function byGenre(genre, page = 1) {
    const cats = await get(`${BASE}/wp-json/wp/v2/categories?slug=${genre}&per_page=1`);
    if (Array.isArray(cats) && cats.length) {
        const data = await get(`${BASE}/wp-json/wp/v2/posts?categories=${cats[0].id}&per_page=10&page=${page}&_fields=id,title,slug,link,date,yoast_head_json,class_list`);
        if (Array.isArray(data)) return Promise.all(data.map(parsePost));
    }
    const html   = await get(`${BASE}/category/${genre}/page/${page}/`);
    const slugs  = [...html.matchAll(/href="https:\/\/nimegami\.id\/([a-z0-9-]+)\/"/g)].map(m=>m[1]);
    const unique = [...new Set(slugs)].slice(0,10);
    const results = await Promise.all(unique.map(async s => {
        const d = await get(`${BASE}/wp-json/wp/v2/posts?slug=${s}&per_page=1&_fields=id,title,slug,link,date,yoast_head_json,class_list`);
        return Array.isArray(d)&&d.length ? parsePost(d[0]) : null;
    }));
    return results.filter(Boolean);
}

module.exports = {
    name: "NimegamiGenre", 
    desc: "Mendapatkan anime dari nimegami.id berdasarkan genre.", 
    category: "Anime", 
    params: ["genre","page"],
    async run(req, res) {
        try {
            const { genre, page } = req.query;
            if (!genre?.trim()) return res.status(400).json({ status:false, creator:"Shannz x Xena", error:"Parameter 'genre' wajib diisi. Contoh: ?genre=action&page=1" });
            const result = await byGenre(genre.trim().toLowerCase(), parseInt(page)||1);
            if (!result.length) return res.status(404).json({ status:false, creator:"Shannz x Xena", error:"Tidak ada anime ditemukan." });
            res.status(200).json({ status:true, creator:"Shannz x Xena", genre:genre.trim().toLowerCase(), page:parseInt(page)||1, total:result.length, result });
        } catch(e) { res.status(500).json({ status:false, creator:"Shannz x Xena", error:e.message }); }
    }
};

