const cloudscraper = require('cloudscraper');
const crypto = require('crypto');

module.exports = {
    name: "Perplexity AI",
    desc: "Chat dengan Perplexity AI",
    category: "AI CHAT",
    method: "GET",
    params: ["text"],
    paramsSchema: {
        text: { type: "text", label: "Text", required: true }
    },

    async run(req, res) {
        const text = req.query.text;

        if (!text) {
            return res.status(400).json({
                status: false,
                error: "Parameter 'text' diperlukan."
            });
        }

        class Perplexity {
            constructor() {
                this.baseUrl = 'https://www.perplexity.ai';

                this.headers = {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36',
                    'Accept': 'text/event-stream',
                    'Content-Type': 'application/json',
                    'Origin': this.baseUrl,
                    'Referer': this.baseUrl + '/'
                };

                this.cookies = {
                    'pplx.visitor-id': crypto.randomUUID(),
                    'pplx.session-id': crypto.randomUUID(),
                    'pplx.edge-vid': crypto.randomUUID(),
                    'pplx.edge-sid': crypto.randomUUID()
                };
            }

            generateUUID() {
                return crypto.randomUUID();
            }

            getCookieString() {
                return Object.entries(this.cookies)
                    .map(([k, v]) => `${k}=${v}`)
                    .join('; ');
            }

            async ask(query) {

                const payload = {
                    params: {
                        last_backend_uuid: this.generateUUID(),
                        read_write_token: this.generateUUID(),
                        frontend_uuid: this.generateUUID(),
                        language: 'id-ID',
                        timezone: 'Asia/Jakarta',
                        search_focus: 'internet',
                        sources: ['web'],
                        mode: 'copilot',
                        model_preference: 'turbo',
                        version: '2.18'
                    },
                    query_str: query
                };

                const response = await cloudscraper({
                    method: 'POST',
                    url: `${this.baseUrl}/rest/sse/perplexity_ask`,
                    headers: {
                        ...this.headers,
                        'Cookie': this.getCookieString(),
                        'x-request-id': this.generateUUID()
                    },
                    body: JSON.stringify(payload)
                });

                const lines = response.split('\n');
                let finalMessage = null;

                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].startsWith('data: ')) {
                        try {
                            const data = JSON.parse(lines[i].substring(5));
                            if (data.text && data.final) {
                                finalMessage = data;
                                break;
                            }
                        } catch {}
                    }
                }

                if (finalMessage?.text) {
                    try {
                        const parsed = JSON.parse(finalMessage.text);
                        for (const item of parsed) {
                            if (item.step_type === 'FINAL') {
                                const answerData = JSON.parse(item.content.answer);
                                return answerData.answer;
                            }
                        }
                    } catch {}
                }

                return null;
            }
        }

        try {
            const pplx = new Perplexity();
            const answer = await pplx.ask(text);

            if (!answer) throw new Error("Gagal mendapatkan response");

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    response: answer
                }
            });

        } catch (e) {
            res.status(500).json({
                status: false,
                error: e.message
            });
        }
    }
};
