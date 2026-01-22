const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'E-Hentai Search',
    desc: 'JSON Response | Search galleries on E-Hentai',
    category: 'E-Hentai',
    params: ['query', 'page'],
    async run(req, res) {
        try {
            const query = req.query.query || req.query.q;
            const page = parseInt(req.query.page) || 0;
            
            if (!query) {
                return res.status(400).json({
                    status: false,
                    error: "Parameter 'query' is required"
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

            const searchUrl = `https://e-hentai.org/?f_search=${encodeURIComponent(query)}${page > 0 ? `&page=${page}` : ''}`;
            const response = await axios.get(searchUrl, { 
                headers,
                timeout: 30000 
            });
            
            const $ = cheerio.load(response.data);
            const galleries = [];
            
            $('.itg.gltc tr').each((i, row) => {
                if (i === 0) return;
                
                const $row = $(row);
                const link = $row.find('.gl3c.glname a').attr('href');
                const title = $row.find('.glink').first().text().trim();
                const category = $row.find('.gl1c .cn').text().trim();
                const uploader = $row.find('.gl4c a').text().trim();
                const pages = $row.find('.gl4c div:last-child').text().trim();
                const posted = $row.find('.gl2c div[id^="posted_"]').text().trim();
                const thumbnail = $row.find('.gl2c img').attr('src');
                const rating = $row.find('.gl2c .ir').text().trim();
                
                if (link && title) {
                    const urlMatch = link.match(/\/g\/(\d+)\/([a-f0-9]+)\//);
                    if (urlMatch) {
                        galleries.push({
                            gid: urlMatch[1],
                            token: urlMatch[2],
                            title,
                            category,
                            uploader,
                            pages,
                            posted,
                            rating,
                            thumbnail,
                            url: link
                        });
                    }
                }
            });
            
            const nextLink = $('#unext').attr('href');
            const hasNext = nextLink && !nextLink.includes('javascript');
            
            res.status(200).json({
                status: true,
                data: {
                    query,
                    currentPage: page,
                    totalResults: galleries.length,
                    galleries,
                    pagination: {
                        hasNext,
                        nextPage: hasNext ? page + 1 : null,
                        nextLink: hasNext ? nextLink : null
                    }
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
