const axios = require('axios');
const crypto = require('crypto');

const CONFIG = {
    API_URL: 'https://api.snowping.my.id/api/imageai/tohitam',
    TIMEOUT: 60000, // 60 detik
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

const utils = {
    // Validasi URL
    isValidUrl: (string) => {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    },

    // Format file size
    formatBytes: (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Upload ke cloud storage (opsional)
    uploadToCloud: async (imageUrl, filenamePrefix = 'tohitam') => {
        try {
            console.log(`📥 Downloading from API result...`);
            const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000 
            });
            
            const buffer = Buffer.from(response.data);
            const ext = '.png';
            const filename = `${filenamePrefix}_${crypto.randomUUID()}${ext}`;
            const contentType = 'image/png';
            const fileSize = buffer.length;

            console.log(`☁️ Uploading to cloud storage...`);
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

            const cloudUrl = `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
            console.log(`✓ Cloud upload successful: ${cloudUrl}`);
            return cloudUrl;
        } catch (error) {
            console.error(`[Upload Cloud Error]: ${error.message}`);
            return null;
        }
    }
};

const processToHitam = async (imageUrl) => {
    try {
        console.log(`⚫ Starting Image to Black & White conversion...`);
        console.log(`📷 Image URL: ${imageUrl}`);
        
        const startTime = Date.now();
        
        // Call API
        const response = await axios.get(CONFIG.API_URL, {
            params: { url: imageUrl },
            headers: CONFIG.HEADERS,
            timeout: CONFIG.TIMEOUT
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`✓ API Response: ${response.status}`);
        console.log(`⏱️ Response Time: ${responseTime}ms`);
        
        if (response.data.status !== 200) {
            throw new Error(response.data.message || 'API Error');
        }
        
        const result = response.data.result;
        
        return {
            success: true,
            url: result.url,
            size: result.size,
            mimetype: result.mimetype,
            format: result.format,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        
        // Handle timeout
        if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                msg: 'Request timeout. Gambar terlalu besar atau server sibuk.'
            };
        }
        
        // Handle API error
        if (error.response) {
            return {
                success: false,
                msg: error.response.data?.message || 'API Error',
                statusCode: error.response.status
            };
        }
        
        return {
            success: false,
            msg: error.message
        };
    }
};

module.exports = {
    name: "To Hitam",
    desc: "Convert image to black & white using AI",
    category: "Style Changer",
    params: ["url"],
    
    async run(req, res) {
        try {
            const imageUrl = req.query.url;
            
            // ── Validasi ──
            if (!imageUrl) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" diperlukan (URL gambar)'
                });
            }
            
            if (!utils.isValidUrl(imageUrl)) {
                return res.status(400).json({
                    status: false,
                    error: 'URL tidak valid. Harus dimulai dengan http:// atau https://'
                });
            }
            
            console.log(`📥 Request: ${imageUrl.substring(0, 60)}...`);
            
            const result = await processToHitam(imageUrl);
            
            if (!result.success) {
                return res.status(result.statusCode || 500).json({
                    status: false,
                    error: result.msg
                });
            }
            
            // ── Return ──
            res.status(200).json({
                status: true,
               // creator: "riyzonly",
                responseTime: result.responseTime,
                result: {
                    url: result.url,
                    size: result.size,
                    mimetype: result.mimetype,
                    format: result.format
                }
            });
            
        } catch (error) {
            console.error(`[API Error]: ${error.message}`);
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "riyzonly",
                error: error.message
            });
        }
    }
};
