const axios = require('axios')
const cheerio = require('cheerio')

let cloudscraper
try { cloudscraper = require('cloudscraper') } catch (_) { cloudscraper = null }

const BASE = 'https://otakudesu.blog'
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
}

async function fetchPage(url) {
    try {
        const res = await axios.get(url, { headers: HEADERS, timeout: 20000, maxRedirects: 5, decompress: true })
        if (res.status === 200) return cheerio.load(res.data)
    } catch (_) {}

    if (cloudscraper) {
        const html = await cloudscraper.get({ uri: url, headers: { 'Referer': BASE + '/' }, timeout: 30000 })
        return cheerio.load(html)
    }

    throw new Error('Gagal fetch halaman, CF block dan cloudscraper tidak tersedia')
}

async function getNonce() {
    const res = await axios.post(`${BASE}/wp-admin/admin-ajax.php`,
        new URLSearchParams({ action: 'aa1208d27f29ca340c92c66d1926f13f' }),
        {
            headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
            timeout: 10000
        }
    )
    if (!res.data?.data) throw new Error('Gagal mendapatkan nonce')
    return res.data.data
}

async function getEmbedUrl(id, i, q, nonce) {
    const res = await axios.post(`${BASE}/wp-admin/admin-ajax.php`,
        new URLSearchParams({ id: String(id), i: String(i), q, nonce, action: '2a3505c93b0035d3f455df82bf976b84' }),
        {
            headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
            timeout: 10000
        }
    )
    if (!res.data?.data) return null
    const html = Buffer.from(res.data.data, 'base64').toString('utf-8')
    const $ = cheerio.load(html)
    return $('iframe').attr('src') || null
}

async function bypassFiledon(embedUrl) {
    const slug = embedUrl.split('/embed/')[1]
    if (!slug) return null
    const res = await axios.get(`https://filedon.co/embed/${slug}`, {
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE + '/' },
        timeout: 15000
    })
    const raw = res.data.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\\/g, '')
    const match = raw.match(/"url":"(https:\/\/[^"]+\.mp4[^"]*)"/)
    return match ? match[1] : null
}

// GET /anime/otakudesu/stream?url=...
async function stream(req, res) {
    try {
        const { url } = req.query
        if (!url) return res.json({ status: false, error: 'Parameter url wajib diisi' })
        if (!url.startsWith('https://otakudesu.blog')) return res.json({ status: false, error: 'URL harus dari otakudesu.blog' })

        const $ = await fetchPage(url)

        // title
        const title = $('.posttl').first().text().trim()

        // default embed
        const default_embed = $('#pembed iframe').attr('src') || null

        // next/prev + series url
        const flir = $('.flir a')
        let series_url = null
        let next_episode = null
        flir.each((_, a) => {
            const href  = $(a).attr('href') || ''
            const text  = $(a).text().trim()
            const title = $(a).attr('title') || ''
            if (href.includes('/anime/')) series_url = href
            if (title.toLowerCase().includes('selanjutnya') || text.toLowerCase().includes('next')) next_episode = href
        })

        // episode list dari selectcog
        const episode_list = []
        $('#selectcog option').each((_, opt) => {
            const val  = $(opt).attr('value') || ''
            const text = $(opt).text().trim()
            if (val && val !== '0') episode_list.push({ label: text, url: val })
        })

        // mirror streams
        const mirrors = {}
        ;['.m360p', '.m480p', '.m720p'].forEach(cls => {
            const quality = cls.replace('.m', '')
            mirrors[quality] = []
            $(`ul${cls} li a`).each((_, a) => {
                const name    = $(a).text().trim()
                const encoded = $(a).attr('data-content')
                if (encoded) {
                    try {
                        const data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'))
                        mirrors[quality].push({ name, ...data })
                    } catch (_) {}
                }
            })
        })

        // download links
        const downloads = {}
        $('.download ul li').each((_, li) => {
            const quality = $(li).find('strong').text().trim()
            if (!quality) return
            const size    = $(li).find('i').text().trim()
            const servers = []
            $(li).find('a').each((__, a) => {
                const name = $(a).text().trim()
                const link = $(a).attr('href')
                if (link && link.startsWith('http')) servers.push({ name, link })
            })
            if (servers.length) downloads[quality] = { size, servers }
        })

        // anime info dari infozingle
        const info = {}
        $('.infozingle p').each((_, p) => {
            const text = $(p).text().trim()
            const m    = text.match(/^(.+?):\s*(.+)$/)
            if (m) info[m[1].trim()] = m[2].trim()
        })
        // genres dari infozingle
        const genres = []
        $('.infozingle b:contains("Genres")').parent().find('a').each((_, a) => {
            const g = $(a).text().trim()
            if (g) genres.push(g)
        })

        // cover
        const cover = $('.cukder img').first().attr('src') || null

        // episode navigasi dari keyingpost
        const other_episodes = []
        $('.keyingpost li a').each((_, a) => {
            const href  = $(a).attr('href') || ''
            const label = $(a).text().trim()
            if (href) other_episodes.push({ label, url: href })
        })

        res.json({
            status: true,
            result: {
                title,
                cover,
                series_url,
                next_episode,
                info,
                genres,
                default_embed,
                mirrors,
                downloads,
                episode_list,
                other_episodes
            }
        })
    } catch (e) {
        res.json({ status: false, error: e.message })
    }
}

