const axios = require('axios');

module.exports = {
    name: 'Lewd',
    desc: 'NSFW | Random lewd image from nekos.life',
    category: 'Nekos.life',
    async run(req, res) {
        try {
            const { data } = await axios.get('https://nekos.life/api/v2/img/lewd', { timeout: 10000 });
            
            if (!data.url) {
                return res.status(500).json({
                    status: false,
                    error: 'Failed to get image from nekos.life'
                });
            }

            const response = await axios.get(data.url, { 
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const imageBuffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || 'image/jpeg';
            
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
