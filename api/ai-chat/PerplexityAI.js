const crypto = require('crypto');

module.exports = {
    name: "PerplexityAI",
    desc: "Chat dengan Perplexity AI dengan web search.",
    category: "AI CHAT",
    params: ["query", "_model", "_focus"],
    paramsSchema: {
        query: { type: "text", label: "Query", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "turbo",
            options: [
                { label: "Turbo (Default)", value: "turbo" },
                { label: "Claude Sonnet",   value: "claude2" },
                { label: "GPT-4o",          value: "gpt4o" },
                { label: "Sonar",           value: "sonar" },
                { label: "Sonar Pro",       value: "sonar_pro" }
            ]
        },
        _focus: {
            type: "select",
            label: "Search Focus",
            required: false,
            default: "internet",
            options: [
                { label: "Internet",  value: "internet" },
                { label: "Academic",  value: "scholar" },
                { label: "News",      value: "news" },
                { label: "YouTube",   value: "youtube" },
                { label: "Reddit",    value: "reddit" }
            ]
        }
    },

    COOKIE: 'pplx.visitor-id=e1e3f9ad-beed-40af-8df3-e4885cf54605; _fbp=fb.1.1772385777819.555934794678952157; __cflb=02DiuDyvFMmK5p9jVbVnMNSKYZhUL9aGn1D6vXfyyXNsE; pplx.session-id=9c264937-fd6f-4ec0-a93e-7fe5ed59d47d; cf_clearance=6cMknm.vjUfXILA4ih9_cr0zxSGGnek7eWCiwwTFQm4-1772978193-1.2.1.1-pBEaJiEH4sZEfQ5gBlHTTkmg7AbEOJndadrgZDpAGXIlI70rjQEuc1n3BJZEJC05DZ5CzkXHy8ujS71zNO5YgyNA2mfULuW4egw3fgj2zB14GwJOs.NxpiGFgWjutoqcs6KV7kDJMr29swgyuhNb4EIYis_xaib_9hQn8dfPao4_jHZpRDYfTqddtEbvYi2ymexcCsvMW5DClvCVTepdJnmepqxcMCy07I5AQTi2AC4; pplx.edge-vid=4f6cd1b5-7326-49f5-bb24-fd97e3bb3dd1; pplx.edge-sid=fbb985ad-4750-40e6-b45a-dd009f80a31a',

    HEADERS: {
        'accept': 'text/event-stream',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://www.perplexity.ai',
        'referer': 'https://www.perplexity.ai/',
        'sec-ch-ua': '"Chromium";v="107", "Not=A?Brand";v="24"',
        'sec-ch-ua-arch': '"x86"',
        'sec-ch-ua-bitness': '"64"',
        'sec-ch-ua-full-version': '"107.0.5304.74"',
        'sec-ch-ua-full-version-list': '"Chromium";v="107.0.5304.74", "Not=A?Brand";v="24.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        'x-perplexity-request-reason': 'perplexity-query-state-provider'
    },

    async run(req, res) {
        const query = req.query.query;
        const model = req.query.model || 'turbo';
        const focus = req.query.focus || 'internet';

        if (!query) return res.status(400).json({ status: false, error: "Parameter 'query' diperlukan." });

        try {
            const frontendUuid = crypto.randomUUID();
            const contextUuid  = crypto.randomUUID();
            const requestId    = crypto.randomUUID();

            const body = {
                params: {
                    attachments: [],
                    language: 'id-ID',
                    timezone: 'Asia/Jakarta',
                    search_focus: focus,
                    sources: ['web'],
                    frontend_uuid: frontendUuid,
                    mode: 'copilot',
                    model_preference: model,
                    is_related_query: false,
                    is_sponsored: false,
                    frontend_context_uuid: contextUuid,
                    prompt_source: 'user',
                    query_source: 'home',
                    is_incognito: false,
                    time_from_first_type: 1636.8,
                    local_search_enabled: false,
                    use_schematized_api: true,
                    send_back_text_in_streaming_api: false,
                    supported_block_use_cases: [
                        'answer_modes', 'media_items', 'knowledge_cards',
                        'inline_entity_cards', 'place_widgets', 'finance_widgets',
                        'news_widgets', 'shopping_widgets', 'search_result_widgets',
                        'inline_images', 'inline_assets', 'placeholder_cards',
                        'diff_blocks', 'inline_knowledge_cards', 'entity_group_v2',
                        'refinement_filters', 'canvas_mode', 'answer_tabs',
                        'preserve_latex', 'in_context_suggestions', 'pending_followups',
                        'inline_claims', 'unified_assets'
                    ],
                    client_coordinates: null,
                    mentions: [],
                    dsl_query: query,
                    skip_search_enabled: true,
                    is_nav_suggestions_disabled: false,
                    source: 'default',
                    always_search_override: false,
                    override_no_search: false,
                    client_search_results_cache_key: frontendUuid,
                    should_ask_for_mcp_tool_confirmation: true,
                    browser_agent_allow_once_from_toggle: false,
                    force_enable_browser_agent: false,
                    supported_features: ['browser_agent_permission_banner_v1.1'],
                    version: '2.18'
                },
                query_str: query
            };

            const r = await fetch('https://www.perplexity.ai/rest/sse/perplexity_ask', {
                method: 'POST',
                headers: {
                    ...this.HEADERS,
                    'cookie': this.COOKIE,
                    'x-request-id': requestId
                },
                body: JSON.stringify(body)
            });

            const text = await r.text();

            let allChunks = [];
            let sources   = [];
            let seenPaths = new Set();

            for (const line of text.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                try {
                    const data = JSON.parse(trimmed.slice(5).trim());

                    // Ambil teks dari diff_block patches
                    if (data.blocks) {
                        for (const block of data.blocks) {
                            // Hanya proses ask_text block (bukan news_widget dll)
                            const usage = block.intended_usage || '';
                            if (!usage.startsWith('ask_text')) continue;

                            const patches = block?.diff_block?.patches || [];
                            for (const patch of patches) {
                                if (patch.op === 'add' && typeof patch.value === 'string') {
                                    const key = `${usage}:${patch.path}`;
                                    if (seenPaths.has(key)) continue;
                                    seenPaths.add(key);
                                    // Bersihkan prefix artifact ".X.. "
                                    const clean = patch.value.replace(/^\.[A-Za-z]+\.\. ?/, '');
                                    if (clean) allChunks.push(clean);
                                }
                            }
                        }
                    }

                    // Ambil sources
                    if (data.web_results?.length && !sources.length) {
                        sources = data.web_results.slice(0, 5).map(s => ({
                            title: s.title,
                            url: s.url
                        }));
                    }
                } catch (e) {}
            }

            const answer = allChunks.join('').trim();

            res.status(200).json({
                status: true,
                creator: 'Xena',
                result: {
                    model,
                    focus,
                    answer: answer || 'No response',
                    sources
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
