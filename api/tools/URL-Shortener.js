const axios = require("axios");

/**
 * CONFIGURATION
 */
const UA = "Gienetic/1.2.0 (Android 13; Pixel 7 Pro) Mobile";

/**
 * CORE LOGIC: Multi-Service Shortener
 */
const shortener = {
    // 1. da.gd
    daGD: async (url, alias = "") => {
        const endpoint = `https://da.gd/shorten?url=${encodeURIComponent(url)}&shorturl=${encodeURIComponent(alias)}`;
        const res = await axios.get(endpoint, { headers: { "User-Agent": UA } });
        return res.data.trim();
    },

    // 2. v.gd
    vGD: async (url, alias = "") => {
        const endpoint = `https://v.gd/create.php?format=json&url=${encodeURIComponent(url)}&shorturl=${encodeURIComponent(alias)}&logstats=1`;
        const res = await axios.get(endpoint, { headers: { "User-Agent": UA } });
        return res.data.shorturl;
    },

    // 3. tinu.be
    tinuBe: async (url, alias = "") => {
        const payload = JSON.stringify([{ longUrl: url, urlCode: alias }]);
        const res = await axios.post("https://tinu.be/en", payload, {
            headers: {
                "User-Agent": UA,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "next-action": "74b2f223fe2b6e65737e07eeabae72c67abf76b2"
            }
        });
        const code = res.data?.data?.urlCode || alias;
        return `https://tinu.be/${code}`;
    },

    // 4. tinyurl.com
    tinyUrl: async (url, alias = "") => {
        const endpoint = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}&alias=${encodeURIComponent(alias)}`;
        const res = await axios.get(endpoint, { headers: { "User-Agent": UA } });
        return res.data.trim();
    },

    // 5. spoo.me (Normal & Emoji)
    spooMe: async (url, alias = "", emoji = false) => {
        const param = emoji ? `emojies=${encodeURIComponent(alias)}` : `alias=${encodeURIComponent(alias)}`;
        const path = emoji ? 'emoji' : '';
        const endpoint = `https://spoo.me/${path}?${param}&url=${encodeURIComponent(url)}`;
        const res = await axios.post(endpoint, null, {
            headers: {
                "User-Agent": UA,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }
        });
        return res.data.short_url;
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "URL Shortener",
    desc: "Memperpendek URL menggunakan berbagai layanan (TinyURL, v.gd, Spoo.me, dll)",
    category: "Tools",
    params: ["url", "_service", "alias"],
    async run(req, res) {
        try {
            const { url, service = "tinyurl", alias = "" } = req.query;

            if (!url) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });
            }

            let shortResult = "";
            const s = service.toLowerCase();

            // Routing Service
            switch (s) {
                case "dagd": shortResult = await shortener.daGD(url, alias); break;
                case "vgd": shortResult = await shortener.vGD(url, alias); break;
                case "tinube": shortResult = await shortener.tinuBe(url, alias); break;
                case "spoo": shortResult = await shortener.spooMe(url, alias, false); break;
                case "spooemoji": shortResult = await shortener.spooMe(url, alias, true); break;
                case "tinyurl":
                default:
                    shortResult = await shortener.tinyUrl(url, alias);
                    break;
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    service: s,
                    original: url,
                    short: shortResult
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: "Layanan ini mungkin sedang limit atau alias sudah terpakai.",
                details: error.message
            });
        }
    }
};
