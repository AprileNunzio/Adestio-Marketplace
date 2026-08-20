import dashboardModule from './modules/dashboard.js';
import pazientiModule from './modules/pazienti.js';
import agendaModule from './modules/agenda.js';
import prestazioniModule from './modules/prestazioni.js';
import staffModule from './modules/staff.js';
import contabilitaModule from './modules/contabilita.js';
import statisticheModule from './modules/statistiche.js';

export default {
    render: async (el, params = {}) => {
        try {
            let currentModule = params.initialModule || 'dashboard';

            const MODULES = {
                dashboard: { label: 'Dashboard', icon: 'dashboard', module: dashboardModule },
                pazienti: { label: 'Pazienti & Cartelle', icon: 'groups', module: pazientiModule },
                agenda: { label: 'Agenda Poltrone', icon: 'calendar_month', module: agendaModule },
                prestazioni: { label: 'Listino Prestazioni', icon: 'list_alt', module: prestazioniModule },
                staff: { label: 'Staff & Compensi', icon: 'badge', module: staffModule },
                contabilita: { label: 'Contabilità & Spese', icon: 'account_balance_wallet', module: contabilitaModule },
                statistiche: { label: 'Statistiche Direzione', icon: 'monitoring', module: statisticheModule }
            };

            function renderShell() {
                try {
                    el.innerHTML = `
                        <div style="display:flex; flex-direction:column; height:100%; width:100%; overflow:hidden;">
                            <div style="background:var(--md-surface); border-bottom:1.5px solid var(--md-outline-variant); padding:0.65rem 1.2rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-shrink:0;">
                                <div style="display:flex; align-items:center; gap:0.6rem;">
                                    <div style="background:#0d9488; color:#fff; width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                                        <span class="material-symbols-rounded" style="font-size:1.3rem;">dentistry</span>
                                    </div>
                                    <span style="font-weight:800; font-size:1.05rem; color:var(--md-on-surface); letter-spacing:-0.01em;">DentalSuite</span>
                                </div>
                                <div class="ds-nav" id="ds-main-nav">
                                    ${Object.keys(MODULES).map(k => `
                                        <button class="ds-nav-btn ${k === currentModule ? 'active' : ''}" data-mod="${k}">
                                            <span class="material-symbols-rounded" style="font-size:1.1rem;">${MODULES[k].icon}</span>
                                            ${MODULES[k].label}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            <div id="ds-module-outlet" style="flex:1; min-height:0; overflow-y:auto;"></div>
                        </div>
                    `;

                    el.querySelectorAll('#ds-main-nav .ds-nav-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const modKey = btn.dataset.mod;
                            if (modKey && MODULES[modKey]) {
                                navigateTo(modKey);
                            }
                        });
                    });

                    loadCurrentModule();
                } catch (e) {}
            }

            function navigateTo(modKey, navParams = {}) {
                try {
                    currentModule = modKey;
                    el.querySelectorAll('#ds-main-nav .ds-nav-btn').forEach(b => {
                        b.classList.toggle('active', b.dataset.mod === modKey);
                    });
                    loadCurrentModule(navParams);
                } catch (e) {}
            }

            async function loadCurrentModule(modParams = {}) {
                try {
                    const outlet = el.querySelector('#ds-module-outlet');
                    if (!outlet) return;
                    outlet.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento modulo...</p></div>';
                    const target = MODULES[currentModule];
                    if (target && target.module && typeof target.module.render === 'function') {
                        await target.module.render(outlet, navigateTo, modParams);
                    }
                } catch (e) {
                    const outlet = el.querySelector('#ds-module-outlet');
                    if (outlet) outlet.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore nel caricamento del modulo: ${e.message}</p></div>`;
                }
            }

            renderShell();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore generale: ${e.message}</p></div>`;
        }
    }
};
