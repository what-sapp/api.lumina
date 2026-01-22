const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'E-Hentai Gallery Info',
    desc: 'JSON Response | Get gallery information from gid/token',
    category: 'E-Hentai',
    params: ['gid', 'token'],
    async run(req, res) {
        try {
            const gid = req.query.gid;
            const token = req.query.token;
            
            if (!gid || !token) {
                return res.status(400).json({
                    status: false,
                    error: "Parameters 'gid' and 'token' are required"
                });
            }

            const galleryUrl = `https://e-hentai.org/g/${gid}/${token}/`;
            const firstPageUrl = `https://e-hentai.org/s/${token}/${gid}-1`;

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 14.0; Infinix X6531B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.105 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7',
                'Referer': 'https://e-hentai.org/',
                'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"'
            };

            const response = await axios.get(galleryUrl, { 
                headers,
                timeout: 30000 
            });
            
            const $ = cheerio.load(response.data);
            
            // Gallery basic info
            const title = $('#gn').text().trim();
            const japaneseTitle = $('#gj').text().trim();
            const category = $('#gdc').text().trim();
            const uploader = $('#gdn a').text().trim();
            
            // Thumbnail
            const thumbnailStyle = $('#gd1 div').css('background-image');
            const thumbnail = thumbnailStyle ? thumbnailStyle.match(/url\((.*?)\)/)?.[1]?.replace(/['"]/g, '') : null;
            
            // Rating
            const ratingStyle = $('#rating_label').text().trim();
            const rating = parseFloat($('#rating_count').text().trim()) || 0;
            
            // Tags
            const tags = [];
            $('#taglist tr').each((i, row) => {
                const $row = $(row);
                const category = $row.find('.tc').text().replace(':', '').trim();
                const tagList = [];
                
                $row.find('.gt').each((j, tag) => {
                    tagList.push($(tag).text().trim());
                });
                
                if (category && tagList.length > 0) {
                    tags.push({
                        category,
                        tags: tagList
                    });
                }
            });
            
            // Stats
            const length = $('#gdd .gdt2').eq(0).text().trim();
            const favorited = $('#gdd .gdt2').eq(1).text().trim();
            const posted = $('#gdd .gdt2').eq(2).text().trim();
            const fileSize = $('#gdd .gdt2').eq(4).text().trim();
            
            res.status(200).json({
                status: true,
                data: {
                    gid,
                    token,
                    title,
                    japaneseTitle,
                    category,
                    uploader,
                    thumbnail,
                    rating,
                    ratingLabel: ratingStyle,
                    stats: {
                        length,
                        favorited,
                        posted,
                        fileSize
                    },
                    tags,
                    urls: {
                        galleryUrl,
                        firstPageUrl
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
