const axios = require('axios');

module.exports = {
    name: 'Waifu Pics',
    desc: 'Random anime images from waifu.pics',
    category: 'Random',
    params: ['type', 'category'],
    async run(req, res) {
        try {
            const type = req.query.type || 'sfw'; // sfw or nsfw
            const category = req.query.category || 'waifu'; // waifu, neko, shinobu, megumin, bully, cuddle, cry, hug, awoo, kiss, lick, pat, smug, bonk, yeet, blush, smile, wave, highfive, handhold, nom, bite, glomp, slap, kill, kick, happy, wink, poke, dance, cringe
            
            // Validasi type
            const validTypes = ['sfw', 'nsfw'];
            if (!validTypes.includes(type.toLowerCase())) {
                return res.status(400).json({
                    status: false,
                    error: "Parameter 'type' must be 'sfw' or 'nsfw'"
                });
            }

            // SFW categories
            const sfwCategories = [
                'waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 
                'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 
                'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 
                'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy', 
                'wink', 'poke', 'dance', 'cringe'
            ];

            // NSFW categories
            const nsfwCategories = ['waifu', 'neko', 'trap', 'blowjob'];

            // Validasi category berdasarkan type
            const validCategories = type.toLowerCase() === 'sfw' ? sfwCategories : nsfwCategories;
            if (!validCategories.includes(category.toLowerCase())) {
                return res.status(400).json({
                    status: false,
                    error: `Invalid category for ${type.toUpperCase()}. Valid categories: ${validCategories.join(', ')}`
                });
            }

            // Get image URL dari waifu.pics API
            const apiUrl = `https://api.waifu.pics/${type.toLowerCase()}/${category.toLowerCase()}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            
            if (!data.url) {
                return res.status(500).json({
                    status: false,
                    error: 'Failed to get image from waifu.pics'
                });
            }

            // Download image
            const response = await axios.get(data.url, { 
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const imageBuffer = Buffer.from(response.data);
            
            // Detect content type dari URL atau response headers
            const contentType = response.headers['content-type'] || 
                               (data.url.endsWith('.gif') ? 'image/gif' : 'image/jpeg');
            
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': imageBuffer.length,
            });
            res.end(imageBuffer);
            
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
