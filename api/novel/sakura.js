const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
    BASE_URL: 'https://sakuranovel.id',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://sakuranovel.id/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
};

const scraper = {
    scrapeHome: async (page = 1) => {
        try {
            console.log(`📖 Scraping SakuraNovel page ${page}...`);
            
            const url = page === 1 
                ? CONFIG.BASE_URL 
                : `${CONFIG.BASE_URL}/page/${page}/`;
            
            const { data: html } = await axios.get(url, { 
                headers: CONFIG.HEADERS,
                timeout: 15000 
            });
            
            const $ = cheerio.load(html);
            const results = [];
            
            // Selector untuk novel items
            $('.listupd article, .bsx, .bs').each((i, element) => {
                const $el = $(element);
                
                const title = $el.find('.tt, h2, .entry-title').text().trim();
                const link = $el.find('a').first().attr('href') || '';
                const poster = $el.find('img').first().attr('src') || 
                             $el.find('img').first().attr('data-src') || '';
                const latestChapter = $el.find('.epxs, .chapter, .latest').text().trim();
                const type = $el.find('.type, .typez').text().trim() || 'Novel';
                
                if (title && link) {
                    // Extract slug from URL
                    const slug = link.replace(CONFIG.BASE_URL, '')
                                    .replace(/^\//, '')
                                    .replace(/\/$/, '')
                                    .split('/').pop();
                    
                    results.push({
                        title,
                        slug,
                        poster,
                        latest_chapter: latestChapter || 'N/A',
                        type
                    });
                }
            });
            
            // Pagination
            const hasNext = $('.pagination .next, .hpage a.r').length > 0;
            const nextPage = page + 1;
            
            console.log(`✓ Found ${results.length} novels on page ${page}`);
            
            return {
                success: true,
                pagination: {
                    currentPage: page,
                    hasNext: hasNext,
                    nextPageUrl: hasNext ? `${CONFIG.BASE_URL}/page/${nextPage}/` : null,
                    nextPageEndpoint: hasNext ? `/novel/sakuranovel/home?page=${nextPage}` : null
                },
                results
            };
            
        } catch (error) {
            console.error(`❌ Scrape Error: ${error.message}`);
            return {
                success: false,
                msg: error.message,
                errorDetails: error.response?.data
            };
        }
    }
};

module.exports = {
    name: "SakuraNovel",
    desc: "Scrape novel list from SakuraNovel.id",
    category: "Novel",
    params: ["_page"], // Opsional, default = 1
    
    async run(req, res) {
        try {
            // Default page = 1 kalau tidak ada
            const page = parseInt(req.query.page) || 1;
            
            // Validasi page number
            if (page < 1) {
                return res.status(400).json({
                    status: false,
                    error: 'Page harus lebih dari 0'
                });
            }
            
            console.log(`📥 Request: Page ${page}`);
            
            const result = await scraper.scrapeHome(page);
            
            if (!result.success) {
                return res.status(500).json({
                    status: false,
                    error: result.msg,
                    details: result.errorDetails
                });
            }
            
            // ── Return ──
            res.status(200).json({
                status: true,
                creator: "Sanka Vollerei",
                data: {
                    pagination: result.pagination,
                    results: result.results
                }
            });
            
        } catch (error) {
            console.error(`[API Error]: ${error.message}`);
            res.status(500).json({
                status: false,
                statusCode: 500,
                creator: "Sanka Vollerei",
                error: error.message
            });
        }
    }
};
