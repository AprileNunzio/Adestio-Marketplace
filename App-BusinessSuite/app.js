'use strict';

// Base assoluta della cartella di questa app (es. "adestio-app://adestio_business_suite/").
// Un <img src="relativo"> dentro HTML iniettato via innerHTML si risolve rispetto al
// documento principale di Adestio, non rispetto a questo modulo: serve un URL assoluto.
const APP_BASE = new URL('.', import.meta.url).href;

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
        desc: 'Crea preventivi con calcolo margine automatico'
    },
    {
        id: 'invoices',
        perm: 'adestio_business_suite:invoices',
        icon: 'receipt_long',
        label: 'Fatturazione SDI',
        desc: 'Genera e gestisci fatture elettroniche XML SDI'
    },
    {
        id: 'ddt',
        perm: 'adestio_business_suite:ddt',
        icon: 'local_shipping',
        label: 'Documenti di Trasporto',
        desc: 'Emetti DDT collegati a preventivi e fatture'
    },
    {
        id: 'scadenzario',
        perm: 'adestio_business_suite:scadenzario',
        icon: 'event_available',
        label: 'Scadenzario',
        desc: 'Rate e scadenze di pagamento delle fatture'
    },
    {
        id: 'finanze',
        perm: 'adestio_business_suite:finanze',
        icon: 'account_balance',
        label: 'Finanze (Prima Nota)',
        desc: 'Entrate, uscite e andamento di cassa'
    },
    {
        id: 'customers',
        perm: 'adestio_business_suite:customers',
        icon: 'group',
        label: 'Anagrafica Clienti',
        desc: 'Clienti B2B, B2C e Pubblica Amministrazione'
    },
    {
        id: 'fornitori',
        perm: 'adestio_business_suite:fornitori',
        icon: 'local_shipping',
        label: 'Anagrafica Fornitori',
        desc: 'Gestione dei tuoi fornitori'
    },
    {
        id: 'collaboratori',
        perm: 'adestio_business_suite:collaboratori',
        icon: 'engineering',
        label: 'Collaboratori',
        desc: 'Subappaltatori, provvigioni e pagamenti'
    },
    {
        id: 'inventory',
        perm: 'adestio_business_suite:inventory',
        icon: 'inventory_2',
        label: 'Catalogo Prodotti & Servizi',
        desc: 'Anagrafica prodotti/servizi per preventivi e fatture'
    },
    {
        id: 'pos',
        perm: 'adestio_business_suite:pos',
        icon: 'point_of_sale',
        label: 'POS Cassa Touch',
        desc: 'Punto vendita ottimizzato per touch screen'
    },
    {
        id: 'settings',
        perm: 'adestio_business_suite:settings',
        icon: 'settings',
        label: 'Impostazioni',
        desc: 'Dati azienda e parametri fiscali di default'
    }
];

const MODULE_FILES = {
    dashboard: './modules/dashboard.js',
    quotes: './modules/quotes.js',
    invoices: './modules/invoices.js',
    ddt: './modules/ddt.js',
    scadenzario: './modules/scadenzario.js',
    finanze: './modules/finanze.js',
    customers: './modules/customers.js',
    fornitori: './modules/fornitori.js',
    collaboratori: './modules/collaboratori.js',
    inventory: './modules/inventory.js',
    settings: './modules/settings.js'
    // 'pos' non e' in questo elenco: fuori ambito, resta il placeholder "in sviluppo".
};

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
                                <img src="${APP_BASE}icons/${mod.id}.png" class="app-icon" data-fallback-icon="${mod.icon}">
                                <div class="app-title">${mod.label}</div>
                                <div class="app-desc">${mod.desc}</div>
                            `;
                            const iconImg = card.querySelector('img.app-icon');
                            if (iconImg) {
                                iconImg.addEventListener('error', () => {
                                    const fallback = document.createElement('span');
                                    fallback.className = 'material-symbols-rounded app-icon';
                                    fallback.textContent = iconImg.dataset.fallbackIcon;
                                    iconImg.replaceWith(fallback);
                                }, { once: true });
                            }
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

            const renderModule = async (moduleId) => {
                try {
                    el.innerHTML = `
                        <div class="fade-in-up" style="width:100%;flex:1;display:flex;flex-direction:column;">
                            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;">
                                <button id="bs-back-btn" class="btn btn-secondary" style="padding:0.6rem 1.2rem;border-radius:12px;display:flex;align-items:center;gap:0.5rem;">
                                    <span class="material-symbols-rounded" style="font-size:1.2rem;">arrow_back</span>
                                </button>
                                <h1 class="text-title" style="font-size:2rem;color:var(--md-primary);margin:0;text-align:left;letter-spacing:-0.02em;">
                                    ${MODULES.find(m => m.id === moduleId)?.label || moduleId}
                                </h1>
                            </div>
                            <div id="bs-module-content" style="flex:1;display:flex;flex-direction:column;"></div>
                        </div>
                    `;
                    const backBtn = el.querySelector('#bs-back-btn');
                    if (backBtn) {
                        backBtn.addEventListener('click', () => {
                            try { renderHub(); } catch (e) {}
                        });
                    }
                    const contentEl = el.querySelector('#bs-module-content');
                    const modulePath = MODULE_FILES[moduleId];
                    if (!modulePath) {
                        contentEl.style.alignItems = 'center';
                        contentEl.style.justifyContent = 'center';
                        contentEl.innerHTML = `
                            <div style="text-align:center;color:var(--md-on-surface-variant);">
                                <span class="material-symbols-rounded" style="font-size:4rem;color:var(--md-primary);opacity:0.4;">construction</span>
                                <p style="margin-top:1rem;font-size:1rem;">Modulo in sviluppo</p>
                            </div>
                        `;
                        return;
                    }
                    try {
                        const mod = await import(modulePath);
                        if (mod && typeof mod.render === 'function') {
                            await mod.render(contentEl);
                        } else {
                            throw new Error('Modulo non valido');
                        }
                    } catch (importErr) {
                        console.error('BusinessSuite module import error:', importErr);
                        contentEl.style.alignItems = 'center';
                        contentEl.style.justifyContent = 'center';
                        contentEl.innerHTML = `
                            <div style="text-align:center;color:var(--md-error);">
                                <span class="material-symbols-rounded" style="font-size:3rem;">error</span>
                                <p style="margin-top:1rem;">Errore durante il caricamento del modulo: ${importErr.message}</p>
                            </div>
                        `;
                    }
                } catch (e) {}
            };

            if (params?.moduleId) {
                await renderModule(params.moduleId);
            } else {
                await renderHub();
            }
        } catch (e) {}
    }
};
