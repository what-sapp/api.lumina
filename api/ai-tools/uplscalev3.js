const axios = require('axios');
const FormData = require('form-data');

/**
 * ILOVEIMG UPSCALER ENGINE
 * Feature: 2x/4x Scaling with Automatic Token Scraper
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Upscale AI v3",
    desc: "Tingkatkan kualitas gambar hingga 2x lipat menggunakan engine iLoveIMG.",
    category: "AI TOOLS",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Masukkan URL gambarnya!" });

            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

            // --- TAHAP 1: SCRAPE TOKEN & TASKID ---
            const home = await axios.get('https://www.iloveimg.com/id/tingkatkan-gambar', {
                headers: { 'User-Agent': userAgent }
            });
            const html = home.data;
            const token = html.match(/"token":"([^"]+)"/)?.[1];
            const taskId = html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1];

            if (!token || !taskId) throw new Error('Gagal bypass security iLoveIMG.');

            // --- TAHAP 2: DOWNLOAD GAMBAR USER ---
            const imgRes = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imgRes.data);

            // --- TAHAP 3: UPLOAD KE SERVER API1G ---
            const uploadForm = new FormData();
            uploadForm.append('name', 'shannz_image.jpg');
            uploadForm.append('chunk', '0');
            uploadForm.append('chunks', '1');
            uploadForm.append('task', taskId);
            uploadForm.append('preview', '1');
            uploadForm.append('v', 'web.0');
            uploadForm.append('file', buffer, { filename: 'shannz_image.jpg' });

            const upload = await axios.post('https://api1g.iloveimg.com/v1/upload', uploadForm, {
                headers: {
                    ...uploadForm.getHeaders(),
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': userAgent
                }
            });

            const serverFilename = upload.data.server_filename;

            // --- TAHAP 4: PROCESSING (UPSCALE) ---
            const processForm = new FormData();
            processForm.append('packaged_filename', 'gienetic-hd-result');
            processForm.append('multiplier', '2'); // Ubah ke '4' jika ingin lebih besar
            processForm.append('task', taskId);
            processForm.append('tool', 'upscaleimage');
            processForm.append('files[0][server_filename]', serverFilename);
            processForm.append('files[0][filename]', 'shannz_image.jpg');

            const process = await axios.post('https://api1g.iloveimg.com/v1/process', processForm, {
                headers: {
                    ...processForm.getHeaders(),
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': userAgent,
                    'Origin': 'https://www.iloveimg.com'
                }
            });

            if (process.data.status !== 'TaskSuccess') throw new Error('Gagal memproses HD.');

            // --- FINAL: RESULT ---
            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                engine: "iLoveIMG High-Res",
                result: {
                    url: `https://api1g.iloveimg.com/v1/download/${taskId}`,
                    filename: process.data.download_filename,
                    size_output: process.data.output_filesize,
                    timer: process.data.timer
                }
            });

        } catch (error) {
            console.error('iLove Error:', error.message);
            res.status(500).json({ 
                status: false, 
                error: "Duh, engine iLoveIMG lagi limit atau gambar terlalu besar!" 
            });
        }
    }
};
