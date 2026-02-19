const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://generator.email/';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

module.exports = {
    name: "Temp Mail Generate",
    desc: "Membuat alamat email sementara baru",
    category: "TOOLS",
    params: [],
    async run(req, res) {
        try {
            // 1. Fetch Home untuk ambil email acak
            const response = await axios.get(BASE_URL, { headers: HEADERS });
            const $ = cheerio.load(response.data);
            const email = $('#email_ch_text').text();

            if (!email) throw new Error('Gagal men-generate email');

            // 2. Validasi Domain
            const [user, domain] = email.split('@');
            const { data: v } = await axios.post(BASE_URL + 'check_adres_validation3.php', 
                new URLSearchParams({ usr: user, dmn: domain }), 
                { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    email: email,
                    user: user,
                    domain: domain,
                    status: v.status || 'good',
                    refresh_in: v.uptime || '0'
                }
            });

        } catch (error) {
            res.status(500).json({ status: false, creator: "shannz", error: error.message });
        }
    }
};
