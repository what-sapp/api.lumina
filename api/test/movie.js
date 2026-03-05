const axios = require('axios');
const cheerio = require('cheerio');

/**
 * MOVIEKU EPISODE
 * GET /movie/movieku-episode?slug=monarch-legacy-of-monsters-season-2-2026-episode-01
 * Creator: Shannz
 */

const BASE = 'https://movieku.space';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://movieku.space/',
};

// Extract semua PixelDrain direct stream URLs dari download links (semua resolusi)
function extractPixelDrain(downloads) {
    const results = [];
    for (const dl of downloads) {
        for (const link of dl.links) {
            if (link.url.includes('pixeldrain.com')) {
                const match = link.url.match(/pixeldrain\.com\/(?:u|api\/file)\/([a-zA-Z0-9]+)/);
                if (match) {
                    results.push({
                        quality: dl.quality,
                        url: `https://pixeldrain.com/api/file/${match[1]}`,
                    });
                    break; // 1 per quality cukup
                }
            }
        }
    }
    return results.length > 0 ? results : null;
}

async function resolveStream(shortUrl) {
    try {
        const { request } = await axios.get(shortUrl, {
            headers, timeout: 10000, maxRedirects: 5, validateStatus: () => true
        });
        return request?.res?.responseUrl || shortUrl;
    } catch(e) { return shortUrl; }
}

module.exports = {
    name: 'MoviekuEpisode',
    desc: 'Download & streaming links per episode dari movieku.space. Termasuk direct stream via PixelDrain.',
    category: 'Movie',
    params: ['slug'],

    async run(req, res) {
        try {
            const { slug } = req.query;
            if (!slug?.trim()) return res.status(400).json({
                status: false, creator: 'Shannz',
                error: "Parameter 'slug' wajib diisi. Contoh: ?slug=monarch-legacy-of-monsters-season-2-2026-episode-01"
            });

            const url = `${BASE}/${slug.trim().replace(/^\/|\/$/g, '')}/`;
            const { data: html } = await axios.get(url, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            // ── Title ──
            const title = $('h1.entry-title').text().trim();
            if (!title) return res.status(404).json({ status: false, creator: 'Shannz', error: 'Episode tidak ditemukan.' });

            // ── Poster ──
            const poster = $('div.limage noscript img').attr('src')
                        || $('div.limage img').attr('data-lazy-src') || '';

            // ── Rating ──
            const rating = $('[itemprop="ratingValue"]').text().trim();
            const votes  = $('[itemprop="ratingCount"]').text().trim();

            // ── Info ──
            const info = {};
            $('ul.data li').each((_, el) => {
                const label = $(el).find('b').text().replace(':', '').trim();
                const value = $(el).find('.colspan').text().trim()
                           || $(el).clone().children('b').remove().end().text().trim();
                if (label) info[label.toLowerCase()] = value;
            });

            // ── Download links ──
            const downloads = [];
            $('#smokeddl .smokeurl p').each((_, el) => {
                const quality = $(el).find('strong').text().trim();
                if (!quality) return;
                const links = [];
                $(el).find('a').each((_, a) => {
                    const href = $(a).attr('href') || '';
                    const label = $(a).text().trim();
                    if (href && href !== '#' && label) links.push({ label, url: href });
                });
                if (links.length > 0) downloads.push({ quality, links });
            });

            // ── Stream ──
            // 1. AbyssCDN embed (dari iframe)
            const iframeSrc = $('#embed_holder iframe').attr('src') || '';
            const embedUrl = iframeSrc ? iframeSrc.replace('short.ink', 'short.icu') : null;
            const playerUrl = embedUrl ? await resolveStream(embedUrl) : null;

            // 2. PixelDrain direct stream (no auth needed)
            const pixeldrain = extractPixelDrain(downloads);

            // ── Navigation ──
            const allEpisodesUrl = $('a:contains("All Episodes")').attr('href') || null;
            const prevEp = $('a.ts-watch-prev-nav').attr('href') || '';
            const nextEp = $('a.ts-watch-next-nav').attr('href') || '';

            // ── Episode list ──
            const episodeList = [];
            $('div.epsdlist ul li').each((_, el) => {
                const epUrl   = $(el).find('a').attr('href') || '';
                const epTitle = $(el).find('.epl-num b').text().trim();
                const epDate  = $(el).find('.epl-date').text().trim();
                const epId    = $(el).attr('data-ID') || $(el).attr('data-id') || '';
                if (epUrl) episodeList.push({
                    id: epId, title: epTitle, date: epDate,
                    url: epUrl, slug: epUrl.replace(BASE, '').replace(/\//g, '')
                });
            });

            res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    title, slug: slug.trim(), url, poster,
                    rating: rating ? { value: rating, votes } : null,
                    info,
                    stream: {
                        embed: embedUrl || null,
                        player: playerUrl || null,
                        // Direct stream via PixelDrain — pilih resolusi sesuai koneksi
                        direct: pixeldrain ? {
                            note: 'Direct MKV/MP4 stream, no auth required',
                            qualities: pixeldrain // [ { quality: "1080p", url: "..." }, { quality: "720p", ... }, ... ]
                        } : null,
                    },
                    downloads: { total: downloads.length, data: downloads },
                    navigation: {
                        all_episodes: allEpisodesUrl,
                        prev: prevEp && prevEp !== '#/' ? { url: prevEp, slug: prevEp.replace(BASE,'').replace(/\//g,'') } : null,
                        next: nextEp && nextEp !== '#/' ? { url: nextEp, slug: nextEp.replace(BASE,'').replace(/\//g,'') } : null,
                    },
                    episode_list: { total: episodeList.length, data: episodeList },
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
