const axios = require("axios");
const cheerio = require("cheerio");

const BASE = "https://4kwallpapers.com";
const DELAY = ms => new Promise(r => setTimeout(r, ms));

async function scrapePage(page) {
  const url =
    page === 1
      ? `${BASE}/`
      : `${BASE}/?page=${page}`;

  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000
  });

  const $ = cheerio.load(data);
  const items = [];

  $("#pics-list .wallpapers__item").each((_, el) => {
    const title = $(el).find("a[title]").attr("title");
    const detail = $(el).find("a.wallpapers__canvas_image").attr("href");
    const thumb = $(el).find("img").attr("src");
    const preview = $(el).find("link[itemprop='contentUrl']").attr("href");
    const keywords = $(el).find("meta[itemprop='keywords']").attr("content") || "";

    if (!title || !detail) return;

    items.push({
      title,
      detail_url: detail.startsWith("http") ? detail : BASE + detail,
      thumbnail: thumb,
      preview,
      keywords: keywords.split(",").map(k => k.trim())
    });
  });

  return items;
}

module.exports = {
  name: "4KWallpapersSearch",
  desc: "Safe global search wallpapers (limited)",
  category: "Wallpaper",
  params: ["q", "limit", "pages"],

  async run(req, res) {
    const q = (req.query.q || "").toLowerCase();
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const maxPages = Math.min(Number(req.query.pages || 10), 20);

    if (!q) {
      return res.status(400).json({
        status: false,
        error: "Query (q) is required"
      });
    }

    try {
      let results = [];
      let page = 1;

      while (results.length < limit && page <= maxPages) {
        console.log(`🔍 Scanning page ${page}`);

        const items = await scrapePage(page);
        if (!items.length) break;

        for (const item of items) {
          if (
            item.title.toLowerCase().includes(q) ||
            item.keywords.join(" ").toLowerCase().includes(q)
          ) {
            results.push(item);
            if (results.length >= limit) break;
          }
        }

        await DELAY(700); // 💤 anti bruteforce
        page++;
      }

      res.status(200).json({
        status: true,
        query: q,
        scanned_pages: page - 1,
        total: results.length,
        result: results
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  }
};
