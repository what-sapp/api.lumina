const axios = require('axios');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');

const CONFIG = {
    BASE_URL: 'https://aienhancer.ai/api/v1',
    AES_KEY: 'ai-enhancer-web__aes-key',
    AES_IV: 'aienhancer-aesiv',
    HEADERS: {
        'Content-Type': 'application/json',
        'Origin': 'https://aienhancer.ai',
        'Referer': 'https://aienhancer.ai/ai-image-editor',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
    }
};

const utils = {
    downloadImage: async (imageUrl) => {
        try {
            console.log(`Downloading image from: ${imageUrl}`);
            const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000 
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error(`Download Error: ${error.message}`);
            return null;
        }
    },

    bufferToBase64DataURI: (buffer) => {
        const base64 = buffer.toString('base64');
        return `data:image/jpeg;base64,${base64}`;
    },

    encryptSettings: (prompt) => {
        const settings = {
            prompt,
            size: '2K',
            aspect_ratio: 'match_input_image',
            output_format: 'jpeg',
            max_images: 1
        };

        return CryptoJS.AES.encrypt(
            JSON.stringify(settings),
            CryptoJS.enc.Utf8.parse(CONFIG.AES_KEY),
            {
                iv: CryptoJS.enc.Utf8.parse(CONFIG.AES_IV),
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        ).toString();
    },

    uploadToCloud: async (url, filenamePrefix = 'enhanced') => {
        try {
            console.log(`Downloading result from CDN...`);
            const response = await axios.get(url, { 
                responseType: 'arraybuffer',
                timeout: 60000 
            });
            
            const buffer = Buffer.from(response.data);
            const ext = '.jpeg';
            const filename = `${filenamePrefix}_${crypto.randomUUID()}${ext}`;
            const contentType = 'image/jpeg';
            const fileSize = buffer.length;

            console.log(`Uploading to cloud storage...`);
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
            console.log(`Upload successful: ${cloudUrl}`);
            return cloudUrl;
        } catch (error) {
            console.error(`[Upload Cloud Error]: ${error.message}`);
            return null;
        }
    }
};

const processEnhancement = async (imageUrl, prompt) => {
    console.log(`🚀 Starting AI Enhancement Process`);
    console.log(`📝 Prompt: ${prompt}`);
    
    try {
        // Step 1: Download image from URL
        const imageBuffer = await utils.downloadImage(imageUrl);
        if (!imageBuffer) {
            return { success: false, msg: 'Failed to download image from URL' };
        }
        
        console.log(`✓ Image downloaded (${imageBuffer.length} bytes)`);
        
        // Step 2: Convert to Data URI
        const imageDataURI = utils.bufferToBase64DataURI(imageBuffer);
        
        // Step 3: NSFW Check
        console.log(`🔍 Checking NSFW content...`);
        try {
            const nsfwResponse = await axios.post(
                `${CONFIG.BASE_URL}/r/nsfw-detection`,
                { image: imageDataURI },
                { headers: CONFIG.HEADERS }
            );

            const taskId = nsfwResponse.data.data?.id;
            if (taskId) {
                let nsfwChecked = false;
                for (let i = 0; i < 15; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    
                    const resultRes = await axios.post(
                        `${CONFIG.BASE_URL}/r/nsfw-detection/result`,
                        { task_id: taskId },
                        { headers: CONFIG.HEADERS }
                    );

                    if (resultRes.data.data?.status === 'succeeded') {
                        const nsfwResult = resultRes.data.data.output;
                        if (nsfwResult !== 'normal') {
                            return { 
                                success: false, 
                                msg: `Image blocked: ${nsfwResult}`,
                                nsfwResult: nsfwResult 
                            };
                        }
                        console.log(`✓ NSFW Check passed`);
                        nsfwChecked = true;
                        break;
                    }
                }
                if (!nsfwChecked) {
                    console.log(`⚠️ NSFW check timeout, continuing...`);
                }
            }
        } catch (nsfwError) {
            console.log(`⚠️ NSFW check skipped: ${nsfwError.message}`);
        }
        
        // Step 4: Create enhancement task
        console.log(`🔄 Creating enhancement task...`);
        const settings = utils.encryptSettings(prompt);
        
        const createResponse = await axios.post(
            `${CONFIG.BASE_URL}/k/image-enhance/create`,
            {
                model: 2,
                image: imageDataURI,
                function: 'ai-image-editor',
                settings: settings
            },
            { headers: CONFIG.HEADERS }
        );

        const enhanceTaskId = createResponse.data.data?.id;
        if (!enhanceTaskId) {
            throw new Error('Failed to get enhancement task ID');
        }
        
        console.log(`✓ Task created (ID: ${enhanceTaskId})`);
        
        // Step 5: Poll for result
        console.log(`⏳ Processing enhancement...`);
        let attempts = 0;
        let result = null;
        
        while (attempts < 40) {
            attempts++;
            await new Promise(r => setTimeout(r, 2500));
            
            const resultRes = await axios.post(
                `${CONFIG.BASE_URL}/k/image-enhance/result`,
                { task_id: enhanceTaskId },
                { headers: CONFIG.HEADERS }
            );

            const data = resultRes.data.data;
            
            if (data.status === 'success') {
                result = {
                    id: enhanceTaskId,
                    output: data.output,
                    input: data.input,
                    attempts: attempts
                };
                console.log(`✓ Enhancement completed after ${attempts} attempts`);
                break;
            }
            
            const dots = '.'.repeat((attempts % 3) + 1);
            process.stdout.write(`\rProcessing${dots} (${attempts}/40)`);
        }
        
        if (!result) {
            return { success: false, msg: 'Enhancement timeout after 40 attempts' };
        }
        
        // Step 6: Upload to cloud
        console.log(`☁️ Uploading results...`);
        const outputUrl = await utils.uploadToCloud(result.output, 'enhanced');
        const inputUrl = await utils.uploadToCloud(result.input, 'original');
        
        if (!outputUrl || !inputUrl) {
            return { success: false, msg: 'Failed to upload results to cloud' };
        }
        
        return {
            success: true,
            output_url: outputUrl,
            input_url: inputUrl,
            taskId: result.id,
            attempts: result.attempts,
            prompt: prompt,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return {
            success: false,
            msg: error.message,
            errorData: error.response?.data
        };
    }
};

module.exports = {
    name: "NanoBanana",
    desc: "AI Image Editor - Edit images with prompt",
    category: "AI-IMAGE",
    params: ["image", "prompt"],
    async run(req, res) {
        try {
            const imageUrl = req.query.image;
            const prompt = req.query.prompt;
            
            // ── Validasi ──
            if (!imageUrl) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "image" diperlukan (URL gambar)'
                });
            }
            
            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "prompt" diperlukan (instruksi edit)'
                });
            }
            
            if (!imageUrl.startsWith('http')) {
                return res.status(400).json({
                    status: false,
                    error: 'URL harus dimulai dengan http:// atau https://'
                });
            }
            
            console.log(`📥 Request: ${imageUrl.substring(0, 50)}...`);
            
            const result = await processEnhancement(imageUrl, prompt);
            
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
                data: {
                    enhanced_url: result.output_url,
                    original_url: result.input_url,
                    task_id: result.taskId,
                    attempts: result.attempts,
                    prompt: result.prompt,
                    timestamp: result.timestamp
                }
            });
            
        } catch (error) {
            console.error(`[API Error]: ${error.message}`);
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
