module.exports = {
    name: "Youtube",
    desc: "Download video YouTube berbagai kualitas.",
    category: "Downloader",
    params: ["url", "format"],

    async run(req, res) {
        const url = req.query.url;
        const format = req.query.format || "720";
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        const BASE = "https://ytdownloader.io";
        const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36";

        try {
            // Step 1: Fetch nonce
            const pageRes = await fetch(BASE + "/", {
                headers: { "user-agent": UA, "accept": "text/html" }
            });
            const html = await pageRes.text();
            const nonceMatch = html.match(/"nonce":"([a-f0-9]+)"/);
            if (!nonceMatch) throw new Error("Nonce not found");
            const nonce = nonceMatch[1];

            const cookie = pageRes.headers.get("set-cookie")?.split(";")[0] || "";
            const headers = {
                "content-type": "application/json",
                "x-visolix-nonce": nonce,
                "referer": BASE + "/",
                "user-agent": UA,
                "cookie": cookie
            };

            // Step 2: Submit download
            const dlRes = await fetch(BASE + "/wp-json/visolix/api/download", {
                method: "POST", headers,
                body: JSON.stringify({ url, format, captcha_response: null })
            });
            const dlData = await dlRes.json();

            const taskMatch = dlData.data?.match(/download-btn-([^"\\]+)/);
            if (!taskMatch) throw new Error("Task ID not found");
            const taskId = taskMatch[1];

            const thumbMatch = dlData.data?.match(/img src="([^"]+)"/);
            const thumbnail = thumbMatch ? thumbMatch[1] : null;

            // Step 3: Poll progress
            let dlUrl = "";
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 3000));
                const progRes = await fetch(BASE + "/wp-json/visolix/api/progress", {
                    method: "POST", headers,
                    body: JSON.stringify({ id: taskId, host: "youtube" })
                });
                const progData = await progRes.json();
                if (progData.success === 1 && progData.download_url) {
                    dlUrl = progData.download_url;
                    break;
                }
            }
            if (!dlUrl) throw new Error("Timeout waiting for download");

            // Step 4: Get secure URL
            const secureRes = await fetch(BASE + "/wp-json/visolix/api/youtube-secure-url", {
                method: "POST", headers,
                body: JSON.stringify({ url: dlUrl, host: "youtube", video_id: taskId })
            });
            const secureData = await secureRes.json();

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    thumbnail,
                    format,
                    download: secureData.secure_url || dlUrl,
                    fallback: dlUrl
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
