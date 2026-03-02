/**
 * CHATGPT ULTIMATE - Fitur ke-120
 * Status: MASTER (Multi-Tone & Multi-Format)
 * Creator: Shannz x Xena
 */

async function chatAI(text, tone = "friendly", format = "paragraph") {
    const payload = JSON.stringify({
        question: text,
        tone: tone,
        format: format,
        file: null,
        conversationHistory: []
    });

    const res = await fetch("https://aifreeforever.com/api/generate-ai-answer", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Origin": "https://aifreeforever.com",
            "Referer": "https://aifreeforever.com/tools/free-chatgpt-no-login",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36..."
        },
        body: payload
    }).then(r => r.json());

    const answer = res?.answer || res?.text || res?.content;
    if (!answer) throw new Error("AI sedang tidak bisa merespon.");

    return answer;
}

module.exports = {
    name: "Aifreeforever",
    desc: "Chat AI. [Tone: friendly, concise, detailed, academic, professional, humorous] [Format: paragraph, bullet, step-by-step, mixed]",
    category: "AI CHAT",
    params: ["text", "tone", "format"],

    async run(req, res) {
        const { text, tone, format } = req.query;

        if (!text) return res.status(400).json({ 
            status: false, 
            creator: "Xena", 
            error: "Parameter 'text' wajib diisi!" 
        });

        try {
            const result = await chatAI(
                text, 
                tone || "friendly", 
                format || "paragraph"
            );

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
