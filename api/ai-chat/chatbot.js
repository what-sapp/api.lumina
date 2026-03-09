module.exports = {
    name: "Chatbot",
    desc: "Chatbot custom dengan nama dan instruksi karakter sendiri.",
    category: "AI CHAT",
    method: "GET",
    params: ["question", "_name", "_instruction"],
    paramsSchema: {
        question:     { type: "text", label: "Pertanyaan", required: true },
        _name:        { type: "text", label: "Nama Chatbot", required: false },
        _instruction: { type: "text", label: "Instruksi/Karakter", required: false }
    },

    async run(req, res) {
        const question    = req.query.question;
        const name        = req.query.name || 'Xena';
        const instruction = req.query.instruction || 'Kamu asisten yang helpful';

        if (!question) return res.status(400).json({ status: false, error: "Parameter 'question' diperlukan." });

        try {
            const url  = `https://rynekoo-api.hf.space/text.gen/chatbot?name=${encodeURIComponent(name)}&instruction=${encodeURIComponent(instruction)}&question=${encodeURIComponent(question)}`;
            const r    = await fetch(url);
            const data = await r.json();

            if (!data.success) throw new Error(data.message || 'Gagal mendapatkan response');

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: { response: data.result }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

