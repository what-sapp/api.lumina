const axios = require('axios');
const crypto = require('crypto');

/**
 * CONFIG & DECRYPTION ENGINE
 */
const ENCRYPTION_KEY = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');

function decrypt(enc) {
    const b = Buffer.from(enc.replace(/\s/g, ''), 'base64');
    const iv = b.subarray(0, 16);
    const data = b.subarray(16);
    const d = crypto.createDecipheriv('aes-128-cbc', ENCRYPTION_KEY, iv);
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString());
}

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "YouTube Short",
    desc: "Download YouTube dengan semua pilihan kualitas (MP4/MP3) melalui Savetube Engine",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });
            }

            console.log(`Processing Savetube for: ${url}`);

            const headers = {
                'origin': 'https://save-tube.com',
                'referer': 'https://save-tube.com/',
                'User-Agent': 'Mozilla/5.0'
            };

            // 1. Get Random CDN
            const { data: randomCdn } = await axios.get('https://media.savetube.vip/api/random-cdn', { headers });
            const cdn = randomCdn.cdn;

            // 2. Get Video Info (Encrypted)
            const { data: infoRes } = await axios.post(`https://${cdn}/v2/info`, { url }, { 
                headers: { ...headers, 'Content-Type': 'application/json' } 
            });

            if (!infoRes || !infoRes.status) throw new Error("Gagal mengambil info video");

            // 3. Decrypt Data
            const json = decrypt(infoRes.data);

            // 4. Helper for Download Link
            const getDl = async (type, quality) => {
                const r = await axios.post(`https://${cdn}/download`, {
                    id: json.id,
                    key: json.key,
                    downloadType: type,
                    quality: String(quality)
                }, { headers: { ...headers, 'Content-Type': 'application/json' } });
                return r.data?.data?.downloadUrl || null;
            };

            // 5. Mapping Formats
            // Agar API tidak terlalu berat (looping request download link), 
            // kita ambil kualitas utama saja atau biarkan user melihat semua.
            // Di sini saya ambil semua format yang tersedia.
            const results = [];

            // Video formats
            for (const v of json.video_formats) {
                results.push({
                    type: 'video',
                    quality: v.quality,
                    label: v.label,
                    url: await getDl('video', v.quality)
                });
            }

            // Audio formats
            for (const a of json.audio_formats) {
                results.push({
                    type: 'audio',
                    quality: a.quality,
                    label: a.label,
                    url: await getDl('audio', a.quality)
                });
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    title: json.title,
                    duration: json.duration,
                    duration_label: `${Math.floor(json.duration / 60)}m ${json.duration % 60}s`,
                    thumbnail: json.thumbnail,
                    media: results
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
