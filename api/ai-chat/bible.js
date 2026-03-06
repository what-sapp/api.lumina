/**
 * BIBLE AI - Fitur ke-121
 * Status: FAST MODE (No Undefined References)
 * Creator: Xena
 */

async function searchBible(question, lang = "id-ID") {
    const translation = lang.startsWith("id") ? "TB" : "NIV";
    const url = `https://api.bibleai.com/v2/search?question=${encodeURIComponent(question)}&translation=${translation}&language=${lang}&filters[]=bible&filters[]=articles&pro=false`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "app-version": "1.2.1",
            "origin": "https://bibleai.com",
            "referer": "https://bibleai.com/",
            "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B)..."
        }
    }).then(r => r.json());

    if (!res?.data) throw new Error("Gagal mengambil data.");

    // Hapus bagian reference yang bikin lama & undefined
    return {
        answer: res.data.answer,
        sources: res.data.sources?.slice(0, 3).map(s => s.text) || [], // Langsung ambil teks ayatnya saja
        similar: res.data.similarQuestions?.slice(0, 3).map(q => q.question) || []
    };
}

module.exports = {
    name: "Bible AI",
    desc: "Cari jawaban Alkitab secara instan tanpa ribet.",
    category: "AI CHAT",
    params: ["text", "lang"],

    async run(req, res) {
        const { text, lang } = req.query;
        if (!text) return res.status(400).json({ status: false, error: "Tanya apa, Senior?" });

        try {
            const result = await searchBible(text, lang || "id-ID");
            res.status(200).json({
                status: true,
                //creator: "Xena",
                result: result
            });
        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: err.message });
        }
    }
};
