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

    // Safety: force unlock setelah 5 detik
    setTimeout(() => {
        document.body.classList.remove('noscroll');
        if (pageLoader) { pageLoader.style.opacity = '0'; pageLoader.style.display = 'none'; }
    }, 5000);

    // --- 2. DATA FETCHING ---
    try {
        const endpoints = await (await fetch('/endpoints')).json();
        const set       = await (await fetch('/set')).json();

        // ── Fetch endpoint status dari admin (public, no auth) ──
        let disabledKeys = new Set();
        try {
            const stRes  = await fetch('/endpoints-status');
            const stData = await stRes.json();
            (stData.list || []).forEach(s => {
                if (s.enabled === false) disabledKeys.add(s.key);
            });
        } catch (_) { /* silent */ }

        // ── Fetch per-endpoint require key ──
        async function refreshRequireKeys() {
            try {
                const rkRes  = await fetch('/endpoints-require-key');
                const rkData = await rkRes.json();
                window._requireKeyEndpoints = new Set(rkData.keys || []);
                console.log('[Lumina] requireKey endpoints:', [...window._requireKeyEndpoints]);
            } catch (_) { window._requireKeyEndpoints = new Set(); }
        }
        await refreshRequireKeys();
        window._refreshRequireKeys = refreshRequireKeys; // expose untuk re-call di modal

        // ── Load saved apikey dari localStorage ──
        window._savedApikey = localStorage.getItem('lumina_apikey') || '';

        setContent('api-icon',       'href',        set.icon);
        setContent('api-title',      'textContent', set.name.main);
        setContent('api-description','content',     set.description);
        setContent('api-name',       'textContent', set.name.main);
        setContent('api-author',     'textContent', `by ${set.author}`);
        setContent('api-desc',       'textContent', set.description);
        setContent('api-copyright',  'textContent', `© 2025 ${set.name.copyright}. All rights reserved.`);

        setupApiLinks(set);
        setupApiContent(endpoints, disabledKeys);
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
    function setupApiContent(data, disabledKeys) {
        const apiContent = document.getElementById('api-content');
        if (!apiContent) return;

        // ── Merge kategori duplikat ──
        const mergeMap = new Map();
        (data.endpoints || []).forEach(cat => {
            const key = cat.name.trim().toUpperCase();
            if (mergeMap.has(key)) {
                mergeMap.get(key).items.push(...cat.items);
            } else {
                mergeMap.set(key, { name: cat.name, items: [...cat.items] });
            }
        });
        const categoryData = [...mergeMap.values()];

        function renderCards(grid, items, catIndex) {
            items.forEach((itemData, itemIndex) => {
                const itemName = Object.keys(itemData)[0];
                const item     = itemData[itemName];

                const card = document.createElement('div');
                card.className = 'endpoint-card';
                card.style.userSelect        = 'none';
                card.style.webkitUserSelect  = 'none';
                card.style.webkitTouchCallout = 'none';
                card.style.webkitTapHighlightColor = 'transparent';
                card.dataset.name     = itemName.toLowerCase();
                card.dataset.desc     = (item.desc || '').toLowerCase();
                card.dataset.category = catIndex;

                card.style.opacity    = '0';
                card.style.transition = 'opacity 0.2s ease';

                const endpointKey = (item.path || '/').split('?')[0].replace(/^\//, '').replace(/\//g, '_');
                const isDisabled  = disabledKeys.has(endpointKey);
                const rawStatus   = item.status || 'ready';
                const status      = isDisabled ? 'disabled' : rawStatus;

                const statusMap = {
                    ready   : { cls: 'status-ready',    icon: 'circle',            label: 'Ready'   },
                    error   : { cls: 'status-error',    icon: 'cancel',            label: 'Error'   },
                    update  : { cls: 'status-update',   icon: 'update',            label: 'Update'  },
                    disabled: { cls: 'status-disabled', icon: 'do_not_disturb_on', label: 'Offline' },
                };
                const s = statusMap[status] || statusMap.ready;

                const method    = (item.method || 'GET').toUpperCase();
                const methodCls = { GET:'method-get', POST:'method-post', PUT:'method-put', DELETE:'method-delete' }[method] || 'method-get';

                if (isDisabled) {
                    card.style.opacity = '0';
                    card.style.filter  = 'grayscale(0.4)';
                }

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
                            ${(status === 'error' || isDisabled) ? 'disabled' : ''}>
                            <span class="material-icons" style="font-size:0.75rem;">send</span>
                            Try
                        </button>
                    </div>
                `;

                if (isDisabled) card.title = 'Endpoint ini sedang offline';
                grid.appendChild(card);
            });

            // Batch fade-in semua card sekaligus — lebih enteng dari per-card RAF
            requestAnimationFrame(() => {
                grid.querySelectorAll('.endpoint-card').forEach(c => {
                    c.style.opacity = c.title === 'Endpoint ini sedang offline' ? '0.55' : '1';
                });
            });
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const section  = entry.target;
                const catIndex = Number(section.dataset.catIndex);
                const grid     = section.querySelector('.endpoint-grid');
                if (section.dataset.rendered === 'true') return;
                section.dataset.rendered = 'true';
                renderCards(grid, categoryData[catIndex].items, catIndex);
                observer.unobserve(section);

                // Update maxHeight kalau accordion open
                const accContent = section.querySelector('.accordion-content');
                if (accContent && accContent.classList.contains('open')) {
                    requestAnimationFrame(() => {
                        accContent.style.maxHeight = accContent.scrollHeight + 'px';
                    });
                }
            });
        }, { rootMargin: '300px 0px 300px 0px', threshold: 0 });

        categoryData.forEach((category, catIndex) => {
            const section = document.createElement('div');
            section.className        = 'category-section';
            section.dataset.catIndex = catIndex;
            section.dataset.rendered = 'false';
            section.style.opacity    = '0';
            section.style.transition = 'opacity 0.35s ease';

            const totalItems    = category.items.length;
            const disabledCount = category.items.filter(itemData => {
                const item = itemData[Object.keys(itemData)[0]];
                const key  = (item.path || '/').split('?')[0].replace(/^\//, '').replace(/\//g, '_');
                return disabledKeys.has(key);
            }).length;

            const countHtml = disabledCount > 0
                ? `<span class="category-count">${totalItems}</span>
                   <span style="font-size:0.6rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:100px; background:rgba(244,63,94,0.1); color:#f43f5e; margin-left:0.25rem;">
                       ${disabledCount} offline
                   </span>`
                : `<span class="category-count">${totalItems}</span>`;

            section.innerHTML = `
                <div class="category-header" data-category="${catIndex}">
                    <div class="category-header-left">
                        <div class="category-icon">
                            <span class="material-icons" style="font-size:1.1rem; color:var(--primary-color);">folder</span>
                        </div>
                        <span class="category-name">${category.name}</span>
                        ${countHtml}
                    </div>
                    <span class="material-icons category-chevron">expand_more</span>
                </div>
                <div class="accordion-content" style="max-height:0; overflow:hidden; transition:max-height 0.35s cubic-bezier(0.4,0,0.2,1);">
                    <div class="endpoint-grid" id="grid-${catIndex}"></div>
                </div>
            `;

            apiContent.appendChild(section);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    section.style.opacity = '1';
                });
            });

            observer.observe(section);
        });

        // Accordion toggle
        apiContent.addEventListener('click', e => {
            const header = e.target.closest('.category-header');
            if (header) {
                const content  = header.nextElementSibling;
                const chevron  = header.querySelector('.category-chevron');
                const icon     = header.querySelector('.category-icon .material-icons');
                const section  = header.closest('.category-section');
                const catIndex = Number(section.dataset.catIndex);
                const grid     = section.querySelector('.endpoint-grid');
                const isOpen   = content.classList.toggle('open');
                header.classList.toggle('open', isOpen);
                chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                if (icon) icon.textContent = isOpen ? 'folder_open' : 'folder';

                if (!isOpen) {
                    // Tutup: set ke 0
                    content.style.maxHeight = '0';
                    return;
                }

                if (section.dataset.rendered === 'false') {
                    section.dataset.rendered = 'true';
                    renderCards(grid, categoryData[catIndex].items, catIndex);
                    observer.unobserve(section);
                }

                // Set maxHeight ke actual scrollHeight setelah render selesai
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        content.style.maxHeight = content.scrollHeight + 'px';
                    });
                });
            }
        });

        // Try button
        apiContent.addEventListener('click', e => {
            const btn = e.target.closest('.try-btn');
            if (btn && !btn.disabled) {
                openDocsModal(btn.dataset.name, btn.dataset.path, btn.dataset.desc, btn.dataset.method);
            }
        });
    }

    // --- 4. MODAL ---
    async function openDocsModal(name, endpoint, description, method = 'GET') {
        const paramsContainer   = document.getElementById('params-container');
        const responseContainer = document.getElementById('response-container');
        const responseData      = document.getElementById('response-data');
        const apiUrlEl          = document.getElementById('api-url');
        const sendBtn           = document.getElementById('submit-api');

        responseContainer.classList.remove('visible');
        paramsContainer.innerHTML  = '';
        responseData.innerHTML     = '';

        document.getElementById('modal-title').textContent       = name;
        document.getElementById('modal-path').textContent        = endpoint || '/';
        document.getElementById('modal-description').textContent = description || 'No description available.';

        if (apiUrlEl) {
            const clean = endpoint.split('?')[0];
            apiUrlEl.textContent = `${window.location.origin}${clean}`;
        }

        // ── Cek requireKey dari cache (instant) ──
        const endpointKey = endpoint.split('?')[0].replace(/^\//, '').replace(/\//g, '_');
        let requireApikey = (window._requireKeyEndpoints || new Set()).has(endpointKey);

        // Fetch di background — update apikey field kalau state berubah
        if (window._refreshRequireKeys) {
            window._refreshRequireKeys().then(() => {
                const fresh = (window._requireKeyEndpoints || new Set()).has(endpointKey);
                if (fresh !== requireApikey) {
                    requireApikey = fresh;
                    const sec = document.getElementById('apikey-section');
                    if (sec) {
                        sec.style.display = fresh ? 'block' : 'none';
                    }
                }
            });
        }
        const savedApikey   = window._savedApikey || '';

        const apikeySection = document.createElement('div');
        apikeySection.className = 'params-section';
        apikeySection.id        = 'apikey-section';
        apikeySection.style.display = requireApikey ? 'block' : 'none';
        apikeySection.innerHTML = `
            <div class="params-title">
                <span class="material-icons" style="font-size:0.75rem;">vpn_key</span>
                API Key
                ${requireApikey ? '<span style="font-size:0.6rem; color:var(--error-color); font-weight:700; margin-left:0.25rem;">* required</span>' : ''}
            </div>
            <div class="param-group">
                <div class="param-label" style="display:flex; justify-content:space-between;">
                    <span>apikey${requireApikey ? '' : ' <span style="font-size:0.62rem;color:var(--text-muted);font-weight:400;">(optional)</span>'}</span>
                    <span id="apikey-save-hint" style="font-size:0.6rem; color:var(--text-muted); cursor:pointer;" onclick="saveApikeyLocal()">
                        <span class="material-icons" style="font-size:0.65rem; vertical-align:middle;">bookmark</span> Save key
                    </span>
                </div>
                <input type="text" id="modal-apikey" class="param-input"
                    placeholder="lmn_xxxxxxxxxxxxxxxx"
                    value="${savedApikey}"
                    style="font-family:'Courier New',monospace; font-size:0.75rem;">
                <div id="error-apikey" style="display:none; font-size:0.65rem; color:var(--error-color); margin-top:0.25rem;">API Key wajib diisi.</div>
                ${savedApikey ? '<div style="font-size:0.6rem; color:var(--success-color); margin-top:0.25rem;">✓ Saved key loaded</div>' : ''}
            </div>
        `;
        paramsContainer.appendChild(apikeySection);

        // ── Params dari endpoint ──
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

        if (window.openApiModal) window.openApiModal();
    }

    // Save apikey ke localStorage
    window.saveApikeyLocal = function() {
        const key = document.getElementById('modal-apikey')?.value?.trim();
        if (!key) return;
        localStorage.setItem('lumina_apikey', key);
        window._savedApikey = key;
        const hint = document.getElementById('apikey-save-hint');
        if (hint) { hint.innerHTML = '<span class="material-icons" style="font-size:0.65rem; vertical-align:middle; color:var(--success-color);">check</span> Saved!'; }
        setTimeout(() => {
            if (hint) hint.innerHTML = '<span class="material-icons" style="font-size:0.65rem; vertical-align:middle;">bookmark</span> Save key';
        }, 2000);
    };

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

        let isValid     = true;
        let baseUrl     = endpoint.split('?')[0];
        let queryParams = new URLSearchParams();

        // ── Cek apikey ──
        const requireApikey = (window._requireKeyEndpoints || new Set()).has(endpoint.split('?')[0].replace(/^\//, '').replace(/\//g, '_'));
        const apikeyInput   = document.getElementById('modal-apikey');
        const apikeyVal     = apikeyInput?.value?.trim() || '';
        const apikeyError   = document.getElementById('error-apikey');

        if (requireApikey && !apikeyVal) {
            isValid = false;
            if (apikeyInput) apikeyInput.classList.add('invalid');
            if (apikeyError) apikeyError.style.display = 'block';
        } else {
            if (apikeyInput) apikeyInput.classList.remove('invalid');
            if (apikeyError) apikeyError.style.display = 'none';
            if (apikeyVal) queryParams.append('apikey', apikeyVal);
        }

        paramsContainer.querySelectorAll('.param-input').forEach(input => {
            if (input.id === 'modal-apikey') return; // skip apikey input
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

        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span class="material-icons" style="font-size:1rem; animation:spin 0.8s linear infinite;">refresh</span> Sending...`;
        responseContainer.classList.add('visible');
        responseData.innerHTML = `<span style="opacity:0.5; font-size:0.72rem;">Processing request...</span>`;

        const start = Date.now();
        try {
            const res         = await fetch(finalUrl);
            const duration    = Date.now() - start;
            const contentType = res.headers.get('content-type') || '';

            statusEl.textContent = `${res.status} ${res.statusText || (res.ok ? 'OK' : 'Error')}`;
            statusEl.className   = `response-status ${res.ok ? 'ok' : 'error'}`;
            timeEl.textContent   = `${duration}ms`;

            logActivity({ endpoint: finalUrl, status: res.status, ok: res.ok, duration, error: res.ok ? null : `HTTP ${res.status}`, timestamp: Date.now() });

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
            // Smooth scroll modal ke response section — tidak jumping
            setTimeout(() => {
                const modal = document.getElementById('api-modal');
                const respEl = document.getElementById('response-container');
                if (modal && respEl) {
                    modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
                }
            }, 50);
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
                const header   = section.querySelector('.category-header');
                const content  = section.querySelector('.accordion-content');
                const chevron  = header.querySelector('.category-chevron');
                const icon     = header.querySelector('.category-icon .material-icons');
                let   hasMatch = false;

                section.querySelectorAll('.endpoint-card').forEach(card => {
                    const match = !term || card.dataset.name.includes(term) || card.dataset.desc.includes(term);
                    card.style.display = match ? '' : 'none';
                    if (match) hasMatch = true;
                });

                if (term) {
                    if (hasMatch) {
                        content.classList.add('open');
                        header.classList.add('open');
                        chevron.style.transform = 'rotate(180deg)';
                        if (icon) icon.textContent = 'folder_open';
                    }
                    section.style.display = hasMatch ? '' : 'none';
                } else {
                    content.classList.remove('open');
                    header.classList.remove('open');
                    chevron.style.transform = 'rotate(0deg)';
                    if (icon) icon.textContent = 'folder';
                    section.style.display = '';
                    section.querySelectorAll('.endpoint-card').forEach(c => c.style.display = '');
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
