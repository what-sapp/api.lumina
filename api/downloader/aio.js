const axios = require("axios");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           AIO VIDEO DOWNLOADER — vidssave.com               ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Support: TikTok, Instagram, YouTube, Twitter, dll          ║
 * ║                                                             ║
 * ║  USAGE CLI:                                                  ║
 * ║  node vidssave.js "https://vt.tiktok.com/ZSmWvGCCp/"        ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url → URL video (wajib)                                     ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const AUTH   = "20250901majwlqo";
const DOMAIN = "api-ak.vidssave.com";

const BASE_HEADERS = {
    "accept":             "*/*",
    "accept-language":    "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua":          '"Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":   "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest":     "empty",
    "sec-fetch-mode":     "cors",
    "sec-fetch-site":     "same-site",
    "Referer":            "https://vidssave.com/",
};

// ─── STEP 1: PARSE ────────────────────────────────────────────────────────────

async function parse(link) {
    const { data } = await axios.post(
        "https://api.vidssave.com/api/contentsite_api/media/parse",
        `auth=${AUTH}&domain=${DOMAIN}&origin=source&link=${encodeURIComponent(link)}`,
        { headers: { ...BASE_HEADERS, "content-type": "application/x-www-form-urlencoded" } }
    );
    if (!data?.data) throw new Error("Parse gagal: " + JSON.stringify(data));
    return data.data;
}

// ─── STEP 2: DOWNLOAD (get task_id) ──────────────────────────────────────────

async function getTaskId(resourceContent) {
    const { data } = await axios.post(
        "https://api.vidssave.com/api/contentsite_api/media/download",
        `auth=${AUTH}&domain=${DOMAIN}&request=${encodeURIComponent(resourceContent)}&no_encrypt=1`,
        { headers: { ...BASE_HEADERS, "content-type": "application/x-www-form-urlencoded" } }
    );
    if (!data?.data?.task_id) throw new Error("Gagal dapat task_id");
    return data.data.task_id;
}

// ─── STEP 3: SSE POLLING ─────────────────────────────────────────────────────

async function pollDownload(taskId) {
    return new Promise((resolve, reject) => {
        const url = `https://api.vidssave.com/sse/contentsite_api/media/download_query?auth=${AUTH}&domain=${DOMAIN}&task_id=${encodeURIComponent(taskId)}&download_domain=vidssave.com&origin=content_site`;

        axios.get(url, {
            headers: { ...BASE_HEADERS, "accept": "text/event-stream", "cache-control": "no-cache" },
            responseType: "stream",
            timeout: 30000,
        }).then(res => {
            let buffer = "";
            res.data.on("data", chunk => {
                buffer += chunk.toString();
                const lines = buffer.split("\n");
                buffer = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    try {
                        const json = JSON.parse(line.slice(5).trim());
                        if (json.status === "success") resolve(json);
                        else if (json.status === "error") reject(new Error("Download error: " + JSON.stringify(json)));
                    } catch {}
                }
            });
            res.data.on("end", () => reject(new Error("SSE ended without result")));
            res.data.on("error", reject);
        }).catch(reject);
    });
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function download(link) {
    console.log(`[vidssave] Parsing: ${link}`);
    const parsed = await parse(link);

    const result = {
        title:     parsed.title     || "",
        thumbnail: parsed.thumbnail || "",
        duration:  parsed.duration  || 0,
        downloads: [],
    };

    // Ambil direct download_url dari media[] jika ada
    if (parsed.media?.length) {
        for (const media of parsed.media) {
            for (const r of media.resources || []) {
                if (r.download_url) {
                    result.downloads.push({
                        quality: r.quality || "",
                        format:  r.format  || "",
                        type:    "direct",
                        url:     r.download_url,
                    });
                }
            }
        }
    }

    // Fallback: pakai resources[] + task_id flow
    if (!result.downloads.length && parsed.resources?.length) {
        const res = parsed.resources[0];
        console.log(`[vidssave] Getting task_id...`);
        const taskId = await getTaskId(res.resource_content);

        console.log(`[vidssave] Polling task: ${taskId.slice(0, 20)}...`);
        const dl = await pollDownload(taskId);

        result.downloads.push({
            quality:  res.quality || "",
            format:   res.format  || "",
            type:     "task",
            url:      dl.download_link,
            filesize: dl.filesize,
        });
    }

    // Resolve semua resources via task_id flow
    for (const r of parsed.resources || []) {
        try {
            console.log(`[vidssave] Resolving ${r.quality || r.type} ${r.format}...`);
            const taskId = await getTaskId(r.resource_content);
            const dl     = await pollDownload(taskId);
            result.downloads.push({
                quality:  r.quality || "",
                format:   r.format  || "",
                type:     r.type    || "",
                size:     r.size    || dl.filesize || 0,
                url:      dl.download_link,
            });
        } catch (e) {
            console.log(`[vidssave] Skip ${r.format}: ${e.message}`);
        }
    }

    return result;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const link = process.argv[2];
    if (!link) {
        console.log("Usage: node vidssave.js <url>");
        console.log('       node vidssave.js "https://vt.tiktok.com/ZSmWvGCCp/"');
        process.exit(1);
    }

    download(link)
        .then(r => {
            console.log("\n✅ Result:");
            console.log(`Title    : ${r.title}`);
            console.log(`Duration : ${r.duration}s`);
            console.log(`Thumbnail: ${r.thumbnail}`);
            console.log(`\nDownloads (${r.downloads.length}):`);
            r.downloads.forEach((d, i) => {
                console.log(`  [${i+1}] ${d.quality || d.type} ${d.format} ${d.size ? `(${(d.size/1024/1024).toFixed(1)}MB)` : ""}`);
                if (d.url) console.log(`       ${d.url}`);
            });
        })
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });

} else {
    module.exports = {
        name:     "AIO Video Downloader",
        desc:     "Download video dari TikTok, Instagram, YouTube, Twitter, dll via vidssave.com",
        category: "Downloader",
        params:   ["url"],
        download,

        async run(req, res) {
            const { url } = req.query;
            if (!url) return res.status(400).json({
                status:  false,
                error:   'Parameter "url" wajib diisi!'
            });

            try {
                const result = await download(url);
                return res.status(200).json({
                    status:  true,
                    creator: "Shannz x Xena",
                    result
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
