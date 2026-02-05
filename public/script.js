// ─────────────────────────────────────────────────────────────
// script.js  —  Lumina Docs (Support Upload & Dropdown)
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

                const methodBadge = item.method === 'POST' 
                    ? '<span class="text-[8px] bg-green-500 text-white px-2 py-1 rounded font-bold ml-2">POST</span>'
                    : '<span class="text-[8px] bg-blue-500 text-white px-2 py-1 rounded font-bold ml-2">GET</span>';

                itemEl.innerHTML = `
                    <div class="flex items-center justify-between p-4 px-6 bg-gray-50 border border-gray-200 shadow-sm transition-all hover:border-gray-800">
                        <div class="flex-grow mr-4 overflow-hidden">
                            <div class="flex items-center">
                                <h5 class="text-[13px] font-bold text-gray-800 truncate uppercase tracking-tight">${itemName}</h5>
                                ${methodBadge}
                            </div>
                            <p class="text-[11px] font-medium text-gray-500 truncate mt-1">${item.desc || 'No description available'}</p>
                        </div>
                        <button class="try-btn bg-gray-800 text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
                                data-endpoint='${JSON.stringify(item)}' 
                                data-name="${itemName}">TRY</button>
                    </div>
                `;
                row.appendChild(itemEl);
            });
            apiContent.appendChild(categoryWrapper);
        });

        apiContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('try-btn')) {
                const btn = e.target;
                const endpoint = JSON.parse(btn.dataset.endpoint);
                openApiModal(btn.dataset.name, endpoint);
            }
        });
    }

    // --- 4. MODAL & PARAMETER LOGIC ---
    function openApiModal(name, endpoint) {
        const modal            = document.getElementById('api-modal');
        const modalContent     = modal.querySelector('.relative.z-10');
        const paramsContainer  = document.getElementById('params-container');
        const responseContainer = document.getElementById('response-container');
        const responseData     = document.getElementById('response-data');
        
        const methodBadge = document.getElementById('method-badge');
        if (methodBadge) {
            methodBadge.textContent = endpoint.method || 'GET';
            methodBadge.className = `text-[10px] px-3 py-1 rounded font-bold ${
                endpoint.method === 'POST' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
            }`;
        }
        
        const apiUrlElement = document.getElementById('api-url');
        if (apiUrlElement) {
            const baseUrl = window.location.origin;
            const cleanEndpoint = endpoint.path.split('?')[0];
            apiUrlElement.textContent = `${baseUrl}${cleanEndpoint}`;
        }
        
        responseContainer.classList.add('hidden');
        paramsContainer.innerHTML = '';
        responseData.innerHTML   = '';
        document.getElementById('modal-title').textContent      = name;
        document.getElementById('api-description').textContent  = endpoint.desc;
        document.getElementById('submit-api').classList.remove('hidden');
        paramsContainer.classList.remove('hidden');

        if (endpoint.params && endpoint.params.length > 0) {
            endpoint.params.forEach(param => {
                createParamInput(param, paramsContainer, endpoint.paramConfig);
            });
        } else {
            paramsContainer.innerHTML = '<p class="text-gray-500 text-sm italic">No parameters required</p>';
        }

        modal.classList.remove('hidden');
        document.body.classList.add('noscroll');
        setTimeout(() => {
            modal.classList.add('opacity-100');
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);

        document.getElementById('submit-api').onclick = () => handleApiRequest(endpoint, paramsContainer);
    }

    // --- 5. CREATE PARAMETER INPUT (SUPPORT TEXT, FILE, DROPDOWN) ---
    function createParamInput(param, container, paramConfig = {}) {
        const isOptional = param.startsWith('_');
        const cleanName = isOptional ? param.substring(1) : param;
        const config = paramConfig?.[param] || {};
        
        const div = document.createElement('div');
        div.className = 'mb-4';

        const labelHTML = `
            <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 flex items-center gap-2">
                <span>${cleanName}</span>
                ${isOptional 
                    ? '<span class="text-[8px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded">OPTIONAL</span>' 
                    : '<span class="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded">REQUIRED</span>'}
            </label>
            ${config.description ? `<p class="text-[9px] text-gray-400 mb-2">${config.description}</p>` : ''}
        `;

        let inputHTML = '';

        // ✅ DROPDOWN/SELECT
        if (config.type === 'select' && config.options) {
            const options = config.options.map(opt => 
                `<option value="${opt.value}">${opt.label}</option>`
            ).join('');
            
            inputHTML = `
                ${labelHTML}
                <select id="param-${param}" 
                        class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none bg-white">
                    ${isOptional ? '<option value="">-- Select (Optional) --</option>' : '<option value="" disabled selected>-- Select --</option>'}
                    ${options}
                </select>
                <p id="error-${param}" class="text-red-500 text-[10px] mt-1 hidden">Pilih salah satu!</p>
            `;
        }
        // ✅ FILE UPLOAD
        else if (config.type === 'file') {
            inputHTML = `
                ${labelHTML}
                <input type="file" 
                       id="param-${param}" 
                       accept="${config.accept || '*/*'}"
                       class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-black">
                ${config.maxSize ? `<p class="text-[9px] text-gray-400 mt-1">Max size: ${config.maxSize}</p>` : ''}
                <p id="error-${param}" class="text-red-500 text-[10px] mt-1 hidden">File wajib diupload!</p>
                <div id="preview-${param}" class="mt-3 hidden">
                    <p class="text-[9px] text-gray-500 mb-2">Preview:</p>
                    <img src="" alt="Preview" class="max-w-xs max-h-48 border-2 border-gray-200 shadow-sm rounded">
                </div>
            `;
        }
        // ✅ TEXT INPUT (default)
        else {
            inputHTML = `
                ${labelHTML}
                <input type="text" 
                       id="param-${param}" 
                       placeholder="${config.placeholder || `Enter ${cleanName}...`}"
                       class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none">
                <p id="error-${param}" class="text-red-500 text-[10px] mt-1 hidden">Wajib diisi!</p>
            `;
        }

        div.innerHTML = inputHTML;
        container.appendChild(div);

        // ✅ FILE PREVIEW
        if (config.type === 'file') {
            const input = div.querySelector('input[type="file"]');
            const preview = div.querySelector(`#preview-${param}`);
            const img = preview?.querySelector('img');
            
            input?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && img) {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            img.src = event.target.result;
                            preview.classList.remove('hidden');
                        };
                        reader.readAsDataURL(file);
                    }
                }
            });
        }
    }

    // ─── 6. LIVE ACTIVITY LOGGER ───
    function logActivity(entry) {
        try {
            const KEY  = 'lumina_live_activity';
            const MAX  = 50;
            let logs   = [];
            try { logs = JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) {}
            logs.push(entry);
            if (logs.length > MAX) logs = logs.slice(-MAX);
            localStorage.setItem(KEY, JSON.stringify(logs));
        } catch (_) {}
    }

    // --- 7. REQUEST HANDLER ---
    async function handleApiRequest(endpoint, paramsContainer) {
        const submitBtn         = document.getElementById('submit-api');
        const responseContainer = document.getElementById('response-container');
        const responseData      = document.getElementById('response-data');
        
        let isValid = true;
        const method = endpoint.method || 'GET';
        
        const hasFile = Array.from(paramsContainer.querySelectorAll('input')).some(
            input => input.type === 'file' && input.files.length > 0
        );

        let requestData;
        let finalUrl = endpoint.path.split('?')[0];
        
        if (method === 'POST' || hasFile) {
            requestData = new FormData();
            
            const inputs = paramsContainer.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const pName = input.id.replace('param-', '');
                const isOptional = pName.startsWith('_');
                const cleanName = isOptional ? pName.substring(1) : pName;
                const error = document.getElementById(`error-${pName}`);
                
                if (input.type === 'file') {
                    const file = input.files[0];
                    if (!isOptional && !file) {
                        isValid = false;
                        error?.classList.remove('hidden');
                        input.classList.add('border-red-500');
                    } else {
                        error?.classList.add('hidden');
                        input.classList.remove('border-red-500');
                        if (file) requestData.append(cleanName, file);
                    }
                } else {
                    const val = input.value.trim();
                    if (!isOptional && !val) {
                        isValid = false;
                        error?.classList.remove('hidden');
                        input.classList.add('border-red-500');
                    } else {
                        error?.classList.add('hidden');
                        input.classList.remove('border-red-500');
                        if (val) requestData.append(cleanName, val);
                    }
                }
            });
        } else {
            let queryParams = new URLSearchParams();
            
            const inputs = paramsContainer.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const pName = input.id.replace('param-', '');
                const isOptional = pName.startsWith('_');
                const cleanName = isOptional ? pName.substring(1) : pName;
                const val = input.value.trim();
                const error = document.getElementById(`error-${pName}`);

                if (!isOptional && !val) {
                    isValid = false;
                    error?.classList.remove('hidden');
                    input.classList.add('border-red-500');
                } else {
                    error?.classList.add('hidden');
                    input.classList.remove('border-red-500');
                    if (val) queryParams.append(cleanName, val);
                }
            });
            
            requestData = queryParams.toString() ? `${finalUrl}?${queryParams.toString()}` : finalUrl;
        }

        if (!isValid) return;

        submitBtn.classList.add('hidden');
        responseContainer.classList.remove('hidden');
        responseData.innerHTML = `
            <div class="flex items-center gap-3 text-[10px] font-bold animate-pulse uppercase">
                <div class="w-2 h-2 bg-gray-800 rounded-full animate-bounce"></div>
                <span>Processing Request...</span>
            </div>
        `;
        
        const start = Date.now();
        try {
            const fetchOptions = { method: method };
            
            if (method === 'POST' || hasFile) {
                fetchOptions.body = requestData;
            }
            
            const targetUrl = (method === 'POST' || hasFile) ? finalUrl : requestData;
            const res      = await fetch(targetUrl, fetchOptions);
            const duration = Date.now() - start;
            const contentType = res.headers.get('content-type');
            
            document.getElementById('response-status').textContent = res.status;
            document.getElementById('response-time').textContent   = `${duration}ms`;

            logActivity({
                endpoint:  targetUrl,
                method:    method,
                status:    res.status,
                ok:        res.ok,
                duration:  duration,
                error:     res.ok ? null : `HTTP ${res.status}`,
                timestamp: Date.now()
            });

            if (contentType && contentType.includes('image/')) {
                const blob   = await res.blob();
                const imgUrl = URL.createObjectURL(blob);
                responseData.innerHTML = `
                    <div class="flex flex-col items-center gap-3">
                        <img src="${imgUrl}" class="max-w-full h-auto border-2 border-gray-200 shadow-md rounded" />
                        <a href="${imgUrl}" download="result.jpg" class="bg-gray-800 text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all rounded">
                            Download Image
                        </a>
                    </div>
                `;
            } else if (contentType && contentType.includes('application/json')) {
                const json = await res.json();
                responseData.innerHTML = `<pre class="text-[11px] whitespace-pre-wrap font-mono text-gray-700 bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto">${JSON.stringify(json, null, 2)}</pre>`;
            } else {
                const text = await res.text();
                responseData.innerHTML = `<pre class="text-[11px] whitespace-pre-wrap font-mono text-gray-700 bg-gray-50 p-4 rounded border border-gray-200">${text}</pre>`;
            }
        } catch (err) {
            const duration = Date.now() - start;
            responseData.innerHTML = `
                <div class="bg-red-50 border-2 border-red-200 p-4 rounded">
                    <p class="text-red-600 font-bold uppercase text-[10px] mb-2">❌ REQUEST FAILED</p>
                    <p class="text-red-500 text-[11px]">${err.message}</p>
                </div>
            `;

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

    // --- 8. UTILS ---
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
