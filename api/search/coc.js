const axios = require("axios");
const cheerio = require("cheerio");

const BASE = "https://clashofclans-layouts.com";

module.exports = {
  name: "COC Layout",
  desc: "Scrape Clash of Clans base layouts",
  category: "Game",
  params: ["th", "type"],

  async run(req, res) {
    const th = req.query.th || "13";
    const type = req.query.type;

    if (isNaN(th)) {
      return res.status(400).json({
        status: false,
        error: "Invalid TH"
      });
    }

    try {
      const results = [];

      for (let page = 1; page <= 100; page++) {
        const url =
          page === 1
            ? `${BASE}/plans/th_${th}/`
            : `${BASE}/plans/th_${th}/page_${page}/`;

        const { data } = await axios.get(url, { timeout: 15000 });
        const $ = cheerio.load(data);

        const items = $(".base_grid_item");
        if (!items.length) break;

        for (let el of items) {
          const a = $(el).find("a").first();
          const href = a.attr("href");

          const category = href.includes("war")
            ? "war"
            : href.includes("defence")
            ? "defence"
            : "other";

          if (type && category !== type) continue;

          results.push({
            base_id: $(el).find('input[name="base_id"]').val(),
            th: Number(th),
            title: a.attr("title"),
            category,
            preview:
              BASE + $(el).find("img.base_grid_img").attr("src"),
            detail_url: BASE + href
          });
        }
      }

      res.status(200).json({
        status: true,
        th: Number(th),
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
