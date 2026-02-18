const axios = require('axios');

/**
 * CORE SCRAPER: Instagram Downloader Logic
 */
const igDL = {
    api: {
        base: "https://snapinsta.to",
        endpoint: {
            verify: "/api/userverify",
            download: "/api/ajaxSearch",
        },
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; vivo 1901) AppleWebKit/537.36 Chrome/143.0.7499.192 Mobile Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    _req: async (url, data) => {
        const res = await axios.post(url, new URLSearchParams(data), { headers: igDL.headers });
        return res.data;
    },
    _extract: (data) => {
        const match = data.match(/decodeURIComponent\(r\)}\(\"([^\"]+)\"/);
        return match ? match[1] : null;
    },
    _decrypt: (h, n = 'abcdefghi', e = 2, t = 1) => {
        const B = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
        const toDec = (s, b) => [...s].reverse().reduce((a, c, i) => a + parseInt(c) * b ** i, 0);
        const fromDec = (n, b) => n ? [...Array(32)].reduce((a, _) => (n ? (a = B[n % b] + a, n = n / b | 0) : a, a), '') : '0';
        let r = '', i = 0;
        while (i < h.length) {
            let s = '';
            while (h[i] !== n[e]) s += h[i++];
            i++;
            for (let j = 0; j < n.length; j++) s = s.split(n[j]).join(j);
            r += String.fromCharCode(parseInt(fromDec(toDec(s, e), 10)) - t);
        }
        return decodeURIComponent(r);
    },
    _extractRealUrl: (tokenUrl) => {
        try {
            const urlObj = new URL(tokenUrl);
            const token = urlObj.searchParams.get('token');
            if (!token) return tokenUrl;
            const parts = token.split('.');
            if (parts.length < 2) return tokenUrl;
            const payload = parts[1];
            const padding = 4 - (payload.length % 4);
            const paddedPayload = padding !== 4 ? payload + '='.repeat(padding) : payload;
            const decoded = JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf-8'));
            return decoded.url || tokenUrl;
        } catch (e) { return tokenUrl; }
    },
    _parse: (html) => {
        const unescaped = html.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const results = [];
        const itemPattern = /<div class="download-items">(.*?)<\/div>\s*<\/div>\s*(?:<\/div>)?/gs;
        const items = [...unescaped.matchAll(itemPattern)];
        for (const itemMatch of items) {
            const itemHtml = itemMatch[1];
            const hasVideoIcon = itemHtml.includes('icon-dlvideo');
            const hasImageIcon = itemHtml.includes('icon-dlimage');
            if (!hasVideoIcon && !hasImageIcon) continue;
            const isAvatar = itemHtml.includes('title="Download Avatar"') || itemHtml.includes('>Unduh Avatar<');
            const type = isAvatar ? 'profile-picture' : (hasVideoIcon ? 'video' : 'photo');
            const thumbMatch = itemHtml.match(/<img[^>]+src="([^"]+)"[^>]*alt="SnapInsta"/i);
            const thumbnail = thumbMatch ? igDL._extractRealUrl(thumbMatch[1]) : null;
            let urlData;
            if (hasVideoIcon) {
                const dlMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*abutton[^"]*"/i);
                urlData = dlMatch ? igDL._extractRealUrl(dlMatch[1]) : null;
            } else {
                urlData = [];
                const optionPattern = /<option[^>]+value="([^"]+)"[^>]*>([^<]+)<\/option>/gi;
                const options = [...itemHtml.matchAll(optionPattern)];
                if (options.length > 0) {
                    for (const opt of options) urlData.push({ resolution: opt[2].trim(), url: igDL._extractRealUrl(opt[1]) });
                } else {
                    const dlMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*title="[^"]*"/i);
                    if (dlMatch) urlData.push({ resolution: 'default', url: igDL._extractRealUrl(dlMatch[1]) });
                }
            }
            if (thumbnail && urlData) results.push({ type, thumbnail, url: urlData });
        }
        return results;
    }
};

/**
 * HELPER: Upload to Cloud (Opsional untuk foto)
 */
const uploadToCloud = async (buffer, filename, contentType) => {
    try {
        const { data } = await axios.post('https://api.cloudsky.biz.id/get-upload-url', {
            fileKey: filename, contentType, fileSize: buffer.length
        });
        await axios.put(data.uploadUrl, buffer, { headers: { 'Content-Type': contentType } });
        return `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
    } catch (e) { return null; }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Instagram Downloader",
    desc: "Download IG Reels, Photo, and Profile Picture",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: 'Link IG-nya mana?' });

            console.log(`Processing Instagram URL: ${url}`);
            
            // 1. Verify Session
            const verifyRes = await igDL._req(igDL.api.base + igDL.api.endpoint.verify, { url });
            if (!verifyRes.success) throw new Error("Gagal verifikasi session ke SnapInsta");

            // 2. Fetch Data
            const searchRes = await igDL._req(igDL.api.base + igDL.api.endpoint.download, {
                q: url, t: 'media', v: 'v2', lang: 'id', cftoken: verifyRes.token
            });

            if (searchRes.status !== 'ok') throw new Error("Gagal mengambil data media");

            // 3. Decrypt & Parse
            let html;
            if (searchRes.v === 'v1') {
                html = searchRes.data;
            } else {
                const enc = igDL._extract(searchRes.data);
                if (!enc) throw new Error('Data terenkripsi tidak ditemukan');
                html = igDL._decrypt(enc);
            }

            const results = igDL._parse(html);
            if (results.length === 0) throw new Error("Tidak ada media yang bisa didownload");

            // 4. Send Response
            res.status(200).json({
                status: true,
                creator: "shannz",
                count: results.length,
                data: results
            });

        } catch (error) {
            console.error(`[IG DL Error]: ${error.message}`);
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
