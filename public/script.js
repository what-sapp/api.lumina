// ─────────────────────────────────────────────────────────────
// script.js  —  Lumina Docs (docs.html) — updated for new UI
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {

    // --- 1. INITIAL STATE & LOADER ---
    document.body.classList.add('noscroll');
    const pageLoader = document.getElementById('page-loader');

    const hideLoader = () => {
        setTimeout(() => {
            document.body.classList.remove('noscroll');
            if (pageLoader) {
                pageLoader.style.opacity = '0';
                setTimeout(() => { pageLoader.style.display = 'none'; }, 500);
            }
        }, 800);
    };

    // --- 2. DATA FETCHING ---
    try {
        const endpoints = await (await fetch('/endpoints')).json();
        const set       = await (await fetch('/set')).json();

        setContent('api-icon',      'href',        set.icon);
        setContent('api-title',     'textContent', set.name.main);
        setContent('api-description','content',    set.description);
        setContent('api-name',      'textContent', set.name.main);
        setContent('api-author',    'textContent', `by ${set.author}`);
        setContent('api-desc',      'textContent', set.description);
        setContent('api-copyright', 'textContent', `© 2025 ${set.name.copyright}. All rights reserved.`);

        setupApiLinks(set);
        setupApiContent(endpoints);
        setupSearchFunctionality();
        hideLoader();
    } catch (error) {
        console.error('Error loading configuration:', error);
        hideLoader();
    }

    function setContent(id, property, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined) el[property] = value;
    }

    // --- 3. UI GENERATION ---
    function setupApiContent(data) {
        const apiContent = document.getElementById('api-content');
        if (!apiContent) return;

        data.endpoints.forEach((category, catIndex) => {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.style.animationDelay = `${catIndex * 0.08}s`;

            // Count items
            const count = category.items.length;

            section.innerHTML = `
                <div class="category-header" data-category="${catIndex}">
                    <div class="category-header-left">
                        <div class="category-icon">
                            <span class="material-icons" style="font-size:1.1rem; color:var(--primary-color);">folder</span>
                        </div>
                        <span class="category-name">${category.name}</span>
                        <span class="category-count">${count}</span>
                    </div>
                    <span class="material-icons category-chevron">expand_more</span>
                </div>
                <div class="accordion-content">
                    <div class="endpoint-grid" id="grid-${catIndex}"></div>
                </div>
            `;

            const grid = section.querySelector(`#grid-${catIndex}`);

            category.items.forEach((itemData, itemIndex) => {
                const itemName = Object.keys(itemData)[0];
                const item     = itemData[itemName];

                const card = document.createElement('div');
                card.className   = 'endpoint-card';
                card.style.animationDelay = `${itemIndex * 0.04}s`;
                card.dataset.name = itemName.toLowerCase();
                card.dataset.desc = (item.desc || '').toLowerCase();
                card.dataset.category = catIndex;

                // Determine status badge
                const status     = item.status || 'ready';
                const statusMap  = {
                    ready  : { cls: 'status-ready',  icon: 'circle',  label: 'Ready'  },
                    error  : { cls: 'status-error',  icon: 'cancel',  label: 'Error'  },
                    update : { cls: 'status-update', icon: 'update',  label: 'Update' },
                };
                const s = statusMap[status] || statusMap.ready;

                // Method badge (default GET)
                const method    = (item.method || 'GET').toUpperCase();
                const methodCls = { GET:'method-get', POST:'method-post', PUT:'method-put', DELETE:'method-delete' }[method] || 'method-get';

                card.innerHTML = `
                    <div class="endpoint-card-header">
                        <span class="method-badge ${methodCls}">${method}</span>
                        <span class="endpoint-name">${itemName}</span>
                    </div>
                    <div class="endpoint-path">${item.path || '/'}</div>
                    <div class="endpoint-desc">${item.desc || 'No description available.'}</div>
                    <div class="endpoint-card-footer">
                        <span class="status-badge ${s.cls}">
                            <span class="material-icons" style="font-size:0.6rem;">${s.icon}</span>
                            ${s.label}
                        </span>
                        <button class="try-btn"
                            data-path="${item.path || ''}"
                            data-name="${itemName}"
                            data-desc="${item.desc || ''}"
                            data-method="${method}"
                            ${status === 'error' ? 'disabled' : ''}>
                            <span class="material-icons" style="font-size:0.75rem;">send</span>
                            Try
                        </button>
                    </div>
                `;

                grid.appendChild(card);
            });

            apiContent.appendChild(section);
        });

        // Accordion toggle
        apiContent.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const content  = header.nextElementSibling;
                const chevron  = header.querySelector('.category-chevron');
                const icon     = header.querySelector('.category-icon .material-icons');
                const isOpen   = content.classList.toggle('open');
                header.classList.toggle('open', isOpen);
                chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                if (icon) icon.textContent = isOpen ? 'folder_open' : 'folder';
            });
        });

        // Try button click — delegate
        apiContent.addEventListener('click', e => {
            const btn = e.target.closest('.try-btn');
            if (btn && !btn.disabled) {
                openApiModal(btn.dataset.name, btn.dataset.path, btn.dataset.desc, btn.dataset.method);
            }
        });
    }

    // --- 4. MODAL ---
    function openApiModal(name, endpoint, description, method = 'GET') {
        const paramsContainer   = document.getElementById('params-container');
        const responseContainer = document.getElementById('response-container');
        const responseData      = document.getElementById('response-data');
        const apiUrlEl          = document.getElementById('api-url');
        const sendBtn           = document.getElementById('submit-api');

        // Reset
        responseContainer.classList.remove('visible');
        paramsContainer.innerHTML  = '';
        responseData.innerHTML     = '';

        // Fill modal content
        document.getElementById('modal-title').textContent       = name;
        document.getElementById('modal-path').textContent        = endpoint || '/';
        document.getElementById('modal-description').textContent = description || 'No description available.';

        if (apiUrlEl) {
            const clean = endpoint.split('?')[0];
            apiUrlEl.textContent = `${window.location.origin}${clean}`;
        }

        // Parse params
        const params = [];
        const pathMatches = endpoint.match(/{([^}]+)}/g);
        if (pathMatches) pathMatches.forEach(m => params.push(m.replace(/[{}]/g, '')));
        if (endpoint.includes('?')) {
            endpoint.split('?')[1].split('&').forEach(p => {
                const pName = p.split('=')[0];
                if (pName && !params.includes(pName)) params.push(pName);
            });
        }

        if (params.length > 0) {
            const section = document.createElement('div');
            section.className = 'params-section';
            section.innerHTML = `<div class="params-title"><span class="material-icons" style="font-size:0.75rem;">tune</span> Parameters</div>`;
            params.forEach(p => {
                const isOptional = p.startsWith('_');
                const cleanName  = isOptional ? p.substring(1) : p;
                const group      = document.createElement('div');
                group.className  = 'param-group';
                group.innerHTML  = `
                    <div class="param-label">
                        ${cleanName}
                        ${!isOptional ? '<span class="param-required">*required</span>' : '<span style="font-size:0.62rem;color:var(--text-muted);font-weight:400;">(optional)</span>'}
                    </div>
                    <input type="text" id="param-${p}" class="param-input" placeholder="Enter ${cleanName}...">
                    <div id="error-${p}" style="display:none; font-size:0.65rem; color:var(--error-color); margin-top:0.25rem;">This field is required.</div>
                `;
                section.appendChild(group);
            });
            paramsContainer.appendChild(section);
        }

        sendBtn.onclick = () => handleApiRequest(endpoint, paramsContainer);

        // Open modal
        if (window.openApiModal) window.openApiModal();
    }

    // --- 5. LIVE ACTIVITY LOGGER ---
    function logActivity(entry) {
        try {
            const KEY = 'lumina_live_activity';
            let logs = [];
            try { logs = JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) {}
            logs.push(entry);
            if (logs.length > 50) logs = logs.slice(-50);
            localStorage.setItem(KEY, JSON.stringify(logs));
        } catch (_) {}
    }

    // --- 6. REQUEST HANDLER ---
    async function handleApiRequest(endpoint, paramsContainer) {
        const sendBtn           = document.getElementById('submit-api');
        const responseContainer = document.getElementById('response-container');
        const responseData      = document.getElementById('response-data');
        const statusEl          = document.getElementById('response-status');
        const timeEl            = document.getElementById('response-time');

        let isValid    = true;
        let baseUrl    = endpoint.split('?')[0];
        let queryParams = new URLSearchParams();

        // Validate & build URL
        paramsContainer.querySelectorAll('.param-input').forEach(input => {
            const pName = input.id.replace('param-', '');
            const val   = input.value.trim();
            const error = document.getElementById(`error-${pName}`);

            if (!pName.startsWith('_') && !val) {
                isValid = false;
                input.classList.add('invalid');
                if (error) error.style.display = 'block';
            } else {
                input.classList.remove('invalid');
                if (error) error.style.display = 'none';
                if (val) {
                    if (baseUrl.includes(`{${pName}}`)) {
                        baseUrl = baseUrl.replace(`{${pName}}`, encodeURIComponent(val));
                    } else {
                        queryParams.append(pName, val);
                    }
                }
            }
        });

        if (!isValid) return;

        const finalUrl = queryParams.toString() ? `${baseUrl}?${queryParams}` : baseUrl;

        // Loading state
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span class="material-icons" style="font-size:1rem; animation:spin 0.8s linear infinite;">refresh</span> Sending...`;
        responseContainer.classList.add('visible');
        responseData.innerHTML = `<span style="opacity:0.5; font-size:0.72rem;">Processing request...</span>`;

        const start = Date.now();
        try {
            const res         = await fetch(finalUrl);
            const duration    = Date.now() - start;
            const contentType = res.headers.get('content-type') || '';

            // Status badge
            statusEl.textContent = `${res.status} ${res.statusText || (res.ok ? 'OK' : 'Error')}`;
            statusEl.className   = `response-status ${res.ok ? 'ok' : 'error'}`;
            timeEl.textContent   = `${duration}ms`;

            logActivity({ endpoint: finalUrl, status: res.status, ok: res.ok, duration, error: res.ok ? null : `HTTP ${res.status}`, timestamp: Date.now() });

            // Render response
            if (contentType.includes('image/')) {
                const blob   = await res.blob();
                const imgUrl = URL.createObjectURL(blob);
                responseData.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.75rem;">
                        <img src="${imgUrl}" style="max-width:100%; height:auto; border-radius:var(--border-radius-sm); border:1px solid var(--border-color);">
                        <a href="${imgUrl}" download="result.jpg" class="try-btn" style="text-decoration:none; font-size:0.7rem;">
                            <span class="material-icons" style="font-size:0.75rem;">download</span> Download
                        </a>
                    </div>`;
            } else if (contentType.includes('application/json')) {
                const json = await res.json();
                responseData.textContent = JSON.stringify(json, null, 2);
            } else {
                responseData.textContent = await res.text();
            }
        } catch (err) {
            const duration = Date.now() - start;
            statusEl.textContent = 'Error';
            statusEl.className   = 'response-status error';
            timeEl.textContent   = `${duration}ms`;
            responseData.innerHTML = `<span style="color:var(--error-color); font-weight:600;">Error: ${err.message}</span>`;
            logActivity({ endpoint: finalUrl, status: 0, ok: false, duration, error: err.message, timestamp: Date.now() });
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<span class="material-icons" style="font-size:1rem;">send</span> Send Request`;
        }
    }

    // --- 7. SEARCH ---
    function setupSearchFunctionality() {
        const searchInput = document.getElementById('api-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', e => {
            const term = e.target.value.toLowerCase().trim();

            document.querySelectorAll('.category-section').forEach(section => {
                const header    = section.querySelector('.category-header');
                const content   = section.querySelector('.accordion-content');
                const chevron   = header.querySelector('.category-chevron');
                const icon      = header.querySelector('.category-icon .material-icons');
                let   hasMatch  = false;

                section.querySelectorAll('.endpoint-card').forEach(card => {
                    const match = !term || card.dataset.name.includes(term) || card.dataset.desc.includes(term);
                    card.style.display = match ? '' : 'none';
                    if (match) hasMatch = true;
                });

                if (term) {
                    // Auto-expand categories with matches
                    if (hasMatch) {
                        content.classList.add('open');
                        header.classList.add('open');
                        chevron.style.transform = 'rotate(180deg)';
                        if (icon) icon.textContent = 'folder_open';
                    }
                    section.style.display = hasMatch ? '' : 'none';
                } else {
                    section.style.display = '';
                }
            });
        });
    }

    // --- 8. API LINKS ---
    function setupApiLinks(set) {
        const container = document.getElementById('api-links');
        if (!container || !set.links) return;
        container.innerHTML = set.links.map(l => `
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <div style="width:4px; height:4px; background:var(--primary-color); border-radius:50%; opacity:0.5;"></div>
                <a href="${l.url}" target="_blank"
                   style="font-size:0.72rem; color:var(--text-muted); text-decoration:none; text-transform:uppercase; letter-spacing:0.08em; transition:var(--transition);"
                   onmouseover="this.style.color='var(--primary-color)'"
                   onmouseout="this.style.color='var(--text-muted)'">${l.name}</a>
            </div>
        `).join('');
    }

});
