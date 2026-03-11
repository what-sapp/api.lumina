const axios       = require('axios');
const EventSource = require('eventsource').EventSource;

function generateSessionHash() {
    return Math.random().toString(36).substring(2, 12);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

async function chatWithQwen(prompt) {
    const sessionHash = generateSessionHash();
    const zeroGpuUuid = generateUUID();

    await axios.post(
        'https://qwen-qwen2-5-coder-artifacts.hf.space/gradio_api/queue/join',
        {
            data: [prompt, null, null],
            fn_index: 8,
            trigger_id: 12,
            session_hash: sessionHash
        },
        {
            headers: {
                'accept':          '*/*',
                'content-type':    'application/json',
                'x-zerogpu-uuid':  zeroGpuUuid,
                'origin':          'https://qwen-qwen2-5-coder-artifacts.hf.space',
                'referer':         'https://qwen-qwen2-5-coder-artifacts.hf.space/?__theme=system'
            }
        }
    );

    return new Promise((resolve, reject) => {
        const streamUrl  = `https://qwen-qwen2-5-coder-artifacts.hf.space/gradio_api/queue/data?session_hash=${sessionHash}`;
        const eventSource = new EventSource(streamUrl, {
            headers: { 'accept': 'text/event-stream', 'x-zerogpu-uuid': zeroGpuUuid }
        });

        let fullCode    = '';
        let finalIframe = '';

        const timer = setTimeout(() => {
            eventSource.close();
            reject(new Error('Timeout after 60 seconds'));
        }, 60000);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.msg === 'process_generating' && data.output?.data) {
                    const chunks = data.output.data[0];
                    if (chunks?.[0]?.[2]) fullCode += chunks[0][2];
                    const iframe = data.output.data[2];
                    if (iframe && typeof iframe === 'string' && iframe.includes('<iframe')) finalIframe = iframe;
                }

                if (data.msg === 'process_completed') {
                    clearTimeout(timer);
                    eventSource.close();

                    let html = null;

                    // Try iframe base64 first
                    if (finalIframe) {
                        const match = finalIframe.match(/base64,([^"]+)/);
                        if (match) {
                            try { html = Buffer.from(match[1], 'base64').toString(); } catch {}
                        }
                    }

                    // Fallback: extract HTML from code block
                    if (!html && fullCode) {
                        html = fullCode
                            .replace(/^```[\w]*\n?/, '')
                            .replace(/\n?```$/, '')
                            .replace(/^html\n/, '')
                            .trim();
                    }

                    resolve({ code: fullCode, html });
                }
            } catch {}
        };

        eventSource.onerror = (err) => {
            clearTimeout(timer);
            eventSource.close();
            reject(new Error('Stream error'));
        };
    });
}

module.exports = {
    name: "Qwen2.5 Coder",
    desc: "Generate kode / halaman HTML dengan Qwen2.5 Coder via Hugging Face.",
    category: "AI CHAT",
    method: "GET",
    params: ["prompt"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true }
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const result = await chatWithQwen(prompt);
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    code: result.code,
                    html: result.html
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
