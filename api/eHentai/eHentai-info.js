const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'E-Hentai Page Info',
    desc: 'JSON Response | Get single page information',
    category: 'E-Hentai',
    params: ['url'],
    async run(req, res) {
        try {
            const url = req.query.url;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    error: "Parameter 'url' is required"
                });
            }

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 14.0; Infinix X6531B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.105 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7',
                'Referer': 'https://e-hentai.org/',
                'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"'
            };

            const response = await axios.get(url, { 
                headers,
                timeout: 30000 
            });
            
            const $ = cheerio.load(response.data);
            
            const title = $('h1').text().trim();
            const imageUrl = $('#img').attr('src');
            const imageInfo = $('#i2 > div:nth-child(2)').text().trim();
            const currentPage = parseInt($('#i2 .sn div span:first-child').text()) || 1;
            const totalPages = parseInt($('#i2 .sn div span:last-child').text()) || 1;
            const nextLink = $('#next').attr('href');
            const prevLink = $('#prev').attr('href');
            const downloadLink = $('#i6 a:contains("Download original")').attr('href');
            
            // Extract gid from script
            const scriptContent = response.data;
            const gidMatch = scriptContent.match(/var gid=(\d+)/);
            const gid = gidMatch ? gidMatch[1] : null;
            
            res.status(200).json({
                status: true,
                data: {
                    title,
                    gid,
                    imageUrl,
                    imageInfo,
                    currentPage,
                    totalPages,
                    downloadLink,
                    navigation: {
                        nextLink,
                        prevLink,
                        hasNext: !!nextLink,
                        hasPrev: !!prevLink
                    },
                    fullUrl: url
                }
            });
            
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                statusCode: 500,
                creator: "robin",
                error: error.message 
            });
        }
    }
};
