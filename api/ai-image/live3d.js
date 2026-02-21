const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const CONFIG = {
    BASE_URL: 'https://app.live3d.io',
    CDN_URL: 'https://temp.live3d.io/',
    ENDPOINTS: {
        UPLOAD: '/aitools/upload-img',
        CREATE: '/aitools/of/create',
        STATUS: '/aitools/of/check-status'
    },
    SECRETS: {
        FP: '78dc286eaeb7fb88586e07f0d18bf61b',
        APP_ID: 'aifaceswap',
        PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`
    },
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'sec-ch-ua-platform': '"Android"',
        'theme-version': '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q',
        'origin': 'https://live3d.io',
        'referer': 'https://live3d.io/',
        'priority': 'u=1, i'
    }
};

const utils = {
    genHex: (bytes) => crypto.randomBytes(bytes).toString('hex'),
    
    genRandomString: (length) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    },

    aesEncrypt: (plaintext, keyStr, ivStr) => {
        const key = Buffer.from(keyStr, 'utf8');
        const iv = Buffer.from(ivStr, 'utf8');
        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },

    rsaEncrypt: (data) => {
        const buffer = Buffer.from(data, 'utf8');
        const encrypted = crypto.publicEncrypt({
            key: CONFIG.SECRETS.PUBLIC_KEY,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, buffer);
        return encrypted.toString('base64');
    },

    generateHeaders: () => {
        const aesKey = utils.genRandomString(16);
        const xCode = Date.now().toString();
        const xGuide = utils.rsaEncrypt(aesKey);
        const plaintextFp = `${CONFIG.SECRETS.APP_ID}:${CONFIG.SECRETS.FP}`;
        const fp1 = utils.aesEncrypt(plaintextFp, aesKey, aesKey);

        return {
            ...CONFIG.HEADERS,
            'x-code': xCode,
            'x-guide': xGuide,
            'fp': CONFIG.SECRETS.FP,
            'fp1': fp1
        };
    },

    downloadImage: async (url) => {
        try {
            const response = await axios.get(url, { 
                responseType: 'arraybuffer',
                timeout: 30000 
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error(`Download Error: ${error.message}`);
            return null;
        }
    },

    uploadToCloud: async (buffer, ext = '.png') => {
        try {
            const filename = `live3d-${crypto.randomUUID()}${ext}`;
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
    },

    // NEW: Convert buffer to base64 without filesystem
    bufferToBase64: (buffer) => {
        return buffer.toString('base64');
    }
};

const handleLive3DGenerate = async (imageInput, options = {}) => {
    const {
        prompt = "best quality, naked, nude",
        cloth_type = "full_outfits",
        request_from = 9
    } = options;

    const originFrom = utils.genHex(8);
    
    console.log(`Live3D Process [Hex: ${originFrom}]`);

    try {
        let imageBuffer;
        
        // Handle input type - NO FILESYSTEM ACCESS
        if (Buffer.isBuffer(imageInput)) {
            imageBuffer = imageInput;
        } else if (imageInput.startsWith('http')) {
            imageBuffer = await utils.downloadImage(imageInput);
            if (!imageBuffer) return { 
                success: false, 
                msg: 'Failed to download image from URL' 
            };
        } else {
            // Jika input adalah path file, kita tidak bisa akses filesystem
            // Alternatif: minta user upload file langsung atau pakai URL
            return { 
                success: false, 
                msg: 'File path not supported in this environment. Please use URL or direct buffer.' 
            };
        }

        // Step 1: Upload image langsung dari buffer
        console.log(`[1/4] Preparing upload...`);
        
        const form = new FormData();
        // Upload langsung dari buffer tanpa file system
        form.append('file', imageBuffer, {
            filename: `upload_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        });
        form.append('fn_name', 'cloth-change');
        form.append('request_from', request_from.toString());
        form.append('origin_from', originFrom);

        const uploadHeaders = { 
            ...utils.generateHeaders(), 
            ...form.getHeaders() 
        };
        
        console.log(`[2/4] Uploading image...`);
        const uploadRes = await axios.post(CONFIG.BASE_URL + CONFIG.ENDPOINTS.UPLOAD, form, { 
            headers: uploadHeaders,
            timeout: 60000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
        
        let serverPath = uploadRes.data?.data;
        if (typeof serverPath === 'object' && serverPath.path) {
            serverPath = serverPath.path;
        }

        if (!serverPath) {
            console.log('Upload response:', uploadRes.data);
            return { success: false, msg: 'Failed to get server path after upload' };
        }

        console.log(`[3/4] Starting generation...`);
        
        // Step 2: Submit generation task
        const submitPayload = {
            "fn_name": "cloth-change",
            "call_type": 3,
            "input": {
                "source_image": serverPath,
                "prompt": prompt,
                "cloth_type": cloth_type,
                "request_from": request_from,
                "type": 1
            },
            "request_from": request_from,
            "origin_from": originFrom
        };

        const submitRes = await axios.post(CONFIG.BASE_URL + CONFIG.ENDPOINTS.CREATE, submitPayload, {
            headers: { ...utils.generateHeaders(), 'Content-Type': 'application/json' },
            timeout: 30000
        });

        const taskId = submitRes.data?.data?.task_id;
        if (!taskId) {
            return { success: false, msg: 'Failed to get Task ID' };
        }

        console.log(`Task ID: ${taskId}`);

        // Step 3: Check status and wait for result
        let isCompleted = false;
        let attempts = 0;
        let resultUrl = null;
        const maxAttempts = 60; // ~3 minutes max
        let lastStatus = '';

        while (!isCompleted && attempts < maxAttempts) {
            attempts++;
            await new Promise(r => setTimeout(r, 3000)); // Wait 3 seconds

            const statusPayload = {
                "task_id": taskId,
                "fn_name": "cloth-change",
                "call_type": 3,
                "consume_type": 0,
                "request_from": request_from,
                "origin_from": originFrom
            };

            try {
                const statusRes = await axios.post(CONFIG.BASE_URL + CONFIG.ENDPOINTS.STATUS, statusPayload, {
                    headers: { ...utils.generateHeaders(), 'Content-Type': 'application/json' },
                    timeout: 10000
                });

                const data = statusRes.data?.data;
                if (!data) continue;

                const status = data.status;
                
                if (status === 2) { // Success
                    resultUrl = data.result_image;
                    if (resultUrl && !resultUrl.startsWith('http')) {
                        resultUrl = CONFIG.CDN_URL + resultUrl;
                    }
                    isCompleted = true;
                    lastStatus = 'Success';
                    console.log(`✓ Generation completed!`);
                } else if (status === 1) { // Generating
                    lastStatus = `Generating...`;
                } else { // Queue
                    lastStatus = `Queue (Rank ${data.rank || 'unknown'})`;
                }
                
                // Update progress
                process.stdout.write(`\r[4/4] Status: ${lastStatus} (${attempts}/${maxAttempts})`);
            } catch (statusError) {
                console.log(`\nStatus check error: ${statusError.message}`);
            }
        }

        console.log(''); // New line after progress

        if (!resultUrl) {
            return { 
                success: false, 
                msg: `Generation timeout after ${attempts} attempts` 
            };
        }

        // Step 4: Download and upload to cloud
        console.log(`Downloading result...`);
        const resultBuffer = await utils.downloadImage(resultUrl);
        if (!resultBuffer) {
            return { 
                success: false, 
                msg: 'Failed to download result image' 
            };
        }

        console.log(`Uploading to cloud...`);
        const cloudUrl = await utils.uploadToCloud(resultBuffer);
        if (!cloudUrl) {
            return { 
                success: false, 
                msg: 'Failed to upload result to cloud' 
            };
        }

        return {
            success: true,
            resultUrl: cloudUrl,
            originalUrl: resultUrl,
            taskId: taskId,
            attempts: attempts,
            prompt: prompt,
            cloth_type: cloth_type,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error(`\n[Live3D Error]: ${error.message}`);
        if (error.response?.data) {
            console.error(`Server Response:`, JSON.stringify(error.response.data, null, 2));
        }
        
        return { 
            success: false, 
            msg: error.message,
            errorData: error.response?.data 
        };
    }
};

module.exports = {
    name: "Live3D AI Fix",
    desc: "AI Cloth Remover Generator - Remove clothes from images",
    category: "Style Changer",
    params: ["image", "_prompt", "_cloth_type"],
    async run(req, res) {
        try {
            const image = req.query.image;
            const prompt = req.query.prompt || "best quality, naked, nude";
            const cloth_type = req.query.cloth_type || "full_outfits";

            // ── Validasi ──
            if (!image) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "image" diperlukan (URL gambar)'
                });
            }

            // ── Validasi input harus URL ──
            if (!image.startsWith('http')) {
                return res.status(400).json({
                    status: false,
                    error: 'Hanya URL gambar yang didukung di environment ini. Contoh: https://example.com/image.jpg'
                });
            }

            // ── Validasi cloth_type ──
            const validClothTypes = [
                "full_outfits", 
                "upper_body", 
                "lower_body", 
                "dresses", 
                "skirts"
            ];
            
            if (!validClothTypes.includes(cloth_type)) {
                return res.status(400).json({
                    status: false,
                    error: `cloth_type tidak valid. Pilih: ${validClothTypes.join(', ')}`
                });
            }

            console.log(`Starting Live3D generation for URL: ${image}`);
            
            const result = await handleLive3DGenerate(image, {
                prompt: prompt,
                cloth_type: cloth_type,
                request_from: 9
            });

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
                    url: result.resultUrl,
                    originalUrl: result.originalUrl,
                    taskId: result.taskId,
                    attempts: result.attempts,
                    prompt: result.prompt,
                    cloth_type: result.cloth_type,
                    timestamp: result.timestamp,
                    note: "Result uploaded to cloud storage"
                }
            });

        } catch (error) {
            console.error(`[Live3D API Error]: ${error.message}`);
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
