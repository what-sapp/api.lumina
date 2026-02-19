const axios = require('axios');

/**
 * CONFIG & HELPERS
 */
const qualityaudio = ['96', '128', '256', '320'];

const convertid = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const mapaudioquality = (bitrate) => {
    if (bitrate == 320) return 0;
    if (bitrate == 256) return 1;
    if (bitrate == 128) return 4;
    if (bitrate == 96) return 5;
    return 4;
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
    name: "YouTube MP3",
    desc: "Download YouTube audio dengan kualitas bitrate pilihan",
    category: "Downloader",
    params: ["url", "bitrate"],
    async run(req, res) {
        try {
            const { url, bitrate = '128' } = req.query;
            const youtube_id = convertid(url);

            if (!youtube_id) return res.status(400).json({ status: false, error: 'URL YouTube tidak valid!' });
            if (!qualityaudio.includes(String(bitrate))) return res.status(400).json({ status: false, error: 'Bitrate tidak valid! Pilih: 96, 128, 256, 320' });

            const finalQuality = mapaudioquality(parseInt(bitrate));
            const formatValue = 1; // 1 for MP3

            // 1. Check Database
            const check = await requestCnv('check_database.php', { youtube_id, quality: finalQuality, formatValue });
            if (check.data?.success) {
                return res.status(200).json({
                    status: true,
                    creator: "shannz",
                    result: { title: check.data.data.title, download: check.data.data.server_path, bitrate: bitrate + 'kbps' }
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

            // 4. Insert to Database (Optional Background Task)
            requestCnv('insert_to_database.php', { youtube_id, server_path: finalLink, quality: finalQuality, title, formatValue }).catch(() => {});

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: { title, download: finalLink, bitrate: bitrate + 'kbps' }
            });

        } catch (error) {
            res.status(500).json({ status: false, creator: "shannz", error: error.message });
        }
    }
};
