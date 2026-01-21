const axios = require('axios');

module.exports = {
    name: 'Cosplay',
    desc: 'Random cosplay image',
    category: 'Random',
    async run(req, res) {
        try {
            // API langsung return gambar (binary), bukan URL
            const response = await axios.get('https://api.nekolabs.web.id/random/cosplay', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
                },
                responseType: 'arraybuffer', // Langsung ambil sebagai buffer
                timeout: 15000
            });
            
            const imageBuffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || 'image/jpeg';
            
            // Serve gambar langsung
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
