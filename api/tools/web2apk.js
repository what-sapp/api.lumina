const axios    = require('axios');
const FormData = require('form-data');

const CONFIG = {
    BASE_URL: 'https://webappcreator.amethystlab.org',
    HEADERS: {
        'User-Agent':       'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'Accept':           'application/json, text/plain, */*',
        'Accept-Language':  'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin':           'https://webappcreator.amethystlab.org',
        'Referer':          'https://webappcreator.amethystlab.org/',
        'sec-ch-ua':        '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"'
    }
};

module.exports = {
    name: "WebAppBuilder",
    desc: "Convert website URL menjadi file APK Android menggunakan WebAppCreator.",
    category: "Tools",
    params: ["websiteUrl", "appName", "icon", "_packageName", "_versionName", "_versionCode"],
    paramsSchema: {
        websiteUrl: {
            type: "text",
            label: "Website URL",
            required: true,
            placeholder: "https://example.com"
        },
        appName: {
            type: "text",
            label: "Nama Aplikasi",
            required: true,
            placeholder: "My App"
        },
        icon: {
            type: "file",
            label: "Icon App (PNG/JPG)",
            required: true
        },
        _packageName: {
            type: "text",
            label: "Package Name",
            required: false,
            placeholder: "com.example.app (auto jika kosong)"
        },
        _versionName: {
            type: "text",
            label: "Versi",
            required: false,
            default: "1.0.0"
        },
        _versionCode: {
            type: "text",
            label: "Version Code",
            required: false,
            default: "1"
        }
    },

    generatePackageName(appName) {
        const cleaned = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `com.${cleaned}.app`;
    },

    async run(req, res) {
        const file        = req.file;
        const websiteUrl  = req.body.websiteUrl  || req.query.websiteUrl;
        const appName     = req.body.appName     || req.query.appName;
        const packageName = req.body.packageName || req.query.packageName || null;
        const versionName = req.body.versionName || req.query.versionName || '1.0.0';
        const versionCode = req.body.versionCode || req.query.versionCode || 1;

        if (!websiteUrl) return res.status(400).json({ status: false, message: 'websiteUrl wajib diisi' });
        if (!appName)    return res.status(400).json({ status: false, message: 'appName wajib diisi' });
        if (!file)       return res.status(400).json({ status: false, message: 'icon wajib diupload' });

        try {
            const form = new FormData();
            form.append('websiteUrl',  websiteUrl);
            form.append('appName',     appName);
            form.append('icon',        file.buffer, { filename: file.originalname, contentType: file.mimetype });
            form.append('packageName', packageName || this.generatePackageName(appName));
            form.append('versionName', versionName);
            form.append('versionCode', String(versionCode));

            const response = await axios.post(`${CONFIG.BASE_URL}/api/build-apk`, form, {
                headers: { ...CONFIG.HEADERS, ...form.getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength:    Infinity,
                timeout:          120000,
            });

            const data = response.data;
            if (data.success && data.downloadUrl) {
                data.fullDownloadUrl = `${CONFIG.BASE_URL}${data.downloadUrl}`;
            }

            return res.json({
                status:  true,
                creator: 'Xena',
                result:  data
            });

        } catch(e) {
            const msg = e.response?.data?.message || e.message;
            res.status(500).json({ status: false, message: msg });
        }
    }
};
