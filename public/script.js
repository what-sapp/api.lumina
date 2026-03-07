// ─────────────────────────────────────────────────────────────
// script.js  —  Lumina Docs (docs.html) — performance optimized
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

    setTimeout(() => {
        document.body.classList.remove('noscroll');
        if (pageLoader) { pageLoader.style.opacity = '0'; pageLoader.style.display = 'none'; }
    }, 5000);

    // --- 2. DATA FETCHING ---
    let categoryData = [];
    let disabledKeys = new Set();

    const endpointSchemaMap = new Map();

    const statusMap = {
        ready   : { cls: 'status-ready',    icon: 'circle',            label: 'Ready'   },
        error   : { cls: 'status-error',    icon: 'cancel',            label: 'Error'   },
        update  : { cls: 'status-update',   icon: 'update',            label: 'Update'  },
        disabled: { cls: 'status-disabled', icon: 'do_not_disturb_on', label: 'Offline' },
    };
    const methodClsMap = { GET:'method-get', POST:'method-post', PUT:'method-put', DELETE:'method-delete' };

    function renderCards(grid, items, catIndex) {
        const html = items.map((itemData) => {
            const itemName    = Object.keys(itemData)[0];
            const item        = itemData[itemName];
            const endpointKey = (item.path || '/').split('?')[0].replace(/^\//, '').replace(/\//g, '_');
            const isDisabled  = disabledKeys.has(endpointKey);
            const status      = isDisabled ? 'disabled' : (item.status || 'ready');
            const s           = statusMap[status] || statusMap.ready;
            const method      = (item.method || 'GET').toUpperCase();
            const methodCls   = methodClsMap[method] || 'method-get';
            const isTryDisabled  = (status === 'error' || isDisabled) ? 'disabled' : '';
            const disabledStyle  = isDisabled ? 'opacity:0.55; filter:grayscale(0.4);' : '';
            const disabledTitle  = isDisabled ? 'title="Endpoint ini sedang offline"' : '';

            if (item.paramsSchema) {
                endpointSchemaMap.set(endpointKey, item.paramsSchema);
            }

            return `<div class="endpoint-card" style="${disabledStyle}" ${disabledTitle}
                data-name="${itemName.toLowerCase()}"
                data-desc="${(item.desc || '').toLowerCase().replace(/"/g, '&quot;')}"
                data-category="${catIndex}"
                data-schema="${endpointKey}">
                <div class="endpoint-card-header">
                    <span class="method-badge ${methodCls}">${method}</span>
                    <span class="endpoint-name">${itemName}</span>
                </div>
                <div class="endpoint-path">${item.path || '/'}</div>
                <div class="endpoint-card-footer">
                    <span class="status-badge ${s.cls}">
                        <span class="material-icons" style="font-size:0.6rem;">${s.icon}</span>
                        ${s.label}
                    </span>
                    <button class="try-btn"
                        data-path="${item.path || ''}"
                        data-name="${itemName}"
                        data-desc="${(item.desc || '').replace(/"/g, '&quot;')}"
                        data-method="${method}"
                        data-schema="${endpointKey}"
                        ${isTryDisabled}>
                        <span class="material-icons" style="font-size:0.75rem;">send</span>
                        Try
                    </button>
                </div>
            </div>`;
        }).join('');

        grid.innerHTML = html;
    }

    // Skeleton saat data belum datang
    function showSkeletons() {
        const apiContent = document.getElementById('api-content');
        if (!apiContent) return;
        apiContent.innerHTML = `<style>@keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}</style>` +
            Array.from({ length: 6 }).map(() => `
                <div class="category-section" style="animation:shimmer 1.4s infinite;">
                    <div class="category-header" style="pointer-events:none;">
                        <div class="category-header-left">
                            <div class="category-icon" style="background:var(--border-color);"></div>
                            <div style="height:0.8rem;width:7rem;background:var(--border-color);border-radius:4px !important;"></div>
                            <div style="height:0.8rem;width:2rem;background:var(--border-color);border-radius:100px !important;margin-left:0.5rem;"></div>
                        </div>
                        <div style="height:0.8rem;width:0.8rem;background:var(--border-color);border-radius:4px !important;"></div>
                    </div>
                </div>`).join('');
    }
    showSkeletons();

    try {
        const endpoints = await (await fetch('/endpoints')).json();
        const set       = await (await fetch('/set')).json();

        try {
            const stRes  = await fetch('/endpoints-status');
            const stData = await stRes.json();
            (stData.list || []).forEach(s => {
                if (s.enabled === false) disabledKeys.add(s.key);
            });
        } catch (_) {}

        async function refreshRequireKeys() {
            try {
                const rkRes  = await fetch('/endpoints-require-key');
                const rkData = await rkRes.json();
                window._requireKeyEndpoints = new Set(rkData.keys || []);
            } catch (_) { window._requireKeyEndpoints = new Set(); }
        }
        await refreshRequireKeys();
        window._refreshRequireKeys = refreshRequireKeys;
        window._savedApikey = localStorage.getItem('lumina_apikey') || '';

        setContent('api-icon',       'href',        set.icon);
        setContent('api-title',      'textContent', set.name.main);
        setContent('api-description','content',     set.description);
        setContent('api-name',       'textContent', set.name.main);
        setContent('api-author',     'textContent', `by ${set.author}`);
        setContent('api-desc',       'textContent', set.description);
        setContent('api-copyright',  'textContent', `© 2025 ${set.name.copyright}. All rights reserved.`);

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

        const mergeMap = new Map();
        (data.endpoints || []).forEach(cat => {
            const key = cat.name.trim().toUpperCase();
            if (mergeMap.has(key)) {
                mergeMap.get(key).items.push(...cat.items);
            } else {
                mergeMap.set(key, { name: cat.name, items: [...cat.items] });
            }
        });
        categoryData = [...mergeMap.values()];

        const fragment = document.createDocumentFragment();

        categoryData.forEach((category, catIndex) => {
            const section = document.createElement('div');
            section.className        = 'category-section';
            section.dataset.catIndex = catIndex;
            section.dataset.rendered = 'false';

            const totalItems    = category.items.length;
            const disabledCount = category.items.filter(itemData => {
                const item = itemData[Object.keys(itemData)[0]];
                const key  = (item.path || '/').split('?')[0].replace(/^\//, '').replace(/\//g, '_');
                return disabledKeys.has(key);
            }).length;

            const countHtml = disabledCount > 0
                ? `<span class="category-count">${totalItems}</span>
                   <span style="font-size:0.6rem;font-weight:700;padding:0.2rem 0.5rem;border-radius:100px;background:rgba(244,63,94,0.1);color:#f43f5e;margin-left:0.25rem;">${disabledCount} offline</span>`
                : `<span class="category-count">${totalItems}</span>`;

            section.innerHTML = `
                <div class="category-header" data-category="${catIndex}">
                    <div class="category-header-left">
                        <div class="category-icon">
                            <span class="material-icons" style="font-size:1.1rem;color:var(--primary-color);">folder</span>
                        </div>
                        <span class="category-name">${category.name}</span>
                        ${countHtml}
                    </div>
                    <span class="material-icons category-chevron">expand_more</span>
                </div>
                <div class="accordion-content" style="max-height:0;overflow:hidden;transition:max-height 0.3s cubic-bezier(0.4,0,0.2,1);">
                    <div class="endpoint-grid" id="grid-${catIndex}"></div>
                </div>
            `;

            fragment.appendChild(section);
        });

        // Clear skeleton, masukkan konten asli
        apiContent.innerHTML = '';
        apiContent.appendChild(fragment);

        apiContent.addEventListener('click', e => {
            const btn = e.target.closest('.try-btn');
            if (btn && !btn.disabled) {
                openDocsModal(btn.dataset.name, btn.dataset.path, btn.dataset.desc, btn.dataset.method, btn.dataset.schema);
                return;
            }

            const header = e.target.closest('.category-header');
            if (!header) return;

            const section  = header.closest('.category-section');
            const content  = header.nextElementSibling;
            const chevron  = header.querySelector('.category-chevron');
            const icon     = header.querySelector('.category-icon .material-icons');
            const catIndex = Number(section.dataset.catIndex);
            const grid     = section.querySelector('.endpoint-grid');
            const isOpen   = content.classList.toggle('open');

            header.classList.toggle('open', isOpen);
            chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
            if (icon) icon.textContent = isOpen ? 'folder_open' : 'folder';

            if (!isOpen) {
                content.style.maxHeight = '0';
                return;
            }

            // Lazy render dulu sebelum scroll & maxHeight
            if (section.dataset.rendered === 'false') {
                section.dataset.rendered = 'true';
                renderCards(grid, categoryData[catIndex].items, catIndex);
            }

            // Tutup accordion lain, lalu scroll ke header yg diklik
            apiContent.querySelectorAll('.category-section').forEach(otherSection => {
                if (otherSection === section) return;
                const otherContent = otherSection.querySelector('.accordion-content');
                const otherHeader  = otherSection.querySelector('.category-header');
                const otherChevron = otherSection.querySelector('.category-chevron');
                const otherIcon    = otherSection.querySelector('.category-icon .material-icons');
                if (otherContent.classList.contains('open')) {
                    otherContent.classList.remove('open');
                    otherHeader.classList.remove('open');
                    otherContent.style.maxHeight = '0';
                    if (otherChevron) otherChevron.style.transform = 'rotate(0deg)';
                    if (otherIcon) otherIcon.textContent = 'folder';
                }
            });

            // Buka accordion yg diklik
            requestAnimationFrame(() => {
                content.style.maxHeight = content.scrollHeight + 'px';
            });

            // Tunggu transition tutup selesai (300ms) baru scroll
            setTimeout(() => {
                const rect = header.getBoundingClientRect();
                window.scrollTo({ top: window.scrollY + rect.top - 70, behavior: 'smooth' });
            }, 310);
        });
    }

    // --- 4. MODAL ---
    async function openDocsModal(name, endpoint, description, method = 'GET', schemaKey = '') {
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

        const endpointKey  = endpoint.split('?')[0].replace(/^\//, '').replace(/\//g, '_');
        const schema       = endpointSchemaMap.get(schemaKey || endpointKey) || {};
        let requireApikey  = (window._requireKeyEndpoints || new Set()).has(endpointKey);

        if (window._refreshRequireKeys) {
            window._refreshRequireKeys().then(() => {
                const fresh = (window._requireKeyEndpoints || new Set()).has(endpointKey);
                if (fresh !== requireApikey) {
                    requireApikey = fresh;
                    const sec = document.getElementById('apikey-section');
                    if (sec) sec.style.display = fresh ? 'block' : 'none';
                }
            });
        }

        const savedApikey   = window._savedApikey || '';
        const apikeySection = document.createElement('div');
        apikeySection.className     = 'params-section';
        apikeySection.id            = 'apikey-section';
        apikeySection.style.display = requireApikey ? 'block' : 'none';
        apikeySection.innerHTML = `
            <div class="params-title">
                <span class="material-icons" style="font-size:0.75rem;">vpn_key</span>
                API Key
                ${requireApikey ? '<span style="font-size:0.6rem;color:var(--error-color);font-weight:700;margin-left:0.25rem;">* required</span>' : ''}
            </div>
            <div class="param-group">
                <div class="param-label" style="display:flex;justify-content:space-between;">
                    <span>apikey</span>
                    <span id="apikey-save-hint" style="font-size:0.6rem;color:var(--text-muted);cursor:pointer;" onclick="saveApikeyLocal()">
                        <span class="material-icons" style="font-size:0.65rem;vertical-align:middle;">bookmark</span> Save key
                    </span>
                </div>
                <input type="text" id="modal-apikey" class="param-input"
                    placeholder="lmn_xxxxxxxxxxxxxxxx"
                    value="${savedApikey}"
                    style="font-family:'Courier New',monospace;font-size:0.75rem;">
                <div id="error-apikey" style="display:none;font-size:0.65rem;color:var(--error-color);margin-top:0.25rem;">API Key wajib diisi.</div>
                ${savedApikey ? '<div style="font-size:0.6rem;color:var(--success-color);margin-top:0.25rem;">✓ Saved key loaded</div>' : ''}
            </div>
        `;
        paramsContainer.appendChild(apikeySection);

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
                const isOptional  = p.startsWith('_');
                const cleanName   = isOptional ? p.substring(1) : p;
                const paramSchema = schema[cleanName] || schema[p] || {};
                const isFile      = paramSchema.type === 'file';
                const isSelect    = paramSchema.type === 'select';
                const group       = document.createElement('div');
                group.className   = 'param-group';

                if (isFile) {
                    group.innerHTML = `
                        <div class="param-label">
                            ${cleanName}
                            ${!isOptional ? '<span class="param-required">*required</span>' : '<span style="font-size:0.62rem;color:var(--text-muted);font-weight:400;">(optional)</span>'}
                        </div>
                        <label class="file-input-label" id="label-${p}">
                            <span class="material-icons" style="font-size:1.25rem;color:var(--primary-color);">upload_file</span>
                            <span class="file-input-text" id="file-text-${p}">Tap to choose file</span>
                            <input type="file" id="param-${p}" class="param-file-input" style="display:none;">
                        </label>
                        <div id="error-${p}" style="display:none;font-size:0.65rem;color:var(--error-color);margin-top:0.25rem;">File wajib dipilih.</div>
                    `;
                    section.appendChild(group);
                    setTimeout(() => {
                        const fileInput = document.getElementById(`param-${p}`);
                        const fileText  = document.getElementById(`file-text-${p}`);
                        const label     = document.getElementById(`label-${p}`);
                        if (fileInput) {
                            fileInput.addEventListener('change', () => {
                                if (fileInput.files[0]) {
                                    const f    = fileInput.files[0];
                                    const size = f.size > 1024*1024
                                        ? (f.size/1024/1024).toFixed(1) + ' MB'
                                        : (f.size/1024).toFixed(1) + ' KB';
                                    fileText.textContent = `${f.name} (${size})`;
                                    if (label) label.style.borderColor = 'var(--primary-color)';
                                }
                            });
                        }
                    }, 0);
                } else if (isSelect) {
                    const optionsHtml = (paramSchema.options || []).map(opt => {
                        const val     = typeof opt === 'object' ? opt.value : opt;
                        const label   = typeof opt === 'object' ? opt.label : opt;
                        const selected = val === (paramSchema.default || '') ? 'selected' : '';
                        return `<option value="${val}" ${selected}>${label}</option>`;
                    }).join('');
                    group.innerHTML = `
                        <div class="param-label">
                            ${cleanName}
                            ${!isOptional ? '<span class="param-required">*required</span>' : '<span style="font-size:0.62rem;color:var(--text-muted);font-weight:400;">(optional)</span>'}
                        </div>
                        <select id="param-${p}" class="param-select">
                            ${isOptional ? '<option value="">— optional —</option>' : ''}
                            ${optionsHtml}
                        </select>
                        <div id="error-${p}" style="display:none;font-size:0.65rem;color:var(--error-color);margin-top:0.25rem;">This field is required.</div>
                    `;
                    section.appendChild(group);
                } else {
                    group.innerHTML = `
                        <div class="param-label">
                            ${cleanName}
                            ${!isOptional ? '<span class="param-required">*required</span>' : '<span style="font-size:0.62rem;color:var(--text-muted);font-weight:400;">(optional)</span>'}
                        </div>
                        <input type="text" id="param-${p}" class="param-input" placeholder="Enter ${cleanName}...">
                        <div id="error-${p}" style="display:none;font-size:0.65rem;color:var(--error-color);margin-top:0.25rem;">This field is required.</div>
                    `;
                    section.appendChild(group);
                }
            });
            paramsContainer.appendChild(section);
        }

        sendBtn.onclick = () => handleApiRequest(endpoint, paramsContainer, method, schema);
        if (window.openApiModal) window.openApiModal();
    }

    window.saveApikeyLocal = function() {
        const key = document.getElementById('modal-apikey')?.value?.trim();
        if (!key) return;
        localStorage.setItem('lumina_apikey', key);
        window._savedApikey = key;
        const hint = document.getElementById('apikey-save-hint');
        if (hint) { hint.innerHTML = '<span class="material-icons" style="font-size:0.65rem;vertical-align:middle;color:var(--success-color);">check</span> Saved!'; }
        setTimeout(() => {
            if (hint) hint.innerHTML = '<span class="material-icons" style="font-size:0.65rem;vertical-align:middle;">bookmark</span> Save key';
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
    async function handleApiRequest(endpoint, paramsContainer, method = 'GET', schema = {}) {
        const sendBtn           = document.getElementById('submit-api');
        const responseContainer = document.getElementById('response-container');
        const responseData      = document.getElementById('response-data');
        const statusEl          = document.getElementById('response-status');
        const timeEl            = document.getElementById('response-time');

        let isValid      = true;
        let baseUrl      = endpoint.split('?')[0];
        let queryParams  = new URLSearchParams();
        let hasFileInput = false;
        let formData     = null;

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

        paramsContainer.querySelectorAll('input[type="file"]').forEach(() => { hasFileInput = true; });
        if (hasFileInput) formData = new FormData();

        paramsContainer.querySelectorAll('.param-input, .param-file-input').forEach(input => {
            if (input.id === 'modal-apikey') return;
            const pName      = input.id.replace('param-', '');
            const isFile     = input.type === 'file';
            const error      = document.getElementById(`error-${pName}`);
            const isOptional = pName.startsWith('_');

            if (isFile) {
                if (!isOptional && (!input.files || !input.files[0])) {
                    isValid = false;
                    const label = document.getElementById(`label-${pName}`);
                    if (label) label.style.borderColor = 'var(--error-color)';
                    if (error) error.style.display = 'block';
                } else {
                    const label = document.getElementById(`label-${pName}`);
                    if (label) label.style.borderColor = '';
                    if (error) error.style.display = 'none';
                    if (input.files && input.files[0]) formData.append(pName, input.files[0]);
                }
            } else {
                const val = input.value.trim();
                if (!isOptional && !val) {
                    isValid = false;
                    input.classList.add('invalid');
                    if (error) error.style.display = 'block';
                } else {
                    input.classList.remove('invalid');
                    if (error) error.style.display = 'none';
                    if (val) {
                        if (baseUrl.includes(`{${pName}}`)) {
                            baseUrl = baseUrl.replace(`{${pName}}`, encodeURIComponent(val));
                        } else if (hasFileInput && formData) {
                            formData.append(pName, val);
                        } else {
                            queryParams.append(pName, val);
                        }
                    }
                }
            }
        });

        paramsContainer.querySelectorAll('.param-select').forEach(select => {
            const pName      = select.id.replace('param-', '');
            const val        = select.value;
            const isOptional = pName.startsWith('_');
            const error      = document.getElementById(`error-${pName}`);
            if (!isOptional && !val) {
                isValid = false;
                select.classList.add('invalid');
                if (error) error.style.display = 'block';
            } else {
                select.classList.remove('invalid');
                if (error) error.style.display = 'none';
                if (val) {
                    const cleanName = isOptional ? pName.substring(1) : pName;
                    if (hasFileInput && formData) {
                        formData.append(cleanName, val);
                    } else {
                        queryParams.append(cleanName, val);
                    }
                }
            }
        });

        if (!isValid) return;

        const finalUrl = queryParams.toString() ? `${baseUrl}?${queryParams}` : baseUrl;

        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span class="material-icons" style="font-size:1rem;animation:spin 0.8s linear infinite;">refresh</span> Sending...`;
        responseContainer.classList.add('visible');
        responseData.innerHTML = `<span style="opacity:0.5;font-size:0.72rem;">Processing request...</span>`;

        const start = Date.now();
        try {
            const fetchOptions = hasFileInput
                ? { method: 'POST', body: formData }
                : { method: method.toUpperCase() };

            const res         = await fetch(finalUrl, fetchOptions);
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
                    <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;">
                        <img src="${imgUrl}" style="max-width:100%;height:auto;border-radius:var(--border-radius-sm);border:1px solid var(--border-color);">
                        <a href="${imgUrl}" download="result.jpg" class="try-btn" style="text-decoration:none;font-size:0.7rem;">
                            <span class="material-icons" style="font-size:0.75rem;">download</span> Download
                        </a>
                    </div>`;
            } else if (contentType.includes('application/json')) {
                const json = await res.json();
                responseData.textContent = JSON.stringify(json, null, 2);
            } else {
                responseData.textContent = await res.text();
            }

            setTimeout(() => {
                const modal = document.getElementById('api-modal');
                if (modal) modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
            }, 50);
        } catch (err) {
            const duration = Date.now() - start;
            statusEl.textContent = 'Error';
            statusEl.className   = 'response-status error';
            timeEl.textContent   = `${duration}ms`;
            responseData.innerHTML = `<span style="color:var(--error-color);font-weight:600;">Error: ${err.message}</span>`;
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

        let searchTimer;
        searchInput.addEventListener('input', e => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const term = e.target.value.toLowerCase().trim();

                document.querySelectorAll('.category-section').forEach(section => {
                    const header   = section.querySelector('.category-header');
                    const content  = section.querySelector('.accordion-content');
                    const chevron  = header?.querySelector('.category-chevron');
                    const icon     = header?.querySelector('.category-icon .material-icons');
                    const catIndex = Number(section.dataset.catIndex);
                    const grid     = section.querySelector('.endpoint-grid');

                    if (!header || !content) return;

                    if (term && section.dataset.rendered === 'false') {
                        section.dataset.rendered = 'true';
                        renderCards(grid, categoryData[catIndex].items, catIndex);
                    }

                    let hasMatch = false;
                    section.querySelectorAll('.endpoint-card').forEach(card => {
                        const match = !term || card.dataset.name.includes(term) || card.dataset.desc.includes(term);
                        card.style.display = match ? '' : 'none';
                        if (match) hasMatch = true;
                    });

                    if (term) {
                        if (hasMatch) {
                            content.classList.add('open');
                            header.classList.add('open');
                            if (chevron) chevron.style.transform = 'rotate(180deg)';
                            if (icon) icon.textContent = 'folder_open';
                            requestAnimationFrame(() => {
                                content.style.maxHeight = content.scrollHeight + 'px';
                            });
                        }
                        section.style.display = hasMatch ? '' : 'none';
                    } else {
                        content.classList.remove('open');
                        header.classList.remove('open');
                        content.style.maxHeight = '0';
                        if (chevron) chevron.style.transform = 'rotate(0deg)';
                        if (icon) icon.textContent = 'folder';
                        section.style.display = '';
                        section.querySelectorAll('.endpoint-card').forEach(c => c.style.display = '');
                    }
                });
            }, 150);
        });
    }

});
