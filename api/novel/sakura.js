const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
    BASE_URL: 'https://sakuranovel.id',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://sakuranovel.id/'
    }
};

const utils = {
    // Random delay untuk menghindari rate limit
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Fetch dengan retry
    fetchWithRetry: async (url, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`🔄 Attempt ${i + 1}/${maxRetries}...`);
                
                // Random delay antara 1-3 detik
                if (i > 0) {
                    const delayTime = Math.floor(Math.random() * 2000) + 1000;
                    console.log(`⏳ Waiting ${delayTime}ms before retry...`);
                    await utils.delay(delayTime);
                }
                
                const response = await axios.get(url, { 
                    headers: CONFIG.HEADERS,
                    timeout: 20000,
                    maxRedirects: 5,
                    validateStatus: (status) => status < 500 // Accept 4xx errors
                });
                
                if (response.status === 403) {
                    throw new Error('Access Forbidden (403)');
                }
                
                return response;
                
            } catch (error) {
                console.error(`❌ Attempt ${i + 1} failed: ${error.message}`);
                
                if (i === maxRetries - 1) {
                    throw error;
                }
            }
        }
    }
};

const scraper = {
    scrapeHome: async (page = 1) => {
        try {
            console.log(`📖 Scraping SakuraNovel page ${page}...`);
            
            const url = page === 1 
                ? CONFIG.BASE_URL 
                : `${CONFIG.BASE_URL}/page/${page}/`;
            
            const { data: html } = await utils.fetchWithRetry(url);
            
            const $ = cheerio.load(html);
            const results = [];
            
            // Multiple selectors untuk berbagai kemungkinan struktur
            const selectors = [
                '.listupd article',
                '.bsx',
                '.bs',
                'article.item',
                '.entry',
                '.post'
            ];
            
            let found = false;
            for (const selector of selectors) {
                const items = $(selector);
                if (items.length > 0) {
                    console.log(`✓ Using selector: ${selector} (${items.length} items)`);
                    
                    items.each((i, element) => {
                        const $el = $(element);
                        
                        // Find title dengan berbagai kemungkinan selector
                        const title = $el.find('.tt, h2, .entry-title, .title, a[title]').first().text().trim() ||
                                     $el.find('a').first().attr('title') || '';
                        
                        // Find link
                        const link = $el.find('a').first().attr('href') || '';
                        
                        // Find poster/image
                        const poster = $el.find('img').first().attr('src') || 
                                     $el.find('img').first().attr('data-src') ||
                                     $el.find('img').first().attr('data-lazy-src') || '';
                        
                        // Find latest chapter
                        const latestChapter = $el.find('.epxs, .chapter, .latest, .lsch').first().text().trim();
                        
                        // Find type
                        const type = $el.find('.type, .typez, .genre').first().text().trim() || 'Novel';
                        
                        if (title && link) {
                            // Extract slug from URL
                            const slug = link.replace(CONFIG.BASE_URL, '')
                                            .replace(/^\//, '')
                                            .replace(/\/$/, '')
                                            .split('/').filter(s => s).pop();
                            
                            results.push({
                                title,
                                slug,
                                poster,
                                latest_chapter: latestChapter || 'N/A',
                                type
                            });
                        }
                    });
                    
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                console.log('⚠️ No items found with standard selectors, trying alternative...');
                
                // Fallback: cari semua link yang mungkin novel
                $('a[href*="sakuranovel.id"]').each((i, el) => {
                    const $el = $(el);
                    const title = $el.attr('title') || $el.text().trim();
                    const link = $el.attr('href');
                    
                    if (title && link && link.includes('sakuranovel.id') && 
                        !link.includes('/page/') && !link.includes('/category/')) {
                        
                        const slug = link.replace(CONFIG.BASE_URL, '')
                                        .replace(/^\//, '')
                                        .replace(/\/$/, '')
                                        .split('/').filter(s => s).pop();
                        
                        if (slug && !results.some(r => r.slug === slug)) {
                            results.push({
                                title,
                                slug,
                                poster: '',
                                latest_chapter: 'N/A',
                                type: 'Novel'
                            });
                        }
                    }
                });
            }
            
            // Pagination check
            const paginationSelectors = [
                '.pagination .next',
                '.hpage a.r',
                'a[rel="next"]',
                '.nav-links .next'
            ];
            
            let hasNext = false;
            for (const selector of paginationSelectors) {
                if ($(selector).length > 0) {
                    hasNext = true;
                    break;
                }
            }
            
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
            
            // Cek apakah error 403
            if (error.message.includes('403')) {
                return {
                    success: false,
                    msg: 'Website memblokir akses (403 Forbidden). Coba gunakan proxy atau VPN.',
                    errorCode: 403
                };
            }
            
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
    params: ["_page"],
    
    async run(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            
            if (page < 1) {
                return res.status(400).json({
                    status: false,
                    error: 'Page harus lebih dari 0'
                });
            }
            
            console.log(`📥 Request: Page ${page}`);
            
            const result = await scraper.scrapeHome(page);
            
            if (!result.success) {
                const statusCode = result.errorCode || 500;
                return res.status(statusCode).json({
                    status: false,
                    error: result.msg,
                    details: result.errorDetails,
                    suggestion: result.errorCode === 403 
                        ? 'Website memblokir scraping. Solusi: 1) Gunakan proxy, 2) Tambahkan delay, 3) Gunakan browser automation (Puppeteer)'
                        : null
                });
            }
            
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
