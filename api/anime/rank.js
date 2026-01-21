const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
    name: 'Ranking Anime',
    desc: 'Scrape anime ranking from livechart.me',
    category: 'Anime',
    params: [],

    async run(req, res) {
        try {
            const URL = "https://www.livechart.me/rankings";

            // Ambil HTML
            const { data: html } = await axios.get(URL, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            const $ = cheerio.load(html);
            const results = [];

            // Card ranking
            $(".card.bg-base-300.shadow-md").each((ci, card) => {
                $(card).find("tr").each((i, row) => {
                    const r = $(row);

                    // Rank
                    const rank = parseInt(r.find("td").eq(0).text().trim(), 10);

                    // Title + Link
                    const titleEl = r.find("a[data-anime-item-target='preferredTitle']").first();
                    const title = titleEl.text().trim();
                    const href = titleEl.attr("href") || "";
                    const link = href.startsWith("http")
                        ? href
                        : "https://www.livechart.me" + href;

                    // Score
                    const score = parseFloat(
                        r.find("td:has(div:contains('ratings')) span.font-medium")
                            .first()
                            .text()
                            .trim() || "0"
                    );

                    // Ratings
                    const ratingText = r
                        .find("td:has(div:contains('ratings')) div:contains('ratings')")
                        .first()
                        .text()
                        .trim()
                        .toLowerCase();

                    let ratings = 0;
                    if (ratingText.includes("k")) {
                        ratings = Math.round(parseFloat(ratingText) * 1000);
                    } else if (ratingText) {
                        const numPart = ratingText.split(" ")[0];
                        ratings = parseInt(numPart, 10) || 0;
                    }

                    if (title) {
                        results.push({ rank, title, score, ratings, link });
                    }
                });
            });

            res.status(200).json({
                status: true,
                total: results.length,
                result: results
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
};
