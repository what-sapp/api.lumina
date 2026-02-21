const axios = require('axios');
const cheerio = require('cheerio');

/**
 * CONFIG & SESSION STORE
 */
const delay = ms => new Promise(r => setTimeout(r, ms));
let currentAuth = { cookies: '', expiry: 0 };

const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'origin': 'https://nanobanana.org',
    'referer': 'https://nanobanana.org/sora2'
};

/**
 * AUTH ENGINE (Auto Signup/Login)
 */
const soraAuth = {
    async generateSession() {
        const name = Math.random().toString(36).substring(2, 10);
        const email = `${name}@akunlama.com`;
        const cookieJar = {};

        const save = (res) => {
            const sc = res.headers['set-cookie'];
            if (sc) sc.forEach(c => {
                const [p] = c.split(';');
                const [k, v] = p.split('=');
                cookieJar[k] = v;
            });
        };

        const getK = () => Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');

        // 1. Send OTP
        const res1 = await axios.post('https://nanobanana.org/api/auth/send-code', { email }, { headers });
        save(res1);

        // 2. Get OTP from Akunlama
        let otp = null;
        for (let i = 0; i < 20; i++) {
            await delay(3000);
            const resM = await axios.get(`https://akunlama.com/api/v1/mail/list?recipient=${name}`);
            if (resM.data.length > 0) {
                const mail = resM.data[0];
                const resH = await axios.get(`https://akunlama.com/api/v1/mail/getHtml?region=${mail.storage.region}&key=${mail.storage.key}`);
                otp = resH.data.match(/sign in:\s*(\d{6})/)?.[1];
                if (otp) break;
            }
        }
        if (!otp) throw new Error("OTP Timeout");

        // 3. Get CSRF & Login
        const resC = await axios.get('https://nanobanana.org/api/auth/csrf', { headers: { ...headers, Cookie: getK() } });
        save(resC);
        
        const resL = await axios.post('https://nanobanana.org/api/auth/callback/email-code', 
            new URLSearchParams({ email, code: otp, redirect: 'false', csrfToken: resC.data.csrfToken, callbackUrl: 'https://nanobanana.org/sora2' }).toString(),
            { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: getK() } }
        );
        save(resL);

        currentAuth = { cookies: getK(), expiry: Date.now() + (3600 * 1000) }; // Valid 1 jam
        return currentAuth.cookies;
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Sora AI Video",
    desc: "Generate video dari teks (Text-to-Video) menggunakan model Sora 2",
    category: "AI VIDEO",
    params: ["prompt", "aspect"], // aspect: landscape / portrait
    async run(req, res) {
        try {
            const { prompt, aspect = 'landscape' } = req.query;
            if (!prompt) return res.status(400).json({ status: false, error: 'Prompt wajib diisi!' });

            console.log(`Sora AI generating: ${prompt}`);

            // Pakai session lama atau buat baru
            const cookies = (Date.now() < currentAuth.expiry) ? currentAuth.cookies : await soraAuth.generateSession();

            // 1. Submit Job
            const { data: sub } = await axios.post('https://nanobanana.org/api/sora2/submit', 
                { model: 'sora2', type: 'text-to-video', prompt, aspect_ratio: aspect, n_frames: '10', remove_watermark: true },
                { headers: { ...headers, 'Content-Type': 'application/json', Cookie: cookies } }
            );

            const taskId = sub.task_id;
            let result;
            const wait = ['processing', 'pending', 'queue', 'in_queue', 'starting'];

            // 2. Polling (Video AI butuh waktu, kita cek tiap 10 detik)
            for (let i = 0; i < 30; i++) {
                await delay(10000);
                const { data: check } = await axios.get(`https://nanobanana.org/api/sora2/status/${taskId}`, {
                    headers: { ...headers, Cookie: cookies }
                });
                
                if (!wait.includes(check.task.status.toLowerCase())) {
                    result = check.task;
                    break;
                }
            }

            if (!result || result.status.toLowerCase() === 'failed') {
                throw new Error(result?.error_message || "Video generation failed/timeout.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    task_id: taskId,
                    prompt,
                    video_url: result.video_url || result.result
                }
            });

        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
