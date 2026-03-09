const axios   = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://genius.com';
const HEADERS  = {
    'User-Agent':      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer':         BASE_URL + '/'
};

async function getSongDetails(url) {
    const r  = await axios.get(url, { headers: HEADERS });
    const $  = cheerio.load(r.data);

    const title         = $('h1.SongHeader-desktop__Title-sc-908aafe9-9').text().trim();
    const artist        = $('.SongHeader-desktop__CreditList-sc-908aafe9-16 a').first().text().trim();
    const album         = $('.SongHeader-desktop__AlbumCredit-sc-908aafe9-12 a').first().text().trim();
    const releaseDate   = $('.MetadataStats__LabelWithIcon-sc-f0ec0d92-1').first().text().trim();
    const views         = $('.MetadataStats__LabelWithIcon-sc-f0ec0d92-1').eq(2).text().trim();
    const coverArt      = $('.SongHeader-desktop__CoverArt-sc-908aafe9-8 img').attr('src');

    const lyrics = [];
    $('.Lyrics__Container-sc-d7157b20-1').each((i, el) => {
        const lines = [];
        $(el).contents().each((j, node) => {
            if (node.type === 'text') {
                lines.push($(node).text().trim());
            } else if (node.type === 'tag') {
                if (node.name === 'a' || node.name === 'i' || node.name === 'b') {
                    const t = $(node).text().trim();
                    if (t) lines.push(t);
                } else if (node.name === 'br') {
                    lines.push('\n');
                }
            }
        });
        lyrics.push(lines.join(' ').replace(/\n\s+/g, '\n'));
    });

    const credits = [];
    $('.Credit__Container-sc-96426b7f-0').each((i, el) => {
        const label        = $(el).find('.Credit__Label-sc-96426b7f-1').text().trim();
        const contributors = [];
        $(el).find('.Credit__Contributor-sc-96426b7f-2 a').each((j, a) => contributors.push($(a).text().trim()));
        if (label && contributors.length) credits.push({ label, contributors });
    });

    const writers = [];
    $('.Credit__Container-sc-96426b7f-0').each((i, el) => {
        if ($(el).find('.Credit__Label-sc-96426b7f-1').text().includes('Writers')) {
            $(el).find('a').each((j, a) => writers.push($(a).text().trim()));
        }
    });

    const tags = [];
    $('.SongTags__Tag-sc-2f4a2b99-3').each((i, el) => tags.push($(el).text().trim()));

    return { title, artist, album, releaseDate, views, coverArt, lyrics: lyrics.join('\n').replace(/\n+/g, '\n'), writers, credits, tags, url };
}

module.exports = {
    name: "Genius",
    desc: "Ambil lirik dan info lagu dari Genius.com.",
    category: "TOOLS",
    method: "GET",
    params: ["url"],
    paramsSchema: {
        url: { type: "text", label: "Genius Song URL", required: true }
    },

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });
        if (!url.includes('genius.com')) return res.status(400).json({ status: false, error: "URL harus dari genius.com." });

        try {
            const data = await getSongDetails(url);
            res.status(200).json({ status: true, creator: "Xena", result: data });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

