const axios = require('axios');

/**
 * CONFIG & HELPERS
 */
const qualityvideo = ['144', '240', '360', '720', '1080'];

const convertid = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const requestCnv = async (endpoint, data) => {
    return axios.post(`https://cnvmp3.com/${endpoint}`, data, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
            'Content-Type': 'application/json',
            'origin': 'https://cnvmp3.com',
            'referer': 'https://cnvmp3.com/v51'
        }
    });
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "YouTube MP4",
    desc: "Download YouTube video dengan resolusi pilihan",
    category: "Downloader",
    params: ["url", "quality"],
    async run(req, res) {
        try {
            const { url, quality = '360' } = req.query;
            const youtube_id = convertid(url);

            if (!youtube_id) return res.status(400).json({ status: false, error: 'URL YouTube tidak valid!' });
            if (!qualityvideo.includes(String(quality))) return res.status(400).json({ status: false, error: 'Resolusi tidak valid! Pilih: 144, 240, 360, 720, 1080' });

            const finalQuality = parseInt(quality);
            const formatValue = 0; // 0 for MP4

            // 1. Check Database
            const check = await requestCnv('check_database.php', { youtube_id, quality: finalQuality, formatValue });
            if (check.data?.success) {
                return res.status(200).json({
                    status: true,
                    creator: "shannz",
                    result: { title: check.data.data.title, download: check.data.data.server_path, quality: quality + 'p' }
                });
            }

            // 2. Fetch Video Data
            const yturlfull = `https://www.youtube.com/watch?v=${youtube_id}`;
            const viddata = await requestCnv('get_video_data.php', { url: yturlfull, token: "1234" });
            if (viddata.data.error) throw new Error(viddata.data.error);

            // 3. Request Download Link
            const title = viddata.data.title;
            const download = await requestCnv('download_video_ucep.php', { url: yturlfull, quality: finalQuality, title, formatValue });
            if (download.data.error) throw new Error(download.data.error);

            const finalLink = download.data.download_link;

            // 4. Insert to Database
            requestCnv('insert_to_database.php', { youtube_id, server_path: finalLink, quality: finalQuality, title, formatValue }).catch(() => {});

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: { title, download: finalLink, quality: quality + 'p' }
            });

        } catch (error) {
            res.status(500).json({ status: false, creator: "shannz", error: error.message });
        }
    }
};
