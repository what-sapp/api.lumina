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
        const set = await (await fetch('/set')).json();
        
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
                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-tight">${category.name}</h3>
                    <span class="material-icons accordion-icon text-gray-600">expand_more</span>
                </div>
                <div class="accordion-content">
                    <div class="row pt-4 space-y-2"></div>
                </div>
            `;

            const row = categoryWrapper.querySelector('.row');
            category.items.forEach(itemData => {
                const itemName = Object.keys(itemData)[0];
                const item = itemData[itemName];
                const itemEl = document.createElement('div');
                itemEl.className = 'api-item-card w-full mb-2';
                itemEl.dataset.name = itemName.toLowerCase();
                itemEl.dataset.desc = (item.desc || '').toLowerCase();

                itemEl.innerHTML = `
                    <div class="flex items-center justify-between p-4 px-6 bg-gray-50 border border-gray-200 shadow-sm transition-all hover:border-gray-800">
                        <div class="flex-grow mr-4 overflow-hidden">
                            <h5 class="text-[13px] font-bold text-gray-800 truncate uppercase tracking-tight">${itemName}</h5>
                            <p class="text-[11px] font-medium text-gray-500 truncate">${item.desc || 'No description available'}</p>
                        </div>
                        <button class="try-btn bg-gray-800 text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
                                data-path='${item.path || ""}' 
                                data-name="${itemName}" 
                                data-desc="${item.desc || ""}">TRY</button>
                    </div>
                `;
                row.appendChild(itemEl);
            });
            apiContent.appendChild(categoryWrapper);
        });

        apiContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('try-btn')) {
                const btn = e.target;
                openApiModal(btn.dataset.name, btn.dataset.path, btn.dataset.desc);
            }
        });
    }

    // --- 4. MODAL & PARAMETER LOGIC ---
    function openApiModal(name, endpoint, description) {
        const modal = document.getElementById('api-modal');
        const modalContent = modal.querySelector('.relative.z-10');
        const paramsContainer = document.getElementById('params-container');
        const responseContainer = document.getElementById('response-container');
        const responseData = document.getElementById('response-data');
        
        responseContainer.classList.add('hidden');
        paramsContainer.innerHTML = '';
        responseData.innerHTML = '';
        document.getElementById('modal-title').textContent = name;
        document.getElementById('api-description').textContent = description;
        document.getElementById('submit-api').classList.remove('hidden');
        paramsContainer.classList.remove('hidden');

        // Deteksi Parameter dari endpoint
        const params = [];
        const pathMatches = endpoint.match(/{([^}]+)}/g);
        if (pathMatches) pathMatches.forEach(m => params.push(m.replace(/{|}/g, '')));
        
        if (endpoint.includes('?')) {
            const queryPart = endpoint.split('?')[1];
            queryPart.split('&').forEach(p => {
                const pName = p.split('=')[0];
                if (pName && !params.includes(pName)) params.push(pName);
            });
        }

        params.forEach(p => createParamInput(p, paramsContainer));

        modal.classList.remove('hidden');
        document.body.classList.add('noscroll');
        setTimeout(() => {
            modal.classList.add('opacity-100');
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);

        document.getElementById('submit-api').onclick = () => handleApiRequest(endpoint, paramsContainer);
    }

    function createParamInput(name, container) {
        const isOptional = name.startsWith('_');
        const cleanName = isOptional ? name.substring(1) : name;
        const div = document.createElement('div');
        div.className = 'mb-3';
        div.innerHTML = `
            <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">${cleanName} ${isOptional ? '(Optional)' : '*'}</label>
            <input type="text" id="param-${name}" class="w-full px-3 py-2 text-sm border-2 border-gray-100 focus:border-gray-800 outline-none" placeholder="Enter ${cleanName}...">
            <p id="error-${name}" class="text-red-500 text-[10px] mt-1 hidden">Wajib diisi!</p>
        `;
        container.appendChild(div);
    }

    // --- 5. REQUEST HANDLER (SUPPORT IMAGES) ---
    async function handleApiRequest(endpoint, paramsContainer) {
        const submitBtn = document.getElementById('submit-api');
        const responseContainer = document.getElementById('response-container');
        const responseData = document.getElementById('response-data');
        
        let isValid = true;
        let baseUrl = endpoint.split('?')[0];
        let queryParams = new URLSearchParams();

        const inputs = paramsContainer.querySelectorAll('input');
        inputs.forEach(input => {
            const pName = input.id.replace('param-', '');
            const val = input.value.trim();
            const error = document.getElementById(`error-${pName}`);

            if (!pName.startsWith('_') && !val) {
                isValid = false;
                error?.classList.remove('hidden');
                input.classList.add('border-red-500');
            } else {
                error?.classList.add('hidden');
                input.classList.remove('border-red-500');
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

        const finalUrl = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
        
        submitBtn.classList.add('hidden');
        responseContainer.classList.remove('hidden');
        responseData.innerHTML = '<div class="text-[10px] font-bold animate-pulse uppercase">Processing Request...</div>';
        
        const start = Date.now();
        try {
            const res = await fetch(finalUrl);
            const duration = Date.now() - start;
            const contentType = res.headers.get('content-type');
            
            document.getElementById('response-status').textContent = res.status;
            document.getElementById('response-time').textContent = `${duration}ms`;

            // PENANGANAN GAMBAR
            if (contentType && contentType.includes('image/')) {
                const blob = await res.blob();
                const imgUrl = URL.createObjectURL(blob);
                responseData.innerHTML = `
                    <div class="flex flex-col items-center">
                        <img src="${imgUrl}" class="max-w-full h-auto border border-gray-200 shadow-sm mb-3" />
                        <a href="${imgUrl}" download="result.jpg" class="bg-gray-800 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all">Download Image</a>
                    </div>
                `;
            } 
            // PENANGANAN JSON
            else if (contentType && contentType.includes('application/json')) {
                const json = await res.json();
                responseData.innerHTML = `<pre class="text-[11px] whitespace-pre-wrap font-mono text-gray-700">${JSON.stringify(json, null, 2)}</pre>`;
            } 
            // PENANGANAN TEKS
            else {
                const text = await res.text();
                responseData.innerHTML = `<pre class="text-[11px] whitespace-pre-wrap font-mono text-gray-700">${text}</pre>`;
            }
        } catch (err) {
            responseData.innerHTML = `<span class="text-red-500 font-bold uppercase text-[10px]">Error: ${err.message}</span>`;
        }
    }

    // --- 6. UTILS ---
    function setupAccordion() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                header.nextElementSibling.classList.toggle('active');
                header.querySelector('.accordion-icon').classList.toggle('rotate');
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
                    accordion.previousElementSibling.querySelector('.accordion-icon').classList.add('rotate');
                }
            });
        });
    }

    window.closeModal = function() {
        const modal = document.getElementById('api-modal');
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
