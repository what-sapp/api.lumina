const axios = require('axios');

const BASE_URL = 'https://copier.saveweb2zip.com';
const HEADERS  = {
    'accept':           '*/*',
    'accept-language':  'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'content-type':     'application/json',
    'origin':           'https://saveweb2zip.com',
    'referer':          'https://saveweb2zip.com/',
    'user-agent':       'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36'
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
    name: "SaveWeb2Zip",
    desc: "Download seluruh isi website menjadi file ZIP.",
    category: "Tools",
    method: "GET",
    params: ["url"],
    paramsSchema: {
        url: { type: "text", label: "Website URL", required: true }
    },

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            // Step 1: Start copy
            const start = await axios.post(`${BASE_URL}/api/copySite`, {
                url,
                renameAssets:         false,
                saveStructure:        false,
                alternativeAlgorithm: false,
                mobileVersion:        false
            }, { headers: HEADERS });

            const md5 = start.data?.md5;
            if (!md5) throw new Error("Gagal memulai proses: " + JSON.stringify(start.data));

            // Step 2: Poll status
            let status, attempts = 0;
            while (attempts < 30) {
                const r = await axios.get(`${BASE_URL}/api/getStatus/${md5}`, { headers: HEADERS });
                status  = r.data;
                if (status.isFinished) break;
                attempts++;
                await sleep(2000);
            }

            if (!status?.isFinished) throw new Error("Timeout menunggu proses selesai.");
            if (!status?.success)    throw new Error("Proses gagal: " + JSON.stringify(status));

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    download_url: `${BASE_URL}/api/downloadArchive/${md5}`,
                    files_count:  status.copiedFilesAmount,
                    url:          status.url,
                    md5
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
