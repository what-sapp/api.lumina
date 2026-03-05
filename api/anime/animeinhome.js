const axios = require('axios');

/**
 * ANIMEIN HOME
 * Creator: Shannz
 */

const BASE = 'https://animeinweb.com';
const ax   = axios.create({ headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 OPR/95.0.0.0',
    Referer: BASE,
}});

module.exports = {
    name: "AnimeinHome",
    desc: "Mendapatkan semua section home animein.net: hot, new, popular, waiting, trailer, random, slider.",
    category: "Anime",
    params: [],

    async run(req, res) {
        try {
            const { data } = await ax.get(`${BASE}/api/proxy/3/2/home/data`);
            const d = data?.data;

            if (!d) return res.status(500).json({ status: false, creator: "Shannz", error: "Gagal fetch data home." });

            res.status(200).json({
                status: true,
                creator: "Shannz",
                result: {
                    hot:     { label: "Sedang Hangat",   total: d.hot?.length     || 0, data: d.hot     || [] },
                    new:     { label: "Baru Ditambahkan", total: d.new?.length     || 0, data: d.new     || [] },
                    popular: { label: "Populer",          total: d.popular?.length || 0, data: d.popular || [] },
                    waiting: { label: "Paling Ditunggu",  total: d.waiting?.length || 0, data: d.waiting || [] },
                    trailer: { label: "Trailer",          total: d.trailer?.length || 0, data: d.trailer || [] },
                    random:  { label: "Jas Por Yu",       total: d.random?.length  || 0, data: d.random  || [] },
                    slider:  { label: "Slider",           total: d.slider?.length  || 0, data: d.slider  || [] },
                }
            });

        } catch(e) {
            res.status(500).json({ status: false, creator: "Shannz", error: e.message });
        }
    }
};

