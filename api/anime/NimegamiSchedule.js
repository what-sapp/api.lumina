const axios = require("axios");

/**
 * NIMEGAMI SCHEDULE
 * Creator: Shannz x Xena
 */

const BASE = "https://nimegami.id";
const UA   = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";
const ax   = axios.create({ headers: { "user-agent": UA }, decompress: true, timeout: 15000 });

async function get(url) { return (await ax.get(url)).data; }

const DAYS = ["senin","selasa","rabu","kamis","jumat","sabtu","minggu"];

async function schedule(day = null) {
    const html   = await get(`${BASE}/anime-terbaru-sub-indo/`);
    const result = {};

    for (let i = 0; i < DAYS.length; i++) {
        const d = DAYS[i], next = DAYS[i+1];
        const si = html.indexOf(`id="${d}"`);
        if (si === -1) { result[d] = []; continue; }
        const ei      = next ? html.indexOf(`id="${next}"`, si) : html.length;
        const section = html.slice(si, ei === -1 ? html.length : ei);

        const items = [], re = /href="(https:\/\/nimegami\.id\/([a-z0-9-]+)\/)"\s+title="([^"]+)"/g;
        let m;
        while ((m = re.exec(section)) !== null)
            items.push({ slug: m[2], url: m[1], title: m[3].replace(/&#\d+;/g,"").replace(/&amp;/g,"&").trim() });

        const eps    = [...section.matchAll(/class="eps_ongo"[^>]*>\s*([^<]+)/g)].map(x=>x[1].trim());
        const unique = [...new Map(items.map((e,i)=>[e.slug,{...e,episode:eps[i]||null}])).values()];

        result[d] = await Promise.all(unique.map(async e => {
            try {
                const data = await get(`${BASE}/wp-json/wp/v2/posts?slug=${e.slug}&per_page=1&_fields=id,title,slug,link,date,yoast_head_json,class_list`);
                if (Array.isArray(data) && data.length) {
                    const p = data[0], yoast = p.yoast_head_json || {};
                    const genres = (p.class_list||[]).filter(c=>c.startsWith("category-")).map(c=>c.replace("category-","").replace(/-/g," ").replace(/\b\w/g,x=>x.toUpperCase()));
                    return { ...e, id:p.id, poster:yoast.og_image?.[0]?.url||null, synopsis:yoast.og_description?.replace(/&#[^;]+;/g,"").replace(/&amp;/g,"&")||"", genres };
                }
            } catch {}
            return e;
        }));
    }

    if (day) return { [day]: result[day.toLowerCase()] || [] };
    return result;
}

module.exports = {
    name: "NimegamiSchedule", 
    desc: "Jadwal tayang anime ongoing di nimegami.id. Parameter 'day' opsional: senin, selasa, rabu, kamis, jumat, sabtu, minggu.", 
    category: "Anime", 
    params: ["day"],
    async run(req, res) {
        try {
            const { day } = req.query;
            if (day && !DAYS.includes(day.trim().toLowerCase())) return res.status(400).json({ status:false, creator:"Shannz x Xena", error:`Day '${day}' tidak valid.`, validDays: DAYS });
            const result = await schedule(day?.trim().toLowerCase()||null);
            res.status(200).json({ status:true, creator:"Shannz x Xena", day:day?.trim().toLowerCase()||"all", result });
        } catch(e) { res.status(500).json({ status:false, creator:"Shannz x Xena", error:e.message }); }
    }
};

