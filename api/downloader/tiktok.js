const axios = require('axios');

const CONFIG = {
    BASE_URL: 'https://labs.shannzx.xyz/api/v1/tiktok',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
};

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

const uploadToCloud = async (buffer, filename, contentType = 'video/mp4') => {
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
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        return `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
    } catch (error) {
        console.error(`[Upload Cloud Error]: ${error.message}`);
        return null;
    }
};

const handleTikTokDownload = async (tiktokUrl) => {
    try {
        // Fetch metadata from API
        const encodedUrl = encodeURIComponent(tiktokUrl);
        const apiUrl = `${CONFIG.BASE_URL}?url=${encodedUrl}`;
        
        console.log(`Fetching TikTok metadata...`);
        const response = await axios.get(apiUrl, { headers: CONFIG.HEADERS });
        
        if (!response.data.status) {
            return { success: false, msg: 'API returned failure status' };
        }

        const data = response.data;
        const type = data.type; // 'video' or 'slide'
        const result = data.result;

        let downloadResults = {
            success: true,
            type: type,
            id: result.id,
            title: result.title || 'No title',
            region: result.region || 'Unknown'
        };

        // Handle video download
        if (type === 'video') {
            console.log(`Processing video: ${result.title}`);
            
            // Download video (prefer HD if available)
            const videoUrl = result.video_hd || result.video_sd;
            if (!videoUrl) {
                return { success: false, msg: 'No video URL found' };
            }

            console.log(`Downloading video from: ${videoUrl}`);
            const videoBuffer = await downloadBuffer(videoUrl);
            if (!videoBuffer) {
                return { success: false, msg: 'Failed to download video' };
            }

            // Upload video to cloud
            const videoFilename = `tiktok_${result.id}_${Date.now()}.mp4`;
            console.log(`Uploading video to cloud...`);
            const videoCloudUrl = await uploadToCloud(videoBuffer, videoFilename, 'video/mp4');
            
            if (!videoCloudUrl) {
                return { success: false, msg: 'Failed to upload video to cloud' };
            }

            downloadResults.video_url = videoCloudUrl;
            downloadResults.original_video_url = videoUrl;
            downloadResults.duration = result.duration;

            // Download thumbnail if available
            if (result.thumbnail) {
                console.log(`Downloading thumbnail...`);
                const thumbBuffer = await downloadBuffer(result.thumbnail);
                if (thumbBuffer) {
                    const thumbFilename = `tiktok_${result.id}_thumb_${Date.now()}.jpg`;
                    const thumbCloudUrl = await uploadToCloud(thumbBuffer, thumbFilename, 'image/jpeg');
                    if (thumbCloudUrl) {
                        downloadResults.thumbnail_url = thumbCloudUrl;
                    }
                }
            }

            // Download music if available
            if (result.music && result.music.url) {
                console.log(`Downloading music...`);
                const musicBuffer = await downloadBuffer(result.music.url);
                if (musicBuffer) {
                    const musicFilename = `tiktok_${result.id}_music_${Date.now()}.mp3`;
                    const musicCloudUrl = await uploadToCloud(musicBuffer, musicFilename, 'audio/mpeg');
                    if (musicCloudUrl) {
                        downloadResults.music = {
                            url: musicCloudUrl,
                            title: result.music.title,
                            author: result.music.author
                        };
                    }
                }
            }

            // Add stats if available
            if (result.stats) {
                downloadResults.stats = result.stats;
            }

        } 
        // Handle slide/images download
        else if (type === 'slide') {
            console.log(`Processing slides: ${result.title}`);
            
            downloadResults.total_slides = result.total_slides || 0;
            
            // Download all slides
            const slideUrls = [];
            if (result.slides && Array.isArray(result.slides)) {
                console.log(`Downloading ${result.slides.length} slides...`);
                
                for (let i = 0; i < result.slides.length; i++) {
                    const slideUrl = result.slides[i];
                    console.log(`Downloading slide ${i + 1}/${result.slides.length}...`);
                    
                    const slideBuffer = await downloadBuffer(slideUrl);
                    if (slideBuffer) {
                        const slideFilename = `tiktok_${result.id}_slide_${i + 1}_${Date.now()}.jpg`;
                        const slideCloudUrl = await uploadToCloud(slideBuffer, slideFilename, 'image/jpeg');
                        
                        if (slideCloudUrl) {
                            slideUrls.push({
                                index: i + 1,
                                url: slideCloudUrl,
                                original_url: slideUrl
                            });
                        }
                    }
                }
            }
            
            downloadResults.slides = slideUrls;

            // Download music if available
            if (result.music && result.music.url) {
                console.log(`Downloading music for slides...`);
                const musicBuffer = await downloadBuffer(result.music.url);
                if (musicBuffer) {
                    const musicFilename = `tiktok_${result.id}_music_${Date.now()}.mp3`;
                    const musicCloudUrl = await uploadToCloud(musicBuffer, musicFilename, 'audio/mpeg');
                    if (musicCloudUrl) {
                        downloadResults.music = {
                            url: musicCloudUrl,
                            title: result.music.title,
                            author: result.music.author
                        };
                    }
                }
            }
        }

        return downloadResults;

    } catch (error) {
        console.error(`[TikTok Download Error]: ${error.message}`);
        if (error.response) {
            console.error(`Server Response:`, error.response.data);
        }
        return { 
            success: false, 
            msg: error.message,
            errorData: error.response?.data 
        };
    }
};

module.exports = {
    name: "TikTok",
    desc: "Download TikTok videos and slides with metadata",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const url = req.query.url;

            // ── Validasi ──
            if (!url) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" diperlukan (URL TikTok)'
                });
            }

            // Validasi format URL TikTok
            if (!url.includes('tiktok.com') && !url.includes('vt.tiktok.com')) {
                return res.status(400).json({
                    status: false,
                    error: 'URL harus merupakan link TikTok yang valid'
                });
            }

            console.log(`Processing TikTok URL: ${url}`);
            
            const result = await handleTikTokDownload(url);

            if (!result.success) {
                return res.status(500).json({ 
                    status: false, 
                    error: result.msg,
                    details: result.errorData 
                });
            }

            // ── Return ──
            res.status(200).json({
                status: true,
                data: result
            });

        } catch (error) {
            console.error(`[TikTok API Error]: ${error.message}`);
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
