/**
 * WEB SOLVER - Fitur ke-126
 * Status: ACTIVE (Utility)
 * Deskripsi: Ambil Cookies dan Headers dari URL manapun secara otomatis.
 * Creator: Xena
 */

async function solveCookies(targetUrl) {
    const baseUrl = "https://beta.ftr.pp.ua/api/solver/get-cookies";
    // Tembak API FathurDevs
    const res = await fetch(`${baseUrl}?url=${encodeURIComponent(targetUrl)}`)
        .then(r => r.json());

    if (!res.status) throw new Error(res.message || "Gagal mendapatkan cookies.");

    // Return data mentah agar Senior bisa olah lagi
    return {
        url: targetUrl,
        cookies: res.result.cookies,
        userAgent: res.result.userAgent,
        headers: res.result.headers
    };
}

module.exports = {
    name: "CookieGrabber",
    desc: "Ambil Cookies & Headers web untuk keperluan scraping/bypass.",
    category: "TEST",
    params: ["url"],

    async run(req, res) {
        const { url } = req.query;

        if (!url) return res.status(400).json({ 
            status: false, 
            creator: "Xena", 
            error: "Mana link webnya, Senior?" 
        });

        try {
            const result = await solveCookies(url);
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                creator: "Xena", 
                error: err.message 
            });
        }
    }
};
