const axios    = require('axios');
const FormData = require('form-data');

const BASE_URL = 'https://api.doreso.com';
const HEADERS  = {
    'User-Agent':      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'Accept':          '*/*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin':          'https://aha-music.com',
    'Referer':         'https://aha-music.com/',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function uploadFile(buffer, filename, mimetype) {
    const form = new FormData();
    form.append('file', buffer, { filename, contentType: mimetype });
    const r = await axios.post(`${BASE_URL}/upload`, form, {
        headers: { ...HEADERS, ...form.getHeaders() }
    });
    return r.data.data;
}

async function getResult(uploadId) {
    const r    = await axios.get(`${BASE_URL}/file/${uploadId}`, { headers: HEADERS });
    const data = r.data.data[0];
    const results = [];
    if (data.results?.music) {
        data.results.music.forEach(item => {
            if (item.result) {
                const t = item.result;
                results.push({
                    title:             t.title,
                    score:             t.score,
                    duration_ms:       t.duration_ms,
                    genres:            t.genres?.map(g => g.name) || [],
                    artists:           t.artists?.map(a => a.name) || [],
                    album:             t.album?.name || null,
                    release_date:      t.release_date,
                    label:             t.label,
                    external_ids:      t.external_ids || {},
                    external_metadata: t.external_metadata || {}
                });
            }
        });
    }
    return { state: data.state, results };
}

module.exports = {
    name: "WhatMusic",
    desc: "Identifikasi lagu dari file audio menggunakan aha-music.",
    category: "TOOLS",
    method: "POST",
    params: ["audio"],
    paramsSchema: {
        audio: { type: "file", label: "File Audio (MP3/WAV/dll)", required: true }
    },

    async run(req, res) {
        const file = req.file;
        if (!file) return res.status(400).json({ status: false, error: "File audio diperlukan." });

        try {
            const upload   = await uploadFile(file.buffer, file.originalname || 'audio.mp3', file.mimetype);
            const uploadId = upload.id;

            let result, attempts = 0;
            while (attempts < 20) {
                result = await getResult(uploadId);
                if (result.state === 1 && result.results.length > 0) break;
                attempts++;
                await sleep(3000);
            }

            if (!result.results.length) throw new Error("Lagu tidak teridentifikasi.");

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    upload_id: uploadId,
                    matches:   result.results
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
