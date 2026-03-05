const axios = require("axios");

/**
 * NIMEGAMI STREAM
 * Creator: Shannz x Xena
 */

const BASE = "https://nimegami.id";
const UA   = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";
const ax   = axios.create({ headers: { "user-agent": UA }, decompress: true, timeout: 15000 });

async function get(url, headers = {}) {
    const res = await ax.get(url, { headers });
    return res.data;
}

async function stream(id, name, provider = "dlgan") {
    const base = provider === "berkasdrive"
        ? "https://dl.berkasdrive.com/new/streaming.php"
        : "https://dlgan.space/streaming.php";

    const html = await get(
        `${base}?id=${id}&name=${encodeURIComponent(name)}&poster=`,
        { referer: BASE }
    );

    const m = html.match(/"stream_url"\s*:\s*"([^"]+)"/);
    if (!m) throw new Error("Gagal mendapatkan stream URL");

    const streamUrl = m[1].replace(/\\u0026/g, "&");
    return { id, name, provider, streamUrl };
}

module.exports = {
    name: "NimegamiStream",
    desc: "Mendapatkan stream URL video dari nimegami.id. Provider: dlgan (default) atau berkasdrive.",
    category: "Anime",
    params: ["id", "name", "provider"],

    async run(req, res) {
        try {
            const { id, name, provider } = req.query;

            if (!id || !id.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz x Xena",
                    error: "Parameter 'id' wajib diisi. Dapatkan id dari endpoint nimegami-info.",
                    example: "?id=abc123&name=One+Piece+Ep_001_720p&provider=dlgan"
                });
            }

            if (!name || !name.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz x Xena",
                    error: "Parameter 'name' wajib diisi. Dapatkan name dari endpoint nimegami-info.",
                    example: "?id=abc123&name=One+Piece+Ep_001_720p&provider=dlgan"
                });
            }

            const validProviders = ["dlgan", "berkasdrive"];
            const prov = validProviders.includes(provider) ? provider : "dlgan";

            const result = await stream(id.trim(), name.trim(), prov);

            res.status(200).json({
                status: true,
                creator: "Shannz x Xena",
                result,
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Shannz x Xena",
                error: error.message
            });
        }
    }
};

