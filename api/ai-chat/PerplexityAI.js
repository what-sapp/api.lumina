const { randomUUID } = require('crypto');

module.exports = {
    name: "PerplexityAI",
    desc: "Chat dengan Perplexity AI dengan web search.",
    category: "AI CHAT",
    params: ["query", "_source"],
    paramsSchema: {
        query: { type: "text", label: "Query", required: true },
        _source: {
            type: "select",
            label: "Source",
            required: false,
            default: "web",
            options: [
                { label: "Web",      value: "web" },
                { label: "Academic", value: "scholar" },
                { label: "Social",   value: "social" },
                { label: "Finance",  value: "edgar" }
            ]
        }
    },

    PROXY: 'https://cloudflare-cors-anywhere.supershadowcube.workers.dev/?url=https://www.perplexity.ai/rest/sse/perplexity_ask',

    async run(req, res) {
        const query  = req.query.query;
        const source = req.query.source || 'web';

        if (!query) return res.status(400).json({ status: false, error: "Parameter 'query' diperlukan." });

        try {
            const frontend = uuidv4();

            const r = await fetch(this.PROXY, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'referer': 'https://www.perplexity.ai/search/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                    'x-request-id': frontend,
                    'x-perplexity-request-reason': 'perplexity-query-state-provider'
                },
                body: JSON.stringify({
                    params: {
                        attachments: [],
                        language: 'id-ID',
                        timezone: 'Asia/Jakarta',
                        search_focus: 'internet',
                        sources: [source],
                        search_recency_filter: null,
                        frontend_uuid: frontend,
                        mode: 'concise',
                        model_preference: 'turbo',
                        is_related_query: false,
                        is_sponsored: false,
                        visitor_id: uuidv4(),
                        frontend_context_uuid: uuidv4(),
                        prompt_source: 'user',
                        query_source: 'home',
                        is_incognito: false,
                        time_from_first_type: 2273.9,
                        local_search_enabled: false,
                        use_schematized_api: true,
                        send_back_text_in_streaming_api: false,
                        supported_block_use_cases: [
                            'answer_modes', 'media_items', 'knowledge_cards',
                            'inline_entity_cards', 'place_widgets', 'finance_widgets',
                            'sports_widgets', 'flight_status_widgets', 'shopping_widgets',
                            'jobs_widgets', 'search_result_widgets', 'inline_images',
                            'inline_assets', 'placeholder_cards', 'diff_blocks',
                            'inline_knowledge_cards', 'entity_group_v2', 'refinement_filters',
                            'canvas_mode', 'maps_preview', 'answer_tabs'
                        ],
                        client_coordinates: null,
                        mentions: [],
                        dsl_query: query,
                        skip_search_enabled: true,
                        is_nav_suggestions_disabled: false,
                        always_search_override: false,
                        override_no_search: false,
                        should_ask_for_mcp_tool_confirmation: true,
                        version: '2.18'
                    },
                    query_str: query
                })
            });

            const text = await r.text();

            const lines  = text.split('\n').filter(l => l.startsWith('data:'));
            const parsed = lines.map(l => { try { return JSON.parse(l.substring(5).trim()); } catch { return null; } }).filter(Boolean);
            const final  = parsed.find(l => l.final_sse_message);

            if (!final) throw new Error('No final response from Perplexity');

            const info          = JSON.parse(final.text);
            const finalStep     = info.find(s => s.step_type === 'FINAL');
            const searchStep    = info.find(s => s.step_type === 'SEARCH_RESULTS');
            const answerParsed  = JSON.parse(finalStep?.content?.answer || '{}');

            res.status(200).json({
                status: true,
                creator: 'Xena',
                result: {
                    query: final.query_str,
                    answer: answerParsed?.answer || 'No response',
                    related_queries: final.related_queries || [],
                    sources: (searchStep?.content?.web_results || []).slice(0, 5).map(s => ({
                        title: s.name,
                        url: s.url,
                        snippet: s.snippet
                    }))
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
