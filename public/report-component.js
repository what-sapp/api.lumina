// ══════════════════════════════════════════
//  LUMINA REPORT COMPONENT
//  Include script ini di docs.html & status.html
// ══════════════════════════════════════════

(function() {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        /* ── Report Button ── */
        .report-fab {
            position: fixed;
            bottom: 1.5rem;
            right: 1.5rem;
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            background: linear-gradient(135deg, #f43f5e, #e11d48);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(244,63,94,0.4);
            z-index: 500;
            transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
            animation: fabIn 0.5s 1s both cubic-bezier(0.34,1.56,0.64,1);
        }

        @keyframes fabIn {
            from { opacity: 0; transform: scale(0) rotate(-180deg); }
            to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .report-fab:hover {
            transform: scale(1.12);
            box-shadow: 0 6px 24px rgba(244,63,94,0.5);
        }

        .report-fab .fab-tooltip {
            position: absolute;
            right: calc(100% + 0.625rem);
            background: rgba(15,23,42,0.92);
            color: white;
            font-size: 0.68rem;
            font-weight: 600;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }

        .report-fab:hover .fab-tooltip { opacity: 1; }

        /* Pulse ring */
        .report-fab::after {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            border: 2px solid rgba(244,63,94,0.4);
            animation: reportPulse 2s ease infinite;
        }

        @keyframes reportPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50%       { opacity: 0;   transform: scale(1.35); }
        }

        /* ── Modal Backdrop ── */
        .report-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            z-index: 600;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }

        .report-backdrop.open {
            opacity: 1;
            pointer-events: all;
        }

        /* ── Modal ── */
        .report-modal {
            position: fixed;
            bottom: 5.5rem;
            right: 1.5rem;
            width: min(380px, calc(100vw - 2rem));
            background: var(--card-background, #1e293b);
            border: 1px solid var(--border-color, rgba(100,116,139,0.2));
            border-radius: 16px;
            box-shadow: 0 24px 64px rgba(0,0,0,0.3);
            z-index: 700;
            transform: scale(0.9) translateY(12px);
            opacity: 0;
            pointer-events: none;
            transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
            overflow: hidden;
        }

        .report-modal.open {
            transform: scale(1) translateY(0);
            opacity: 1;
            pointer-events: all;
        }

        .report-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border-color, rgba(100,116,139,0.2));
            background: rgba(244,63,94,0.06);
        }

        .report-modal-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text-color, #e2e8f0);
        }

        .report-modal-close {
            width: 1.75rem;
            height: 1.75rem;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: var(--text-muted, #64748b);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .report-modal-close:hover {
            background: rgba(244,63,94,0.1);
            color: #f43f5e;
        }

        .report-modal-body { padding: 1.25rem; }

        /* Form fields */
        .report-field { margin-bottom: 0.875rem; }

        .report-label {
            display: block;
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-muted, #64748b);
            margin-bottom: 0.375rem;
        }

        .report-label .req { color: #f43f5e; margin-left: 2px; }

        .report-input, .report-select, .report-textarea {
            width: 100%;
            padding: 0.6rem 0.875rem;
            font-family: inherit;
            font-size: 0.78rem;
            color: var(--text-color, #e2e8f0);
            background: var(--background-color, #0f172a);
            border: 1px solid var(--border-color, rgba(100,116,139,0.2));
            border-radius: 8px;
            outline: none;
            transition: all 0.2s;
        }

        .report-input:focus, .report-select:focus, .report-textarea:focus {
            border-color: #f43f5e;
            box-shadow: 0 0 0 3px rgba(244,63,94,0.1);
        }

        .report-input::placeholder, .report-textarea::placeholder {
            color: var(--text-muted, #64748b);
            opacity: 0.5;
        }

        .report-textarea {
            min-height: 80px;
            resize: vertical;
            line-height: 1.6;
        }

        .report-select { cursor: pointer; }

        /* Type pills */
        .report-type-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.4rem;
        }

        .report-type-btn {
            padding: 0.45rem 0.5rem;
            font-size: 0.65rem;
            font-weight: 600;
            border: 1px solid var(--border-color, rgba(100,116,139,0.2));
            border-radius: 8px;
            background: transparent;
            color: var(--text-muted, #64748b);
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }

        .report-type-btn:hover { border-color: #f43f5e; color: #f43f5e; }
        .report-type-btn.active {
            background: rgba(244,63,94,0.1);
            border-color: #f43f5e;
            color: #f43f5e;
            font-weight: 700;
        }

        /* Submit button */
        .report-submit {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #f43f5e, #e11d48);
            color: white;
            border: none;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 0.25rem;
            box-shadow: 0 4px 12px rgba(244,63,94,0.3);
        }

        .report-submit:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(244,63,94,0.4);
        }

        .report-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Spinner kecil */
        .report-spinner {
            width: 14px; height: 14px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Success state */
        .report-success {
            display: none;
            flex-direction: column;
            align-items: center;
            padding: 2rem 1.25rem;
            text-align: center;
            gap: 0.75rem;
        }

        .report-success.show { display: flex; }

        .report-success-icon {
            width: 3rem; height: 3rem;
            border-radius: 50%;
            background: rgba(16,185,129,0.1);
            border: 2px solid rgba(16,185,129,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: successPop 0.5s cubic-bezier(0.34,1.56,0.64,1);
        }

        @keyframes successPop {
            from { transform: scale(0); }
            to   { transform: scale(1); }
        }

        .report-success p {
            font-size: 0.78rem;
            color: var(--text-muted, #64748b);
            line-height: 1.6;
        }

        .report-error-msg {
            font-size: 0.7rem;
            color: #f43f5e;
            margin-top: 0.5rem;
            display: none;
            text-align: center;
        }
    `;
    document.head.appendChild(style);

    // ── HTML ──
    const html = `
        <button class="report-fab" id="report-fab" title="Report an issue">
            <span class="material-icons" style="font-size:1.1rem;">flag</span>
            <span class="fab-tooltip">Report Issue</span>
        </button>

        <div class="report-backdrop" id="report-backdrop"></div>

        <div class="report-modal" id="report-modal">
            <div class="report-modal-header">
                <div class="report-modal-title">
                    <span class="material-icons" style="font-size:1rem; color:#f43f5e;">flag</span>
                    Report an Issue
                </div>
                <button class="report-modal-close" id="report-close">
                    <span class="material-icons" style="font-size:1rem;">close</span>
                </button>
            </div>

            <!-- Form -->
            <div class="report-modal-body" id="report-form-body">
                <div class="report-field">
                    <label class="report-label">Endpoint URL <span class="req">*</span></label>
                    <input type="text" class="report-input" id="report-endpoint"
                        placeholder="e.g. /ai/gemini?prompt=hello">
                </div>

                <div class="report-field">
                    <label class="report-label">Issue Type <span class="req">*</span></label>
                    <div class="report-type-grid" id="report-type-grid">
                        <button class="report-type-btn" data-value="timeout">⏱ Timeout</button>
                        <button class="report-type-btn" data-value="error_response">⚠ Error Response</button>
                        <button class="report-type-btn" data-value="wrong_response">🔀 Wrong Response</button>
                        <button class="report-type-btn" data-value="slow">🐢 Too Slow</button>
                        <button class="report-type-btn" data-value="down">🔴 API Down</button>
                        <button class="report-type-btn" data-value="other">❓ Other</button>
                    </div>
                </div>

                <div class="report-field">
                    <label class="report-label">Description <span style="opacity:0.5;">(optional)</span></label>
                    <textarea class="report-textarea" id="report-description"
                        placeholder="Describe the issue in detail..."></textarea>
                </div>

                <div class="report-field">
                    <label class="report-label">Your Email <span style="opacity:0.5;">(optional, for follow-up)</span></label>
                    <input type="email" class="report-input" id="report-email"
                        placeholder="you@example.com">
                </div>

                <div class="report-error-msg" id="report-error-msg"></div>

                <button class="report-submit" id="report-submit">
                    <span class="material-icons" style="font-size:0.9rem;">send</span>
                    Submit Report
                </button>
            </div>

            <!-- Success state -->
            <div class="report-success" id="report-success">
                <div class="report-success-icon">
                    <span class="material-icons" style="color:#10b981; font-size:1.5rem;">check_circle</span>
                </div>
                <div>
                    <div style="font-size:0.9rem; font-weight:700; color:var(--text-color,#e2e8f0); margin-bottom:0.35rem;">
                        Report Submitted!
                    </div>
                    <p>Terima kasih! Laporan kamu sudah diterima dan akan segera ditinjau.</p>
                </div>
                <button class="report-submit" id="report-new" style="background:linear-gradient(135deg,var(--primary-color,#4f46e5),var(--secondary-color,#6366f1)); box-shadow:none; margin-top:0.25rem;">
                    Submit Another
                </button>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    // ── Logic ──
    const fab      = document.getElementById('report-fab');
    const backdrop = document.getElementById('report-backdrop');
    const modal    = document.getElementById('report-modal');
    const closeBtn = document.getElementById('report-close');
    const formBody = document.getElementById('report-form-body');
    const success  = document.getElementById('report-success');
    const errorMsg = document.getElementById('report-error-msg');
    const submitBtn= document.getElementById('report-submit');
    const newBtn   = document.getElementById('report-new');

    let selectedType = '';
    let cooldown     = false;

    function openModal()  { modal.classList.add('open'); backdrop.classList.add('open'); }
    function closeModal() { modal.classList.remove('open'); backdrop.classList.remove('open'); }

    fab.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    // Type pills
    document.querySelectorAll('.report-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.report-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedType = btn.dataset.value;
        });
    });

    // Submit
    submitBtn.addEventListener('click', async () => {
        if (cooldown) return;

        const endpoint    = document.getElementById('report-endpoint').value.trim();
        const description = document.getElementById('report-description').value.trim();
        const email       = document.getElementById('report-email').value.trim();

        // Validate
        errorMsg.style.display = 'none';
        if (!endpoint) { showError('Endpoint URL wajib diisi!'); return; }
        if (!selectedType) { showError('Pilih jenis masalahnya dulu!'); return; }

        // Loading state
        submitBtn.disabled  = true;
        submitBtn.innerHTML = '<div class="report-spinner"></div> Submitting...';

        try {
            const res  = await fetch('/report', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ endpoint, type: selectedType, description, email })
            });
            const data = await res.json();

            if (data.status) {
                // Show success
                formBody.style.display = 'none';
                success.classList.add('show');

                // Cooldown 30 detik
                cooldown = true;
                setTimeout(() => { cooldown = false; }, 30000);
            } else {
                showError(data.message || 'Failed to submit report');
            }
        } catch (e) {
            showError('Network error. Please try again.');
        }

        submitBtn.disabled  = false;
        submitBtn.innerHTML = '<span class="material-icons" style="font-size:0.9rem;">send</span>Submit Report';
    });

    // Submit another
    newBtn.addEventListener('click', () => {
        success.classList.remove('show');
        formBody.style.display = '';
        selectedType = '';
        document.getElementById('report-endpoint').value    = '';
        document.getElementById('report-description').value = '';
        document.getElementById('report-email').value       = '';
        document.querySelectorAll('.report-type-btn').forEach(b => b.classList.remove('active'));
    });

    function showError(msg) {
        errorMsg.textContent   = msg;
        errorMsg.style.display = 'block';
        setTimeout(() => { errorMsg.style.display = 'none'; }, 3000);
    }

    // Auto-fill endpoint dari URL kalau di docs
    const path = window.location.pathname;
    if (path === '/docs' || path.includes('docs')) {
        // Observe kalau ada endpoint yang diklik di docs
        window.addEventListener('lumina-endpoint-selected', (e) => {
            if (e.detail?.path) {
                document.getElementById('report-endpoint').value = e.detail.path;
            }
        });
    }
})();
