const axios = require('axios');
const mqtt  = require('mqtt');

/**
 * Felo AI Search
 * GET /ai/felo?prompt=latest news in Indonesia
 */

class FeloAI {
    constructor() {
        this.apiUrl = 'https://api.felo.ai';
    }

    genUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    genString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    async getConnection() {
        const visitorId = this.genUUID();
        const response  = await axios.get(`${this.apiUrl}/search/user/connection?client_id=${visitorId}`, {
            headers: { accept: '*/*', cookie: `visitor_id=${visitorId}`, Referer: 'https://felo.ai/' }
        });
        return response.data;
    }

    async connectMQTT(params) {
        return new Promise((resolve, reject) => {
            const client = mqtt.connect(params.ws_url, {
                clientId:        params.client_id,
                username:        params.username,
                password:        params.password,
                protocolVersion: 5,
                connectTimeout:  30000
            });
            client.on('connect', () => { client.subscribe(params.sub_topic); resolve(client); });
            client.on('error', reject);
        });
    }

    async ask(query) {
        if (!query?.trim()) throw new Error('Query cannot be empty');

        return new Promise(async (resolve, reject) => {
            let client;
            const timeout = setTimeout(() => {
                if (client) client.end();
                reject(new Error('Request timeout'));
            }, 30000);

            try {
                const connection = await this.getConnection();
                client = await this.connectMQTT(connection);

                let result = { text: '', sources: [] };

                client.on('message', (topic, message) => {
                    try {
                        const data = JSON.parse(message.toString());
                        if (data.status === 'process') {
                            const content = data.data;
                            if (content.type === 'answer') {
                                result.text = content.data.text;
                            } else if (content.type === 'final_contexts') {
                                result.sources = content.data.sources.map((item, i) => ({ index: i + 1, ...item }));
                            }
                        } else if (data.status === 'complete') {
                            clearTimeout(timeout);
                            client.end();
                            resolve(result);
                        }
                    } catch (_) {}
                });

                client.publish(connection.pub_topic, JSON.stringify({
                    event_name: 'ask_question',
                    data: {
                        process_id:     this.genString(21),
                        query,
                        search_uuid:    this.genString(21),
                        lang:           '',
                        agent_lang:     'en',
                        search_options: { langcode: 'en' },
                        search_video:   true,
                        query_from:     'default',
                        category:       'google',
                        auto_routing:   true,
                        mode:           'concise',
                        device_id:      'a0d7b8929d310544f4fcfd1953c7f154',
                        documents:      [],
                        document_action: ''
                    }
                }));

            } catch (error) {
                clearTimeout(timeout);
                if (client) client.end();
                reject(new Error('Request failed: ' + error.message));
            }
        });
    }
}

const feloInstance = new FeloAI();

module.exports = {
    name:     'FeloAI',
    desc:     'AI Search powered by Felo AI — returns answer with web sources.',
    category: 'AI CHAT',
    method:   'GET',
    params:   ['prompt'],
    paramsSchema: {
        prompt: { type: 'text', required: true },
    },

    async run(req, res) {
        const { prompt } = req.query;
        if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi.' });

        try {
            const result = await feloInstance.ask(prompt);
            return res.json({
                status: true,
                result: {
                    answer:  result.text,
                    sources: result.sources?.length > 0 ? result.sources : null,
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, error: e.message });
        }
    }
};

