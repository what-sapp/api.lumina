const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'UploadF',
    desc: 'Upload file ke uploadf.com dan dapatkan link download.',
    category: 'AI',
   // path: '/tools/uploadf',
    method: 'GET',
    params: ['file'],
    paramsSchema: {
        file: { type: 'file', label: 'File', required: true }
    },
    async handler(req, res) {
        const file = req.file;
        if (!file) return res.json({ status: false, message: 'File required' });

        try {
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });

            const response = await axios.post('https://uploadf.com/fileup.php', formData, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Origin': 'https://uploadf.com',
                    'Referer': 'https://uploadf.com/id/',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...formData.getHeaders()
                }
            });

            const data = response.data;
            if (!data.FLG) return res.json({ status: false, message: 'Upload failed', raw: data });

            res.json({
                status: true,
                result: {
                    url: 'https://uploadf.com/s/' + data.NAME,
                    originalName: data.NRF,
                    raw: data
                }
            });
        } catch (e) {
            res.json({ status: false, message: e.message });
        }
    }
};
