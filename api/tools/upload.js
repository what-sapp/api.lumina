const multer = require('multer');
const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs');

/**
 * FILE UPLOAD - Temporary CDN
 * POST /tools/upload
 * form-data: file = [binary]
 */

const uploadDir = '/tmp/lumina-uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ storage: multer.memoryStorage() });

module.exports = {
    name:        'FileUpload',
    desc:        'Upload file sementara, URL otomatis expired setelah 5 menit.',
    category:    'Tools',
    methods:     ['POST'],
    params:      ['file'],
    paramsSchema: {
        file: { type: 'file', required: true },
    },

    async run(req, res) {
        try {
            await new Promise((resolve, reject) => {
                upload.single('file')(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            if (!req.file) return res.status(400).json({
                status: false, creator: 'Shannz',
                error: 'No file uploaded. Gunakan form-data dengan field "file".'
            });

            const ext        = path.extname(req.file.originalname) || '';
            const randomName = crypto.randomBytes(16).toString('hex') + ext;
            const filePath   = path.join(uploadDir, randomName);

            fs.writeFileSync(filePath, req.file.buffer);

            const fileUrl = `${req.protocol}://${req.get('host')}/files/${randomName}`;

            // Auto delete setelah 5 menit
            setTimeout(() => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }, 5 * 60 * 1000);

            return res.status(200).json({
                status:    true,
                creator:   'Shannz',
                result: {
                    url:       fileUrl,
                    filename:  randomName,
                    mimetype:  req.file.mimetype,
                    size:      req.file.size,
                    expires_in: '5 minutes',
                    timestamp: new Date().toISOString(),
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
