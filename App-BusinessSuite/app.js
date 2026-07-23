'use strict';

const MODULES = [
    {
        id: 'dashboard',
        perm: 'adestio_business_suite:dashboard',
        icon: 'dashboard',
        label: 'Dashboard & KPI',
        desc: 'Panoramica vendite, margini e indicatori chiave'
    },
    {
        id: 'quotes',
        perm: 'adestio_business_suite:quotes',
        icon: 'request_quote',
        label: 'Preventivi & Margini',
        desc: 'Simula preventivi con calcolo margine automatico'
    },
    {
        id: 'invoices',
        perm: 'adestio_business_suite:invoices',
        icon: 'receipt_long',
        label: 'Fatturazione SDI',
        desc: 'Genera e gestisci fatture elettroniche XML SDI'
    },
    {
        id: 'customers',
        perm: 'adestio_business_suite:customers',
        icon: 'group',
        label: 'Anagrafica Clienti',
        desc: 'Gestione completa di clienti e fornitori'
    },
    {
        id: 'inventory',
        perm: 'adestio_business_suite:inventory',
        icon: 'inventory_2',
        label: 'Magazzino & Stock',
        desc: 'Carico, scarico e livelli di inventario'
    },
    {
        id: 'pos',
        perm: 'adestio_business_suite:pos',
        icon: 'point_of_sale',
        label: 'POS Cassa Touch',
        desc: 'Punto vendita ottimizzato per touch screen'
    }
];

export default {
    render: async (el, params = {}) => {
        try {
            const renderHub = async () => {
                try {
                    let userPerms = [];
                    try {
                        const userId = sessionStorage.getItem('currentUserId');
                        if (userId && window.electronAPI) {
                            userPerms = await window.electronAPI.rbac.getEffectiveUserPermissions(userId);
                        }
                    } catch (e) {}

                    const hasPerm = (perm) => {
                        try {
                            return userPerms.includes('*') ||
                                userPerms.includes('adestio_business_suite:*') ||
                                userPerms.includes(perm);
                        } catch (e) {
                            return false;
                        }
                    };

                    el.innerHTML = `
                        <div class="fade-in-up" style="width:100%;flex:1;display:flex;flex-direction:column;">
                            <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1.5rem;margin-bottom:3rem;width:100%;">
                                <div style="flex:1;min-width:280px;">
                                    <h1 class="text-title" style="font-size:2.4rem;color:var(--md-primary);margin-bottom:0.2rem;letter-spacing:-0.02em;text-align:left;">Business Suite</h1>
                                    <p class="text-body" style="color:var(--md-on-surface-variant);font-size:1.05rem;text-align:left;">Gestionale enterprise all-in-one per la tua azienda</p>
                                </div>
                            </div>
                            <div id="bs-modules-grid" class="subapps-grid"></div>
                        </div>
                    `;

                    const grid = el.querySelector('#bs-modules-grid');

                    MODULES.forEach((mod, idx) => {
                        try {
                            const allowed = hasPerm(mod.perm);
                            const card = document.createElement('div');
                            card.className = 'app-card fade-in-up' + (allowed ? '' : ' locked');
                            card.style.animationDelay = `${idx * 0.06}s`;
                            card.innerHTML = `
                                ${!allowed ? '<span class="badge-locked">Bloccato</span>' : ''}
                                <span class="material-symbols-rounded app-icon">${mod.icon}</span>
                                <div class="app-title">${mod.label}</div>
                                <div class="app-desc">${mod.desc}</div>
                            `;
                            if (allowed) {
                                card.addEventListener('click', () => {
                                    try {
                                        renderModule(mod.id);
                                    } catch (e) {}
                                });
                            }
                            grid.appendChild(card);
                        } catch (e) {}
                    });
                } catch (e) {}
            };

            const renderModule = (moduleId) => {
                try {
                    el.innerHTML = `
                        <div class="fade-in-up" style="width:100%;flex:1;display:flex;flex-direction:column;">
                            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2.5rem;">
                                <button id="bs-back-btn" class="btn btn-secondary" style="padding:0.6rem 1.2rem;border-radius:12px;display:flex;align-items:center;gap:0.5rem;">
                                    <span class="material-symbols-rounded" style="font-size:1.2rem;">arrow_back</span>
                                </button>
                                <h1 class="text-title" style="font-size:2rem;color:var(--md-primary);margin:0;text-align:left;letter-spacing:-0.02em;">
                                    ${MODULES.find(m => m.id === moduleId)?.label || moduleId}
                                </h1>
                            </div>
                            <div id="bs-module-content" style="flex:1;display:flex;align-items:center;justify-content:center;">
                                <div style="text-align:center;color:var(--md-on-surface-variant);">
                                    <span class="material-symbols-rounded" style="font-size:4rem;color:var(--md-primary);opacity:0.4;">construction</span>
                                    <p style="margin-top:1rem;font-size:1rem;">Modulo in sviluppo</p>
                                </div>
                            </div>
                        </div>
                    `;
                    const backBtn = el.querySelector('#bs-back-btn');
                    if (backBtn) {
                        backBtn.addEventListener('click', () => {
                            try { renderHub(); } catch (e) {}
                        });
                    }
                } catch (e) {}
            };

            if (params?.moduleId) {
                renderModule(params.moduleId);
            } else {
                await renderHub();
            }
        } catch (e) {}
    }
};
