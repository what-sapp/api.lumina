const axios    = require('axios');
const FormData = require('form-data');
const crypto   = require('crypto');

const BASE_URL = 'https://removal.ai';
const API_URL  = 'https://api.removal.ai';
const AJAX_URL = 'https://removal.ai/wp-admin/admin-ajax.php';
const UA       = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

function generateCookies() {
    const rnd       = (n) => crypto.randomBytes(Math.ceil(n/2)).toString('hex').slice(0, n);
    const ts        = Date.now();
    const phpsessid = rnd(26);
    const ga1       = `GA1.1.${rnd(8)}.${String(ts).slice(0, 10)}`;
    const ga2       = `GS2.1.s${ts}$o1$g0$t${ts}$j60$l0$h0`;
    const ga3       = `GS2.1.s${ts - 1000}$o1$g1$t${ts}$j3$l0$h0`;
    return `PHPSESSID=${phpsessid}; lang=en; _ga=${ga1}; _ga_W308RS13QN=${ga2}; _ga_XECZHS4N4G=${ga3}`;
}

async function getSecurityKey(cookies) {
    const r     = await axios.get(`${BASE_URL}/upload/`, { headers: { 'User-Agent': UA, 'Cookie': cookies } });
    const match = r.data.match(/security["'\s:]+["']([a-z0-9]+)["']/);
    return match ? match[1] : null;
}

async function getWebToken(cookies) {
    const security = await getSecurityKey(cookies);
    if (!security) throw new Error("Gagal mendapatkan security key.");
    const r = await axios.get(`${AJAX_URL}?action=ajax_get_webtoken&security=${security}`, {
        headers: {
            'User-Agent':        UA,
            'Referer':           BASE_URL + '/upload/',
            'Cookie':            cookies,
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    return r.data?.data?.webtoken;
}

module.exports = {
    name: "RemoveBG V7",
    desc: "Hapus background gambar menggunakan removal.ai.",
    category: "AI Tools",
    method: "POST",
    params: ["image"],
    paramsSchema: {
        image: { type: "file", label: "Image", required: true }
    },

    async run(req, res) {
        const file = req.file;
        if (!file) return res.status(400).json({ status: false, error: "File image diperlukan." });

        try {
            const cookies  = generateCookies();
            const token    = await getWebToken(cookies);
            if (!token) throw new Error("Gagal mendapatkan web token.");

            const form = new FormData();
            form.append('image_file', file.buffer, { filename: file.originalname || 'image.png', contentType: file.mimetype });
            form.append('format', 'png');

            const r = await axios.post(`${API_URL}/3.0/remove`, form, {
                headers: {
                    'User-Agent':  UA,
                    'Origin':      BASE_URL,
                    'Referer':     BASE_URL + '/upload/',
                    'Cookie':      cookies,
                    'Web-Token':   token,
                    ...form.getHeaders()
                }
            });

            const data = r.data;
            if (!data) throw new Error("Tidak ada response dari server.");

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: data
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
