// ─────────────────────────────────────────────────────────────
// script.js  —  Lumina Docs (docs.html) — ENHANCED VERSION
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
        
        setContent('api-icon', 'href', set.icon);
        setContent('api-title', 'textContent', set.name.main);
        setContent('api-description', 'content', set.description);
        setContent('api-name', 'textContent', set.name.main);
        setContent('api-author', 'textContent', `by ${set.author}`);
        setContent('api-desc', 'textContent', set.description);
        setContent('api-copyright', 'textContent', `© 2025 ${set.name.copyright}. All rights reserved.`);
        setContent('api-info', 'href', set.info_url);
        
        setupApiLinks(set);
        setupApiContent(endpoints);
        setupSearchFunctionality();
        setupAccordion();
        hideLoader();
    } catch (error) {
        console.error('Error loading configuration:', error);
        hideLoader();
    }

    function setContent(id, property, value) {
        const element = document.getElementById(id);
        if (element) element[property] = value;
    }

    // --- 3. UI GENERATION ---
    function setupApiContent(data) {
        const apiContent = document.getElementById('api-content');
        if (!apiContent) return;

        data.endpoints.forEach(category => {
            const categoryWrapper = document.createElement('div');
            categoryWrapper.className = 'mb-5 category-section';
            
            categoryWrapper.innerHTML = `
                <div class="category-header flex items-center justify-between p-4 bg-gray-100 border border-gray-300 transition-all hover:bg-gray-200 cursor-pointer">
                    <div class="flex items-center gap-3">
                        <span class="material-icons text-gray-500" style="font-size:18px;">folder</span>
                        <h3 class="text-sm font-bold text-gray-700 uppercase tracking-tight">${category.name}</h3>
                    </div>
                    <span class="material-icons accordion-icon text-gray-600">expand_more</span>
                </div>
                <div class="accordion-content">
                    <div class="row pt-4 space-y-2"></div>
                </div>
            `;

            const row = categoryWrapper.querySelector('.row');
            category.items.forEach(itemData => {
                const itemName = Object.keys(itemData)[0];
                const item     = itemData[itemName];
                const itemEl   = document.createElement('div');
                itemEl.className = 'api-item-card w-full mb-2';
                itemEl.dataset.name = itemName.toLowerCase();
                itemEl.dataset.desc = (item.desc || '').toLowerCase();

                // HTTP Method Badge
                const method = item.method || 'GET';
                const methodColors = {
                    'GET': 'bg-blue-600',
                    'POST': 'bg-green-600',
                    'PUT': 'bg-yellow-600',
                    'DELETE': 'bg-red-600',
                    'PATCH': 'bg-purple-600'
                };
                const methodColor = methodColors[method] || 'bg-gray-600';

                itemEl.innerHTML = `
                    <div class="flex items-center justify-between p-4 px-6 bg-gray-50 border border-gray-200 shadow-sm transition-all hover:border-gray-800">
                        <div class="flex-grow mr-4 overflow-hidden">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="${methodColor} text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded">${method}</span>
                                <h5 class="text-[13px] font-bold text-gray-800 truncate uppercase tracking-tight">${itemName}</h5>
                            </div>
                            <p class="text-[11px] font-medium text-gray-500 truncate">${item.desc || 'No description available'}</p>
                        </div>
                        <button class="try-btn bg-gray-800 text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
                                data-path='${item.path || ""}' 
                                data-name="${itemName}" 
                                data-desc="${item.desc || ""}"
                                data-method="${method}"
                                data-params='${JSON.stringify(item.params || [])}'>TRY</button>
                    </div>
                `;
                row.appendChild(itemEl);
            });
            apiContent.appendChild(categoryWrapper);
        });

        apiContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('try-btn')) {
                const btn = e.target;
                openApiModal(
                    btn.dataset.name, 
                    btn.dataset.path, 
                    btn.dataset.desc,
                    btn.dataset.method,
                    JSON.parse(btn.dataset.params || '[]')
                );
            }
        });
    }

    // --- 4. MODAL & PARAMETER LOGIC (ENHANCED) ---
    function openApiModal(name, endpoint, description, method = 'GET', params = []) {
        const modal            = document.getElementById('api-modal');
        const modalContent     = modal.querySelector('.relative.z-10');
        const paramsContainer  = document.getElementById('params-container');
        const responseContainer = document.getElementById('response-container');
        const responseData     = document.getElementById('response-data');
        
        // Display URL endpoint with method
        const apiUrlElement = document.getElementById('api-url');
        if (apiUrlElement) {
            const baseUrl      = window.location.origin;
            const cleanEndpoint = endpoint.split('?')[0];
            const methodColors = {
                'GET': 'text-blue-600',
                'POST': 'text-green-600',
                'PUT': 'text-yellow-600',
                'DELETE': 'text-red-600'
            };
            const methodColor = methodColors[method] || 'text-gray-600';
            apiUrlElement.innerHTML = `<span class="${methodColor} font-bold">${method}</span> ${baseUrl}${cleanEndpoint}`;
        }
        
        responseContainer.classList.add('hidden');
        paramsContainer.innerHTML = '';
        responseData.innerHTML   = '';
        document.getElementById('modal-title').textContent      = name;
        document.getElementById('api-description').textContent  = description;
        document.getElementById('submit-api').classList.remove('hidden');
        paramsContainer.classList.remove('hidden');

        // Normalize params (support both old & new format)
        const normalizedParams = normalizeParams(params, endpoint);
        
        normalizedParams.forEach(param => createParamInput(param, paramsContainer));

        modal.classList.remove('hidden');
        document.body.classList.add('noscroll');
        setTimeout(() => {
            modal.classList.add('opacity-100');
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);

        document.getElementById('submit-api').onclick = () => handleApiRequest(endpoint, paramsContainer, method);
    }

    // --- NORMALIZE PARAMS (Backward Compatible) ---
    function normalizeParams(params, endpoint) {
        const normalized = [];

        // Jika params adalah array string (format lama)
        if (params.length > 0 && typeof params[0] === 'string') {
            params.forEach(p => {
                const isOptional = p.startsWith('_');
                normalized.push({
                    name: p,
                    type: 'text',
                    required: !isOptional,
                    placeholder: `Enter ${p.replace('_', '')}...`
                });
            });
        } 
        // Jika params adalah array object (format baru)
        else if (params.length > 0 && typeof params[0] === 'object') {
            normalized.push(...params);
        }
        // Fallback: deteksi dari endpoint URL
        else {
            const pathMatches = endpoint.match(/{([^}]+)}/g);
            if (pathMatches) {
                pathMatches.forEach(m => {
                    const pName = m.replace(/{|}/g, '');
                    normalized.push({
                        name: pName,
                        type: 'text',
                        required: !pName.startsWith('_'),
                        placeholder: `Enter ${pName.replace('_', '')}...`
                    });
                });
            }
            
            if (endpoint.includes('?')) {
                endpoint.split('?')[1].split('&').forEach(p => {
                    const pName = p.split('=')[0];
                    if (pName && !normalized.find(n => n.name === pName)) {
                        normalized.push({
                            name: pName,
                            type: 'text',
                            required: !pName.startsWith('_'),
                            placeholder: `Enter ${pName.replace('_', '')}...`
                        });
                    }
                });
            }
        }

        return normalized;
    }

    // --- CREATE PARAM INPUT (ENHANCED) ---
    function createParamInput(param, container) {
        const isOptional = param.required === false || param.name.startsWith('_');
        const cleanName  = param.name.replace(/^_/, '');
        const div        = document.createElement('div');
        div.className    = 'mb-3';

        let inputHTML = '';
        const inputId = `param-${param.name}`;

        // Label
        let labelHTML = `
            <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">
                ${cleanName} ${isOptional ? '(Optional)' : '*'}
            </label>
        `;

        if (param.description) {
            labelHTML += `<p class="text-[9px] text-gray-500 mb-1">${param.description}</p>`;
        }

        // Input based on type
        switch (param.type) {
            case 'dropdown':
            case 'select':
                const options = param.options || [];
                const defaultVal = param.default || '';
                inputHTML = `
                    <select id="${inputId}" 
                            class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none bg-white">
                        ${isOptional ? '<option value="">-- Select --</option>' : ''}
                        ${options.map(opt => `<option value="${opt}" ${opt === defaultVal ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                `;
                break;

            case 'file':
                const accept = param.accept || '*/*';
                const maxSize = param.maxSize || 10485760; // 10MB default
                inputHTML = `
                    <input type="file" 
                           id="${inputId}" 
                           accept="${accept}"
                           data-max-size="${maxSize}"
                           class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none">
                    <div id="preview-${param.name}" class="mt-2 hidden">
                        <img id="img-preview-${param.name}" class="max-w-full h-auto max-h-48 border border-gray-200 rounded" />
                        <p id="file-info-${param.name}" class="text-[9px] text-gray-600 mt-1"></p>
                    </div>
                `;
                break;

            case 'number':
                const min = param.min !== undefined ? `min="${param.min}"` : '';
                const max = param.max !== undefined ? `max="${param.max}"` : '';
                const defaultNum = param.default || '';
                inputHTML = `
                    <input type="number" 
                           id="${inputId}" 
                           ${min} ${max}
                           value="${defaultNum}"
                           class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none" 
                           placeholder="${param.placeholder || `Enter ${cleanName}...`}">
                `;
                break;

            case 'textarea':
                const rows = param.rows || 4;
                inputHTML = `
                    <textarea id="${inputId}" 
                              rows="${rows}"
                              class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none resize-none" 
                              placeholder="${param.placeholder || `Enter ${cleanName}...`}"></textarea>
                `;
                break;

            default: // text
                inputHTML = `
                    <input type="text" 
                           id="${inputId}" 
                           class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none" 
                           placeholder="${param.placeholder || `Enter ${cleanName}...`}">
                `;
        }

        div.innerHTML = `
            ${labelHTML}
            ${inputHTML}
            <p id="error-${param.name}" class="text-red-500 text-[10px] mt-1 hidden">This field is required!</p>
        `;

        container.appendChild(div);

        // File preview handler
        if (param.type === 'file') {
            const fileInput = div.querySelector(`#${inputId}`);
            fileInput.addEventListener('change', (e) => handleFilePreview(e, param.name, param.maxSize || 10485760));
        }
    }

    // --- FILE PREVIEW HANDLER ---
    function handleFilePreview(event, paramName, maxSize) {
        const file = event.target.files[0];
        const previewDiv = document.getElementById(`preview-${paramName}`);
        const imgPreview = document.getElementById(`img-preview-${paramName}`);
        const fileInfo = document.getElementById(`file-info-${paramName}`);
        const errorEl = document.getElementById(`error-${paramName}`);

        if (!file) {
            previewDiv.classList.add('hidden');
            return;
        }

        // Validate file size
        if (file.size > maxSize) {
            errorEl.textContent = `File too large! Max size: ${(maxSize / 1048576).toFixed(2)}MB`;
            errorEl.classList.remove('hidden');
            event.target.value = '';
            previewDiv.classList.add('hidden');
            return;
        }

        errorEl.classList.add('hidden');

        // Show preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imgPreview.src = e.target.result;
                imgPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            imgPreview.classList.add('hidden');
        }

        // Show file info
        fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        previewDiv.classList.remove('hidden');
    }

    // ─── 5. LIVE ACTIVITY LOGGER ───
    function logActivity(entry) {
        try {
            const KEY  = 'lumina_live_activity';
            const MAX  = 50;
            let logs   = [];
            try { logs = JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) {}

            logs.push(entry);
            if (logs.length > MAX) logs = logs.slice(-MAX);

            localStorage.setItem(KEY, JSON.stringify(logs));
        } catch (_) {
            // localStorage blocked — silent fail
        }
    }

    // --- 6. REQUEST HANDLER (ENHANCED) ---
    async function handleApiRequest(endpoint, paramsContainer, method = 'GET') {
        const submitBtn         = document.getElementById('submit-api');
        const responseContainer = document.getElementById('response-container');
        const responseData      = document.getElementById('response-data');
        
        let isValid = true;
        let baseUrl = endpoint.split('?')[0];
        let queryParams = new URLSearchParams();
        const formData = new FormData();
        let hasFiles = false;

        const inputs = paramsContainer.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const pName = input.id.replace('param-', '');
            const isRequired = !pName.startsWith('_');
            const error = document.getElementById(`error-${pName}`);

            let val = '';

            // Handle file input
            if (input.type === 'file') {
                const file = input.files[0];
                if (file) {
                    formData.append(pName, file);
                    hasFiles = true;
                } else if (isRequired) {
                    isValid = false;
                    error?.classList.remove('hidden');
                    input.classList.add('border-red-500');
                    return;
                }
            } else {
                val = input.value.trim();

                if (isRequired && !val) {
                    isValid = false;
                    error?.classList.remove('hidden');
                    input.classList.add('border-red-500');
                    return;
                }

                error?.classList.add('hidden');
                input.classList.remove('border-red-500');

                if (val) {
                    if (hasFiles) {
                        formData.append(pName, val);
                    } else {
                        if (baseUrl.includes(`{${pName}}`)) {
                            baseUrl = baseUrl.replace(`{${pName}}`, encodeURIComponent(val));
                        } else {
                            queryParams.append(pName, val);
                        }
                    }
                }
            }
        });

        if (!isValid) return;

        const finalUrl = queryParams.toString() && !hasFiles ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
        
        submitBtn.classList.add('hidden');
        responseContainer.classList.remove('hidden');
        responseData.innerHTML = '<div class="text-[10px] font-bold animate-pulse uppercase">Processing Request...</div>';
        
        const start = Date.now();
        try {
            let fetchOptions = { method };

            if (hasFiles) {
                fetchOptions.body = formData;
                // Don't set Content-Type — browser will set it with boundary
            } else if (method !== 'GET' && queryParams.toString()) {
                fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
                fetchOptions.body = queryParams.toString();
            }

            const res = await fetch(finalUrl, fetchOptions);
            const duration = Date.now() - start;
            const contentType = res.headers.get('content-type');
            
            document.getElementById('response-status').textContent = res.status;
            document.getElementById('response-time').textContent   = `${duration}ms`;

            // ── Log activity ──
            logActivity({
                endpoint:  finalUrl,
                method:    method,
                status:    res.status,
                ok:        res.ok,
                duration:  duration,
                error:     res.ok ? null : `HTTP ${res.status}`,
                timestamp: Date.now()
            });

            // ── Render response ──
            if (contentType && contentType.includes('image/')) {
                const blob   = await res.blob();
                const imgUrl = URL.createObjectURL(blob);
                responseData.innerHTML = `
                    <div class="flex flex-col items-center">
                        <img src="${imgUrl}" class="max-w-full h-auto border border-gray-200 shadow-sm mb-3" />
                        <a href="${imgUrl}" download="result.jpg" class="bg-gray-800 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all">Download Image</a>
                    </div>
                `;
            } else if (contentType && contentType.includes('application/json')) {
                const json = await res.json();
                responseData.innerHTML = `<pre class="text-[11px] whitespace-pre-wrap font-mono text-gray-700">${JSON.stringify(json, null, 2)}</pre>`;
            } else {
                const text = await res.text();
                responseData.innerHTML = `<pre class="text-[11px] whitespace-pre-wrap font-mono text-gray-700">${text}</pre>`;
            }
        } catch (err) {
            const duration = Date.now() - start;
            responseData.innerHTML = `<span class="text-red-500 font-bold uppercase text-[10px]">Error: ${err.message}</span>`;

            logActivity({
                endpoint:  finalUrl,
                method:    method,
                status:    0,
                ok:        false,
                duration:  duration,
                error:     err.message,
                timestamp: Date.now()
            });
        }
    }

    // --- 7. UTILS ---
    function setupAccordion() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const accordion = header.nextElementSibling;
                const isOpen    = accordion.classList.toggle('active');
                header.querySelector('.accordion-icon').classList.toggle('rotate');

                const folderIcon = header.querySelector('.material-icons.text-gray-500');
                if (folderIcon) folderIcon.textContent = isOpen ? 'folder_open' : 'folder';
            });
        });
    }

    function setupSearchFunctionality() {
        const searchInput = document.getElementById('api-search');
        if (!searchInput) return;
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.api-item-card').forEach(card => {
                const match = card.dataset.name.includes(term) || card.dataset.desc.includes(term);
                card.style.display = match ? 'block' : 'none';
                if (term && match) {
                    const accordion = card.closest('.accordion-content');
                    accordion.classList.add('active');
                    const header = accordion.previousElementSibling;
                    header.querySelector('.accordion-icon').classList.add('rotate');
                    const folderIcon = header.querySelector('.material-icons.text-gray-500');
                    if (folderIcon) folderIcon.textContent = 'folder_open';
                }
            });
        });
    }

    window.closeModal = function() {
        const modal        = document.getElementById('api-modal');
        const modalContent = modal.querySelector('.relative.z-10');
        modal.classList.remove('opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.classList.remove('noscroll');
        }, 300);
    };

    document.getElementById('close-modal').onclick = closeModal;

    function setupApiLinks(set) {
        const container = document.getElementById('api-links');
        if (!container || !set.links) return;
        container.innerHTML = set.links.map(l => `
            <div class="flex items-center gap-2">
                <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                <a href="${l.url}" target="_blank" class="hover:text-gray-800 uppercase tracking-tighter" style="font-size: 10px;">${l.name}</a>
            </div>
        `).join('');
    }
});
