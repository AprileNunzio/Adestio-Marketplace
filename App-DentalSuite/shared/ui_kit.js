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
