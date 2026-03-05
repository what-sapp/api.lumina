const axios = require("axios");

/**
 * NIMEGAMI LIST
 * Creator: Shannz x Xena
 */

const BASE = "https://nimegami.id";
const UA   = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";
const ax   = axios.create({ headers: { "user-agent": UA }, decompress: true, timeout: 15000 });

async function get(url) { return (await ax.get(url)).data; }

const LIST_PAGES  = { anime:"/anime-list/", streaming:"/anime-list-streaming/", liveaction:"/live-action-list/", drama:"/drama-jepang-list/" };
const SKIP_SLUGS  = ["anime-list","anime-list-streaming","live-action-list","drama-jepang-list","type-list","genre-category-list","seasons-musim-list"];

async function getList(type = "anime", letter = null) {
    const html    = await get(`${BASE}${LIST_PAGES[type] || LIST_PAGES.anime}`);
    const entries = [...html.matchAll(/href="(https:\/\/nimegami\.id\/([a-z0-9-]+)\/)"[^>]*>([^<]{2,80})</g)]
        .map(m => ({ slug: m[2], url: m[1], title: m[3].trim() }))
        .filter(e => e.title && !SKIP_SLUGS.includes(e.slug));
    const unique = [...new Map(entries.map(e=>[e.slug,e])).values()];
    if (!letter) return unique;
    const l = letter.toUpperCase();
    return l === "#" ? unique.filter(e=>/^[^a-zA-Z]/.test(e.title)) : unique.filter(e=>e.title.toUpperCase().startsWith(l));
}

module.exports = {
    name: "NimegamiList", 
  desc: "Mendapatkan daftar lengkap anime dari nimegami.id. listType: anime, streaming, liveaction, drama. letter: A-Z atau # untuk non-huruf.", 
  category: "Anime", 
  params: ["listType","letter"],
    async run(req, res) {
        try {
            const { listType, letter } = req.query;
            const validTypes = ["anime","streaming","liveaction","drama"];
            const type = validTypes.includes(listType) ? listType : "anime";
            if (letter && !/^[a-zA-Z#]$/.test(letter.trim())) return res.status(400).json({ status:false, creator:"Shannz x Xena", error:"Parameter 'letter' harus satu huruf A-Z atau #." });
            const result = await getList(type, letter?.trim()||null);
            if (!result.length) return res.status(404).json({ status:false, creator:"Shannz x Xena", error:"Tidak ada data." });
            res.status(200).json({ status:true, creator:"Shannz x Xena", listType:type, letter:letter?.trim().toUpperCase()||"all", total:result.length, result });
        } catch(e) { res.status(500).json({ status:false, creator:"Shannz x Xena", error:e.message }); }
    }
};
