const axios = require('axios');
const cheerio = require('cheerio');

/**
 * KONFIGURASI CLOUD & SCRAPER
 */
const CONFIG = {
    BASE_URL_SCRAPER: 'https://spotmate.online',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
};

/**
 * HELPER: Download File ke Buffer
 */
const downloadBuffer = async (url) => {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`Download Error: ${error.message}`);
        return null;
    }
};

/**
 * HELPER: Upload ke Cloud Sky
 */
const uploadToCloud = async (buffer, filename, contentType = 'audio/mpeg') => {
    try {
        const fileSize = buffer.length;
        const { data } = await axios.post('https://api.cloudsky.biz.id/get-upload-url', {
            fileKey: filename,
            contentType: contentType,
            fileSize: fileSize
        });

        await axios.put(data.uploadUrl, buffer, {
            headers: { 
                'Content-Type': contentType, 
                'Content-Length': fileSize,
                'x-amz-server-side-encryption': 'AES256' 
            }
        });

        return `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
    } catch (error) {
        console.error(`[Upload Cloud Error]: ${error.message}`);
        return null;
    }
};

/**
 * CORE LOGIC: Scraper Spotify
 */
const handleSpotifyDownload = async (spotifyUrl) => {
    try {
        // 1. Ambil Home untuk CSRF & Cookies
        const home = await axios.get(CONFIG.BASE_URL_SCRAPER, { headers: CONFIG.HEADERS });
        const cookie = Array.isArray(home.headers["set-cookie"])
            ? home.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ")
            : "";
        
        const $ = cheerio.load(home.data);
        const csrfToken = $('meta[name="csrf-token"]').attr("content");

        if (!csrfToken) throw new Error("Gagal mengambil CSRF Token");

        // 2. Setup Client dengan Auth
        const client = axios.create({
            baseURL: CONFIG.BASE_URL_SCRAPER,
            headers: {
                ...CONFIG.HEADERS,
                "content-type": "application/json",
                "cookie": cookie,
                "x-csrf-token": csrfToken,
                "referer": CONFIG.BASE_URL_SCRAPER + "/"
            }
        });

        // 3. Fetch Data & Convert
        console.log("Fetching Spotify metadata & converting...");
        const [metaRes, convertRes] = await Promise.all([
            client.post("/getTrackData", { spotify_url: spotifyUrl }),
            client.post("/convert", { urls: spotifyUrl }),
        ]);

        const meta = metaRes?.data;
        const dlData = convertRes?.data;

        if (!meta || !dlData?.url) throw new Error("Metadata atau link download tidak ditemukan");

        // 4. Proses Buffer & Upload ke Cloud (Agar user dapat link permanen/cloud)
        console.log(`Downloading audio: ${meta.name}...`);
        const audioBuffer = await downloadBuffer(dlData.url);
        let cloudUrl = dlData.url; // Fallback ke link asli jika upload gagal

        if (audioBuffer) {
            const filename = `spotify_${meta.id}_${Date.now()}.mp3`;
            const uploadedUrl = await uploadToCloud(audioBuffer, filename, 'audio/mpeg');
            if (uploadedUrl) cloudUrl = uploadedUrl;
        }

        return {
            success: true,
            title: meta.name,
            artist: Array.isArray(meta.artists) ? meta.artists.join(", ") : "Unknown",
            album: meta.album?.name || "Single",
            duration_ms: meta.duration_ms,
            thumbnail: meta.album?.images?.[0]?.url || null,
            download_url: cloudUrl, // Link dari Cloud Sky
            original_source: dlData.url
        };

    } catch (error) {
        return { success: false, msg: error.message };
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Spotify Downloader",
    desc: "Download lagu Spotify via Spotmate dengan Cloud Storage",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !/open\.spotify\.com/i.test(url)) {
                return res.status(400).json({
                    status: false,
                    error: 'URL Spotify tidak valid! Gunakan format open.spotify.com'
                });
            }

            console.log(`Processing Spotify URL: ${url}`);
            const result = await handleSpotifyDownload(url);

            if (!result.success) {
                return res.status(500).json({ status: false, error: result.msg });
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                data: result
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
