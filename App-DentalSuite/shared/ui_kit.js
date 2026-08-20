export function formatCurrency(amount) {
    try {
        const num = Number(amount) || 0;
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num);
    } catch (e) {
        return (Number(amount) || 0).toFixed(2) + ' €';
    }
}

export function formatDate(val) {
    if (!val) return '-';
    try {
        let d;
        if (typeof val === 'number') {
            d = new Date(val > 1e11 ? val : val * 1000);
        } else {
            d = new Date(val);
        }
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return '-';
    }
}

export function formatDateTime(val) {
    if (!val) return '-';
    try {
        let d;
        if (typeof val === 'number') {
            d = new Date(val > 1e11 ? val : val * 1000);
        } else {
            d = new Date(val);
        }
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '-';
    }
}

export function renderHero({ title, subtitle, icon, actionsHtml = '' }) {
    try {
        return `
            <div class="ds-hero">
                <div class="ds-hero-info">
                    <div class="ds-hero-icon"><span class="material-symbols-rounded">${icon || 'dentistry'}</span></div>
                    <div>
                        <h2 class="ds-hero-title">${title}</h2>
                        <div class="ds-hero-subtitle">${subtitle || ''}</div>
                    </div>
                </div>
                <div class="ds-hero-actions">${actionsHtml}</div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

export function renderStatCard({ icon, value, label, color = '#0d9488', bg = 'rgba(13, 148, 136, 0.12)' }) {
    try {
        return `
            <div class="ds-card-stat">
                <div class="ds-stat-icon" style="background:${bg}; color:${color};">
                    <span class="material-symbols-rounded">${icon}</span>
                </div>
                <div>
                    <div class="ds-stat-val">${value}</div>
                    <div class="ds-stat-lbl">${label}</div>
                </div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

export function renderModal({ id, title, icon = 'edit', bodyHtml = '', footerHtml = '' }) {
    try {
        return `
            <div id="${id}" class="ds-modal-overlay" style="display:none;">
                <div class="ds-modal-card">
                    <div class="ds-modal-head">
                        <h3><span class="material-symbols-rounded">${icon}</span>${title}</h3>
                        <button class="ds-btn ds-btn-ghost ds-modal-close" style="padding:0.4rem; border-radius:50%;"><span class="material-symbols-rounded">close</span></button>
                    </div>
                    <div class="ds-modal-body">
                        ${bodyHtml}
                    </div>
                    ${footerHtml ? `<div class="ds-modal-head" style="justify-content:flex-end; gap:0.6rem; border-top:1px solid var(--md-outline-variant); border-bottom:none;">${footerHtml}</div>` : ''}
                </div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

export function showNotification(message, type = 'info') {
    try {
        let container = document.getElementById('ds-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ds-toast-container';
            container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'fade-in-up';
        const color = type === 'error' || type === 'danger' ? '#e11d48' : (type === 'success' ? '#16a34a' : (type === 'warning' ? '#d97706' : '#0d9488'));
        const icon = type === 'error' || type === 'danger' ? 'error' : (type === 'success' ? 'check_circle' : (type === 'warning' ? 'warning' : 'info'));
        
        toast.style.cssText = `pointer-events:auto; background:var(--md-surface, #ffffff); color:var(--md-on-surface, #1e293b); border:1.5px solid ${color}; border-left:6px solid ${color}; border-radius:14px; padding:0.85rem 1.2rem; box-shadow:0 10px 30px rgba(0,0,0,0.25); display:flex; align-items:center; gap:0.75rem; font-size:0.9rem; font-weight:700; max-width:420px;`;
        toast.innerHTML = `
            <span class="material-symbols-rounded" style="color:${color}; font-size:1.4rem;">${icon}</span>
            <span style="flex:1;">${message}</span>
            <button style="background:transparent; border:none; cursor:pointer; color:var(--md-on-surface-variant); padding:2px; display:flex; align-items:center;"><span class="material-symbols-rounded" style="font-size:1.1rem;">close</span></button>
        `;
        
        container.appendChild(toast);
        const close = () => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-10px)'; setTimeout(() => toast.remove(), 250); };
        toast.querySelector('button').addEventListener('click', close);
        setTimeout(close, 4500);
    } catch (e) {}
}
