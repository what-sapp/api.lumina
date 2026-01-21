const axios = require('axios');

module.exports = {
    name: 'Anime Style',
    desc: 'JSON Response | Filter | Image2Image',
    category: 'Style Changer',
    params: ['imageUrl'],
    async run(req, res) {
        try {
            const imageUrl = req.query.imageUrl || req.query.url;
            
            if (!imageUrl) {
                return res.status(400).json({
                    status: false,
                    error: "Parameter 'imageUrl' is required"
                });
            }
            
            // Request ke API
            const response = await axios.get('https://api.nekolabs.web.id/style.changer/anime', {
                params: { imageUrl: imageUrl },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
                    'Accept': 'application/json'
                },
                timeout: 30000 // 30 detik karena processing lama
            });
            
            if (!response.data.success) {
                return res.status(500).json({
                    status: false,
                    error: 'Failed to convert image'
                });
            }
            
            // Return JSON dengan result URL
            res.status(200).json({
                status: true,
                data: {
                    originalUrl: imageUrl,
                    resultUrl: response.data.result,
                    timestamp: response.data.timestamp,
                    responseTime: response.data.responseTime
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
