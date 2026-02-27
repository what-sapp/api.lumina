/**
 * BIBLE AI - Fitur ke-121
 * Status: OPEN API (No Auth)
 * Deskripsi: Tanya jawab seputar Alkitab dilengkapi referensi ayat.
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
            "device-agent": "Chrome 107.0.0.0",
            "origin": "https://bibleai.com",
            "referer": "https://bibleai.com/",
            "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B)..."
        }
    }).then(r => r.json());

    if (!res?.data) throw new Error("Gagal mengambil data dari BibleAI.");

    // Kita ambil intisari jawabannya saja untuk response API
    return {
        answer: res.data.answer,
        sources: res.data.sources?.slice(0, 3).map(s => ({
            reference: s.splitReference ? `${s.splitReference.book} ${s.splitReference.chapter}:${s.splitReference.startVerse}` : "General",
            text: s.text
        })) || [],
        similar: res.data.similarQuestions?.slice(0, 3).map(q => q.question) || []
    };
}

module.exports = {
    name: "BibleAI",
    desc: "Cari jawaban dan ayat di Alkitab secara otomatis. [Lang: id-ID, en-US]",
    category: "TEST",
    params: ["text", "lang"],

    async run(req, res) {
        const { text, lang } = req.query;

        if (!text) return res.status(400).json({ 
            status: false, 
            creator: "Xena", 
            error: "Masukkan pertanyaan! Contoh: ?text=Siapa Yesus?" 
        });

        try {
            const result = await searchBible(text, lang || "id-ID");
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
