const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://generator.email/';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

module.exports = {
    name: "Temp Mail Inbox",
    desc: "Cek kotak masuk email sementara",
    category: "Tools",
    params: ["email"],
    async run(req, res) {
        try {
            const { email } = req.query;

            if (!email || !email.includes('@')) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "email" yang valid diperlukan!'
                });
            }

            const [user, domain] = email.split('@');
            const cookie = `surl=${domain}/${user}`;

            // Fetch inbox menggunakan Cookie session
            const { data: html } = await axios.get(BASE_URL, {
                headers: { ...HEADERS, 'Cookie': cookie }
            });

            if (html.includes('Email generator is ready')) {
                return res.status(200).json({
                    status: true,
                    creator: "shannz",
                    result: { email, count: 0, messages: [] }
                });
            }

            const $ = cheerio.load(html);
            const messages = [];

            // Scraping daftar pesan
            $('#email-table .e7m.row').each((_, el) => {
                const sp = $(el).find('.e7m.col-md-9 span');
                messages.push({
                    from: sp.eq(3).text().replace(/\(.*?\)/, '').trim(),
                    subject: $(el).find('h1').text() || 'No Subject',
                    time: $(el).find('.e7m.tooltip').text().replace('Created: ', ''),
                    preview: $(el).find('.e7m.mess_bodiyy').text().trim()
                });
            });

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    email: email,
                    count: messages.length,
                    messages: messages
                }
            });

        } catch (error) {
            res.status(500).json({ status: false, creator: "shannz", error: error.message });
        }
    }
};
