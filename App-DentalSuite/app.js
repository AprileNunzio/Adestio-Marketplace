'use strict';

const APP_BASE = new URL('.', import.meta.url).href;

const MODULES = [
    {
        id: 'pazienti',
        perm: 'adestio_dental_suite:pazienti',
        icon: 'person_search',
        label: 'Pazienti & Cartelle Cliniche',
        desc: 'Anagrafica, anamnesi, odontogramma FDI, diario clinico e prescrizioni'
    },
    {
        id: 'agenda',
        perm: 'adestio_dental_suite:agenda',
        icon: 'calendar_month',
        label: 'Agenda Poltrone & Visite',
        desc: 'Planning appuntamenti multi-medico, sale operative e promemoria'
    },
    {
        id: 'struttura',
        perm: 'adestio_dental_suite:struttura',
        icon: 'domain',
        label: 'Sedi, Sale & Poltrone',
        desc: 'Gestione sedi studio, ambulatori specialistici e riuniti'
    },
    {
        id: 'prestazioni',
        perm: 'adestio_dental_suite:prestazioni',
        icon: 'list_alt',
        label: 'Listino Prestazioni & Tariffe',
        desc: 'Nomenclatore clinico, tempi poltrona e marginalità studio'
    },
    {
        id: 'staff',
        perm: 'adestio_dental_suite:staff',
        icon: 'badge',
        label: 'Staff & Collaboratori',
        desc: 'Medici, igienisti, assistenti ASO, segreteria e liquidazioni'
    },
    {
        id: 'contabilita',
        perm: 'adestio_dental_suite:contabilita',
        icon: 'account_balance_wallet',
        label: 'Finanze & Contabilità',
        desc: 'Preventivi, piani rateali, incassi, spese e prima nota'
    },
    {
        id: 'statistiche',
        perm: 'adestio_dental_suite:statistiche',
        icon: 'monitoring',
        label: 'Statistiche & Cashflow',
        desc: 'Indicatori di performance, forecasting di cassa e direzione sanitaria'
    }
];

const MODULE_FILES = {
    pazienti: './modules/pazienti.js',
    paziente_editor: './modules/paziente_editor.js',
    agenda: './modules/agenda.js',
    struttura: './modules/struttura.js',
    prestazioni: './modules/prestazioni.js',
    prestazione_editor: './modules/prestazione_editor.js',
    staff: './modules/staff.js',
    staff_editor: './modules/staff_editor.js',
    contabilita: './modules/contabilita.js',
    statistiche: './modules/statistiche.js'
};

const SUB_TITLES = {
    paziente_editor: 'Scheda Cartella Paziente',
    prestazione_editor: 'Scheda Tariffario Prestazione',
    staff_editor: 'Scheda Collaboratore Clinico'
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
                                userPerms.includes('adestio_dental_suite:*') ||
                                userPerms.includes(perm);
                        } catch (e) {
                            return false;
                        }
                    };

                    el.innerHTML = `
                        <div class="fade-in-up" style="width:100%;flex:1;display:flex;flex-direction:column;">
                            <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1.5rem;margin-bottom:2.5rem;width:100%;">
                                <div style="flex:1;min-width:280px;">
                                    <h1 class="text-title" style="font-size:2.4rem;color:var(--md-primary);margin-bottom:0.2rem;letter-spacing:-0.02em;text-align:left;">DentalSuite</h1>
                                    <p class="text-body" style="color:var(--md-on-surface-variant);font-size:1.05rem;text-align:left;">Gestionale clinico ed economico all-in-one per studi odontoiatrici</p>
                                </div>
                            </div>
                            <div id="ds-modules-grid" class="subapps-grid"></div>
                        </div>
                    `;

                    const grid = el.querySelector('#ds-modules-grid');

                    MODULES.forEach((mod, idx) => {
                        try {
                            const allowed = hasPerm(mod.perm);
                            const card = document.createElement('div');
                            card.className = 'app-card fade-in-up' + (allowed ? '' : ' locked');
                            card.style.animationDelay = `${idx * 0.06}s`;
                            card.innerHTML = `
                                ${!allowed ? '<span class="badge-locked">Bloccato</span>' : ''}
                                <span class="material-symbols-rounded app-icon" style="color:var(--md-primary); font-size:2.4rem; margin-bottom:0.6rem;">${mod.icon}</span>
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

            const renderModule = async (moduleId, modParams = {}) => {
                try {
                    const modObj = MODULES.find(m => m.id === moduleId);
                    const title = modObj ? modObj.label : (SUB_TITLES[moduleId] || moduleId);

                    el.innerHTML = `
                        <div class="fade-in-up" style="width:100%;flex:1;display:flex;flex-direction:column;">
                            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
                                <button id="ds-back-btn" class="btn btn-secondary" style="padding:0.6rem 1.2rem;border-radius:12px;display:flex;align-items:center;gap:0.5rem; cursor:pointer;">
                                    <span class="material-symbols-rounded" style="font-size:1.2rem;">arrow_back</span>
                                </button>
                                <h1 class="text-title" style="font-size:2rem;color:var(--md-primary);margin:0;text-align:left;letter-spacing:-0.02em;">
                                    ${title}
                                </h1>
                            </div>
                            <div id="ds-module-content" style="flex:1;display:flex;flex-direction:column;"></div>
                        </div>
                    `;

                    const backBtn = el.querySelector('#ds-back-btn');
                    if (backBtn) {
                        backBtn.addEventListener('click', () => {
                            try {
                                if (moduleId.endsWith('_editor')) {
                                    const parentMod = moduleId.replace('_editor', '') + (moduleId === 'paziente_editor' ? 'i' : (moduleId === 'prestazione_editor' ? 'i' : ''));
                                    renderModule(parentMod);
                                } else {
                                    renderHub();
                                }
                            } catch (e) {}
                        });
                    }

                    const contentEl = el.querySelector('#ds-module-content');
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
                        const bust = Date.now();
                        const mod = await import(`${modulePath}?v=${bust}`);
                        const targetRender = (mod && mod.default && typeof mod.default.render === 'function') 
                            ? mod.default.render 
                            : (mod && typeof mod.render === 'function' ? mod.render : null);

                        if (targetRender) {
                            await targetRender(contentEl, (targetMod, navParams) => renderModule(targetMod, navParams), modParams);
                        } else {
                            throw new Error('Modulo non valido');
                        }
                    } catch (importErr) {
                        console.error('DentalSuite module import error:', importErr);
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
                await renderModule(params.moduleId, params);
            } else {
                await renderHub();
            }
        } catch (e) {}
    }
};
