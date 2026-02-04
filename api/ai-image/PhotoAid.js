const axios = require('axios');
const crypto = require('crypto');

const CONFIG = {
    BASE_URL: 'https://photoaid.com',
    ENDPOINTS: {
        TOKEN: '/en/tools/api/tools/token',
        UPLOAD: '/en/tools/api/tools/upload',
        RESULT: '/en/tools/api/tools/result'
    },
    HEADERS: {
        origin: 'https://photoaid.com',
        referer: 'https://photoaid.com/en/tools/ai-image-enlarger',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'content-type': 'text/plain;charset=UTF-8'
    }
};

const utils = {
    downloadImage: async (input) => {
        try {
            if (Buffer.isBuffer(input)) {
                return input;
            } else if (typeof input === 'string' && input.startsWith('http')) {
                const response = await axios.get(input, { 
                    responseType: 'arraybuffer',
                    timeout: 30000 
                });
                return Buffer.from(response.data);
            } else {
                throw new Error('Invalid input. Provide URL or Buffer');
            }
        } catch (error) {
            console.error(`Download Error: ${error.message}`);
            return null;
        }
    },

    bufferToBase64: (buffer) => {
        return buffer.toString('base64');
    },

    uploadToCloud: async (buffer, ext = '.png') => {
        try {
            const filename = `enlarged_${crypto.randomUUID()}${ext}`;
            const contentType = 'image/png';
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
    }
};

class PhotoAidEnlarger {
    constructor() {
        this.token = null;
        this.tokenTimestamp = 0;
        this.tokenTTL = 3600000; // 1 jam
    }

    async getToken() {
        const now = Date.now();
        
        // Cek jika token masih valid
        if (this.token && (now - this.tokenTimestamp) < this.tokenTTL) {
            return this.token;
        }

        try {
            const response = await axios.post(
                CONFIG.BASE_URL + CONFIG.ENDPOINTS.TOKEN,
                null,
                { headers: CONFIG.HEADERS }
            );
            
            this.token = response.data?.clientToken || response.data?.token;
            this.tokenTimestamp = now;
            
            if (!this.token) {
                throw new Error('Failed to get token from API');
            }
            
            console.log(`Token obtained: ${this.token.substring(0, 20)}...`);
            return this.token;
        } catch (error) {
            console.error(`Token Error: ${error.message}`);
            throw error;
        }
    }

    async uploadImage(imageInput) {
        try {
            // Download image jika input URL
            const imageBuffer = await utils.downloadImage(imageInput);
            if (!imageBuffer) {
                throw new Error('Failed to process image input');
            }

            const base64Image = utils.bufferToBase64(imageBuffer);
            const token = await this.getToken();

            const payload = {
                base64: base64Image,
                token: token,
                reqURL: '/ai-image-enlarger/upload'
            };

            const response = await axios.post(
                CONFIG.BASE_URL + CONFIG.ENDPOINTS.UPLOAD,
                JSON.stringify(payload),
                { headers: CONFIG.HEADERS }
            );

            if (!response.data?.request_id) {
                console.error('Upload response:', response.data);
                throw new Error('No request_id received from upload API');
            }

            console.log(`Upload successful. Request ID: ${response.data.request_id}`);
            return response.data.request_id;
        } catch (error) {
            console.error(`Upload Error: ${error.message}`);
            throw error;
        }
    }

    async getResult(requestId) {
        try {
            const payload = {
                request_id: requestId,
                reqURL: '/ai-image-enlarger/result'
            };

            const response = await axios.post(
                CONFIG.BASE_URL + CONFIG.ENDPOINTS.RESULT,
                JSON.stringify(payload),
                { headers: CONFIG.HEADERS }
            );

            return response.data;
        } catch (error) {
            console.error(`Result Error: ${error.message}`);
            throw error;
        }
    }

    async enlarge(imageInput, options = {}) {
        const {
            maxAttempts = 30,
            checkInterval = 3000
        } = options;

        try {
            console.log('Starting image enlargement process...');
            
            // Step 1: Upload image
            const requestId = await this.uploadImage(imageInput);
            
            // Step 2: Poll for result
            console.log(`Processing image (ID: ${requestId})...`);
            
            let attempts = 0;
            let resultData = null;
            
            while (attempts < maxAttempts) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                
                resultData = await this.getResult(requestId);
                
                if (resultData.statusAPI === 'ready') {
                    console.log(`Image processed successfully after ${attempts} attempts`);
                    break;
                }
                
                const dots = '.'.repeat((attempts % 3) + 1);
                process.stdout.write(`\rStatus: Processing${dots} (${attempts}/${maxAttempts})`);
            }
            
            console.log(''); // New line after progress
            
            if (!resultData || resultData.statusAPI !== 'ready') {
                throw new Error(`Processing timeout after ${attempts} attempts`);
            }
            
            if (!resultData.result) {
                throw new Error('No result data received');
            }
            
            // Convert base64 result to buffer
            const resultBuffer = Buffer.from(resultData.result, 'base64');
            
            return {
                success: true,
                buffer: resultBuffer,
                requestId: requestId,
                attempts: attempts,
                originalSize: resultData.original_size,
                enlargedSize: resultData.enlarged_size,
                scale: resultData.scale
            };
        } catch (error) {
            console.error(`Enlarger Error: ${error.message}`);
            return {
                success: false,
                msg: error.message
            };
        }
    }
}

// Module Export untuk API
module.exports = {
    name: "PhotoAid AI Enlarger",
    desc: "AI Image Enlarger - Enhance and upscale images using AI",
    category: "AI-IMAGE",
    params: ["image"],
    async run(req, res) {
        try {
            const imageUrl = req.query.image;
            
            // ── Validasi ──
            if (!imageUrl) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "image" diperlukan (URL gambar)'
                });
            }
            
            // ── Validasi URL ──
            if (!imageUrl.startsWith('http')) {
                return res.status(400).json({
                    status: false,
                    error: 'Hanya URL gambar yang didukung. Contoh: https://example.com/image.jpg'
                });
            }
            
            console.log(`Processing image from URL: ${imageUrl}`);
            
            const enlarger = new PhotoAidEnlarger();
            const result = await enlarger.enlarge(imageUrl, {
                maxAttempts: 40, // Maksimal ~2 menit
                checkInterval: 3000 // Cek setiap 3 detik
            });
            
            if (!result.success) {
                return res.status(500).json({ 
                    status: false, 
                    error: result.msg 
                });
            }
            
            // Upload ke cloud storage
            console.log('Uploading result to cloud...');
            const cloudUrl = await utils.uploadToCloud(result.buffer);
            
            if (!cloudUrl) {
                return res.status(500).json({ 
                    status: false, 
                    error: 'Failed to upload result to cloud' 
                });
            }
            
            // ── Return ──
            res.status(200).json({
                status: true,
                data: {
                    url: cloudUrl,
                    requestId: result.requestId,
                    attempts: result.attempts,
                    originalSize: result.originalSize,
                    enlargedSize: result.enlargedSize,
                    scale: result.scale,
                    note: "Image enlarged and uploaded to cloud storage"
                }
            });
            
        } catch (error) {
            console.error(`[PhotoAid API Error]: ${error.message}`);
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
