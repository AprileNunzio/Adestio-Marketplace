import dashboardModule from './modules/dashboard.js';
import pazientiModule from './modules/pazienti.js';
import pazienteEditorModule from './modules/paziente_editor.js';
import agendaModule from './modules/agenda.js';
import strutturaModule from './modules/struttura.js';
import prestazioniModule from './modules/prestazioni.js';
import staffModule from './modules/staff.js';
import contabilitaModule from './modules/contabilita.js';
import statisticheModule from './modules/statistiche.js';

export default {
    render: async (el, params = {}) => {
        try {
            let currentModule = params.initialModule || 'dashboard';

            const MODULES = {
                dashboard: { label: 'Home Hub', icon: 'grid_view', module: dashboardModule },
                pazienti: { label: 'Pazienti & Cartelle', icon: 'person_search', module: pazientiModule },
                paziente_editor: { label: 'Scheda Paziente', icon: 'person_add', module: pazienteEditorModule },
                agenda: { label: 'Agenda Poltrone', icon: 'calendar_month', module: agendaModule },
                struttura: { label: 'Sedi, Sale & Poltrone', icon: 'domain', module: strutturaModule },
                prestazioni: { label: 'Listino Prestazioni', icon: 'list_alt', module: prestazioniModule },
                staff: { label: 'Staff & Collaboratori', icon: 'badge', module: staffModule },
                contabilita: { label: 'Finanze & Contabilità', icon: 'account_balance_wallet', module: contabilitaModule },
                statistiche: { label: 'Statistiche Direzione', icon: 'monitoring', module: statisticheModule }
            };

            function renderShell(initialParams = {}) {
                try {
                    const isHub = currentModule === 'dashboard';
                    el.innerHTML = `
                        <div style="display:flex; flex-direction:column; height:100%; width:100%; overflow:hidden;">
                            <div style="background:var(--md-surface); border-bottom:1.5px solid var(--md-outline-variant); padding:0.65rem 1.4rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-shrink:0;">
                                <div style="display:flex; align-items:center; gap:0.75rem; cursor:pointer;" id="ds-brand-home">
                                    <div style="background:linear-gradient(135deg, #0f766e, #0d9488); color:#fff; width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(13,148,136,0.35);">
                                        <span class="material-symbols-rounded" style="font-size:1.4rem;">dentistry</span>
                                    </div>
                                    <div>
                                        <div style="font-weight:800; font-size:1.05rem; color:var(--md-on-surface); line-height:1.1;">DentalSuite</div>
                                        <div style="font-size:0.72rem; color:var(--md-on-surface-variant); font-weight:700;">Studio Odontoiatrico</div>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:0.6rem;">
                                    ${!isHub ? `
                                        <button class="ds-btn ds-btn-ghost" id="ds-btn-return-hub" style="font-size:0.82rem; padding:0.5rem 0.9rem;">
                                            <span class="material-symbols-rounded" style="font-size:1.1rem;">grid_view</span>
                                            Torna all'Hub
                                        </button>
                                    ` : ''}
                                    <div class="ds-badge ds-badge-teal" style="padding:0.4rem 0.8rem; font-size:0.78rem;">
                                        <span class="material-symbols-rounded" style="font-size:0.95rem;">lock</span> Area Clinica Protetta
                                    </div>
                                </div>
                            </div>
                            <div id="ds-module-outlet" style="flex:1; min-height:0; overflow-y:auto;"></div>
                        </div>
                    `;

                    const brandHome = el.querySelector('#ds-brand-home');
                    if (brandHome) brandHome.addEventListener('click', () => navigateTo('dashboard'));

                    const returnHub = el.querySelector('#ds-btn-return-hub');
                    if (returnHub) returnHub.addEventListener('click', () => navigateTo('dashboard'));

                    loadCurrentModule(initialParams);
                } catch (e) {}
            }

            function navigateTo(modKey, navParams = {}) {
                try {
                    currentModule = modKey;
                    renderShell(navParams);
                } catch (e) {}
            }

            async function loadCurrentModule(modParams = {}) {
                try {
                    const outlet = el.querySelector('#ds-module-outlet');
                    if (!outlet) return;
                    outlet.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento...</p></div>';
                    const target = MODULES[currentModule];
                    if (target && target.module && typeof target.module.render === 'function') {
                        await target.module.render(outlet, navigateTo, modParams);
                    }
                } catch (e) {
                    const outlet = el.querySelector('#ds-module-outlet');
                    if (outlet) outlet.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
                }
            }

            renderShell(params);

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore generale: ${e.message}</p></div>`;
        }
    }
};
