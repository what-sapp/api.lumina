const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const FormData = require('form-data');

/**
 * CONFIG & HELPERS
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const genxfpid = () => {
    const p1 = crypto.randomBytes(16).toString('hex');
    const p2 = crypto.randomBytes(32).toString('hex');
    return Buffer.from(`${p1}.${p2}`).toString('base64');
};

const HEADERS_BASE = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'origin': 'https://nanana.app',
    'referer': 'https://nanana.app/en'
};

/**
 * ACCOUNT GENERATOR & AUTH ENGINE
 */
const nananaAuth = {
    getOTP: async (username) => {
        const url = `https://akunlama.com/api/v1/mail/list?recipient=${username}`;
        for (let i = 0; i < 20; i++) { // Max 1 menit polling
            const res = await axios.get(url).catch(() => ({ data: [] }));
            if (res.data.length > 0) {
                const { region, key } = res.data[0].storage;
                const { data: html } = await axios.get(`https://akunlama.com/api/v1/mail/getHtml?region=${region}&key=${key}`);
                const otp = html.match(/\b\d{6}\b/)?.[0];
                if (otp) return otp;
            }
            await delay(3000);
        }
        throw new Error("OTP Timeout!");
    },

    getHeaders: async () => {
        const username = crypto.randomBytes(6).toString('hex');
        const email = `${username}@akunlama.com`;
        
        await axios.post('https://nanana.app/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' }, { headers: HEADERS_BASE });
        const otp = await nananaAuth.getOTP(username);

        const login = await axios.post('https://nanana.app/api/auth/sign-in/email-otp', { email, otp }, { headers: HEADERS_BASE });
        const cookie = login.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';

        return { ...HEADERS_BASE, 'Cookie': cookie, 'x-fp-id': genxfpid() };
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Nanana AI (Image-to-Image)",
    desc: "Transformasi gambar menggunakan prompt (Anime, Emotion, Style, etc)",
    category: "AI TOOLS",
    params: ["url", "prompt"],
    async run(req, res) {
        try {
            const { url, prompt } = req.query;

            if (!url || !prompt) {
                return res.status(400).json({ status: false, error: 'Parameter "url" & "prompt" wajib diisi!' });
            }

            console.log(`Nanana Processing: ${prompt}`);

            // 1. Auth & Login
            const auth = await nananaAuth.getHeaders();

            // 2. Upload Image (From URL to Nanana)
            const imgRes = await axios.get(url, { responseType: 'arraybuffer' });
            const form = new FormData();
            form.append('image', Buffer.from(imgRes.data), { filename: 'input.jpg', contentType: 'image/jpeg' });

            const { data: up } = await axios.post('https://nanana.app/api/upload-img', form, {
                headers: { ...auth, ...form.getHeaders() }
            });

            // 3. Create Job
            const { data: job } = await axios.post('https://nanana.app/api/image-to-image', {
                prompt, image_urls: [up.url]
            }, { headers: { ...auth, 'Content-Type': 'application/json' } });

            // 4. Polling Result
            let result;
            let attempts = 0;
            while (attempts < 12) { // Max 1 minute wait
                await delay(5000);
                const { data: cek } = await axios.post('https://nanana.app/api/get-result', {
                    requestId: job.request_id, type: 'image-to-image'
                }, { headers: { ...auth, 'Content-Type': 'application/json' } });
                
                if (cek.completed) {
                    result = cek.data.images[0].url;
                    break;
                }
                attempts++;
            }

            if (!result) throw new Error("Processing timeout");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    job_id: job.request_id,
                    original: url,
                    output: result
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
