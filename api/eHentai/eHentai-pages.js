const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'E-Hentai Gallery Pages',
    desc: 'JSON Response | Get multiple pages from gallery (1-50 pages)',
    category: 'E-Hentai',
    params: ['url', 'maxPages'],
    async run(req, res) {
        try {
            const url = req.query.url;
            const maxPages = parseInt(req.query.maxPages) || 20;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    error: "Parameter 'url' is required"
                });
            }

            if (maxPages > 50) {
                return res.status(400).json({
                    status: false,
                    error: "maxPages cannot exceed 50 to prevent timeout"
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

            // Helper function untuk get single page
            const getPage = async (pageUrl) => {
                const response = await axios.get(pageUrl, { headers, timeout: 15000 });
                const $ = cheerio.load(response.data);
                
                const title = $('h1').text().trim();
                const imageUrl = $('#img').attr('src');
                const imageInfo = $('#i2 > div:nth-child(2)').text().trim();
                const currentPage = parseInt($('#i2 .sn div span:first-child').text()) || 1;
                const totalPages = parseInt($('#i2 .sn div span:last-child').text()) || 1;
                const nextLink = $('#next').attr('href');
                const prevLink = $('#prev').attr('href');
                const downloadLink = $('#i6 a:contains("Download original")').attr('href');
                
                const scriptContent = response.data;
                const gidMatch = scriptContent.match(/var gid=(\d+)/);
                const gid = gidMatch ? gidMatch[1] : null;
                
                return {
                    title,
                    imageUrl,
                    imageInfo,
                    currentPage,
                    totalPages,
                    nextLink,
                    prevLink,
                    downloadLink,
                    gid,
                    fullUrl: pageUrl
                };
            };

            const results = [];
            const urls = new Set();
            
            // Ambil starting page
            const startData = await getPage(url);
            const startPage = startData.currentPage;
            
            // Jika start page <= maxPages, navigasi ke depan
            if (startPage <= maxPages) {
                let currentUrl = url;
                let currentData = startData;
                
                // Navigasi ke depan sampai maxPages
                while (currentData && currentData.currentPage <= maxPages) {
                    if (!urls.has(currentUrl)) {
                        results.push(currentData);
                        urls.add(currentUrl);
                    }
                    
                    if (currentData.nextLink && currentData.currentPage < maxPages) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        currentUrl = currentData.nextLink;
                        currentData = await getPage(currentUrl);
                    } else {
                        break;
                    }
                }
                
                // Jika masih kurang dari maxPages, ambil dari belakang
                if (startPage > 1 && results.length < maxPages) {
                    currentUrl = startData.prevLink;
                    while (currentUrl && results.length < maxPages) {
                        const pageData = await getPage(currentUrl);
                        
                        if (!urls.has(currentUrl) && pageData.currentPage >= 1) {
                            results.unshift(pageData);
                            urls.add(currentUrl);
                        }
                        
                        if (pageData.prevLink && pageData.currentPage > 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            currentUrl = pageData.prevLink;
                        } else {
                            break;
                        }
                    }
                }
                
            } else {
                // Jika start page > maxPages, navigasi ke belakang
                let currentUrl = url;
                let currentData = startData;
                
                while (currentData && results.length < maxPages) {
                    if (!urls.has(currentUrl)) {
                        results.unshift(currentData);
                        urls.add(currentUrl);
                    }
                    
                    if (currentData.prevLink && currentData.currentPage > 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        currentUrl = currentData.prevLink;
                        currentData = await getPage(currentUrl);
                    } else {
                        break;
                    }
                }
            }
            
            // Sort dan filter
            results.sort((a, b) => a.currentPage - b.currentPage);
            const filteredResults = results.filter(r => r.currentPage >= 1 && r.currentPage <= maxPages);
            
            res.status(200).json({
                status: true,
                data: {
                    totalPages: filteredResults.length,
                    requestedMaxPages: maxPages,
                    startPage: filteredResults[0]?.currentPage || 0,
                    endPage: filteredResults[filteredResults.length - 1]?.currentPage || 0,
                    pages: filteredResults
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