// GET /anime/otakudesu/resolve?id=191771&i=0&q=480p
async function resolve(req, res) {
    try {
        const { id, i = '0', q } = req.query
        if (!id || !q) return res.json({ status: false, error: 'Parameter id dan q wajib diisi' })

        const nonce    = await getNonce()
        const embedUrl = await getEmbedUrl(id, i, q, nonce)
        if (!embedUrl) return res.json({ status: false, error: 'Gagal mendapatkan embed URL' })

        res.json({ status: true, result: { id, i, q, embed_url: embedUrl } })
    } catch (e) {
        res.json({ status: false, error: e.message })
    }
}

// GET /anime/otakudesu/filedon?id=191771&i=1&q=360p
async function filedon(req, res) {
    try {
        const { id, i = '0', q } = req.query
        if (!id || !q) return res.json({ status: false, error: 'Parameter id dan q wajib diisi' })

        const nonce    = await getNonce()
        const embedUrl = await getEmbedUrl(id, i, q, nonce)
        if (!embedUrl) return res.json({ status: false, error: 'Gagal mendapatkan embed URL' })
        if (!embedUrl.includes('filedon.co')) return res.json({ status: false, error: 'Mirror ini bukan filedon', embed_url: embedUrl })

        const mp4Url = await bypassFiledon(embedUrl)
        if (!mp4Url) return res.json({ status: false, error: 'Gagal extract MP4 dari filedon' })

        res.json({ status: true, result: { id, i, q, embed_url: embedUrl, mp4_url: mp4Url, expires_in: '3600s' } })
    } catch (e) {
        res.json({ status: false, error: e.message })
    }
}

// GET /anime/otakudesu/detail?url=https://otakudesu.blog/anime/mato-seihei-slave-s2-sub-indo/
async function detail(req, res) {
    try {
        const { url } = req.query
        if (!url) return res.json({ status: false, error: 'Parameter url wajib diisi' })
        if (!url.startsWith('https://otakudesu.blog')) return res.json({ status: false, error: 'URL harus dari otakudesu.blog' })

        const $ = await fetchPage(url)

        // title
        const title = $('.jdlrx h1').first().text().trim()

        // cover
        const cover = $('.fotoanime img').first().attr('src') || null

        // info dari infozingle
        const info = {}
        const genres = []
        $('.infozingle p').each((_, p) => {
            const key = $(p).find('b').first().text().replace(':', '').trim()
            if (!key) return
            if (key === 'Genre') {
                $(p).find('a').each((_, a) => {
                    const g = $(a).text().trim()
                    if (g) genres.push(g)
                })
            } else {
                // ambil text tanpa tag b
                const val = $(p).find('span').first().text().replace(key + ':', '').trim()
                if (val) info[key] = val
            }
        })

        // synopsis dari sinopc (bisa kosong)
        const synopsis = $('.sinopc').text().trim() || null

        // episode list — ada bisa multiple .episodelist (batch, per-episode, lengkap)
        const episode_sections = []
        $('.episodelist').each((_, section) => {
            const section_title = $(section).find('.monktit').text().trim()
            const episodes = []
            $(section).find('ul li').each((_, li) => {
                const a     = $(li).find('a').first()
                const label = a.text().trim()
                const epUrl = a.attr('href') || ''
                const date  = $(li).find('.zeebr').text().trim()
                if (epUrl) episodes.push({ label, url: epUrl, date })
            })
            if (episodes.length) episode_sections.push({ section: section_title, episodes })
        })

        // rekomendasi anime
        const recommendations = []
        $('#recommend-anime-series .isi-konten').each((_, item) => {
            const a     = $(item).find('.judul-anime a').first()
            const label = a.text().trim()
            const href  = a.attr('href') || ''
            const img   = $(item).find('img').first().attr('src') || null
            if (href) recommendations.push({ title: label, url: href, cover: img })
        })

        res.json({
            status: true,
            result: {
                title,
                cover,
                info,
                genres,
                synopsis,
                episode_sections,
                recommendations
            }
        })
    } catch (e) {
        res.json({ status: false, error: e.message })
    }
}

// GET /anime/otakudesu/home
async function home(req, res) {
    try {
        const $ = await fetchPage(BASE + '/')

        const sections = []

        $('.rseries').each((_, section) => {
            // section title dari h1 di rvad
            const section_title = $(section).find('.rvad h1').text().trim()
            const section_url   = $(section).find('.rapi > a').first().attr('href') || null

            const items = []
            $(section).find('.venz ul li').each((_, li) => {
                const episode = $(li).find('.epz').text().replace(/\s+/g, ' ').trim()
                const meta    = $(li).find('.epztipe').text().replace(/\s+/g, ' ').trim() // hari atau score
                const date    = $(li).find('.newnime').text().trim()
                const a       = $(li).find('.thumb a').first()
                const url     = a.attr('href') || null
                const title   = $(li).find('.jdlflm').text().trim()
                const cover   = $(li).find('img').first().attr('src') || null

                if (url && title) items.push({ title, url, cover, episode, meta, date })
            })

            if (items.length) sections.push({ section: section_title, url: section_url, items })
        })

        res.json({ status: true, result: sections })
    } catch (e) {
        res.json({ status: false, error: e.message })
    }
}

module.exports = { home, stream, resolve, filedon, detail }
