import { callApi } from '../shared/api.js';
import { renderHero, renderStatCard, formatCurrency, formatDate, formatDateTime } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Dashboard Clinica...</p></div>';

            const [statsRes, appRes, staffRes] = await Promise.all([
                callApi('statistiche:getGlobalStats'),
                callApi('agenda:getAppuntamenti', { dateFrom: Date.now() - 24 * 3600 * 1000, dateTo: Date.now() + 7 * 24 * 3600 * 1000 }),
                callApi('staff:getAll')
            ]);

            const stats = (statsRes && statsRes.success) ? statsRes.data : {};
            const appuntamenti = (appRes && appRes.success) ? appRes.data : [];
            const staffList = (staffRes && staffRes.success) ? staffRes.data : [];

            const appOggi = appuntamenti.filter(a => {
                const d = new Date(a.data_ora_inizio);
                const today = new Date();
                return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
            });

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'DentalSuite • Studio Odontoiatrico',
                        subtitle: 'Pannello operativo di gestione clinica, poltrone e prestazioni sanitarie.',
                        icon: 'dentistry',
                        actionsHtml: `
                            <button class="ds-btn ds-btn-hero" id="ds-quick-paziente"><span class="material-symbols-rounded">person_add</span>Nuovo Paziente</button>
                            <button class="ds-btn ds-btn-hero" id="ds-quick-visita"><span class="material-symbols-rounded">calendar_add_on</span>Nuovo Appuntamento</button>
                        `
                    })}

                    <div class="ds-grid-stats">
                        ${renderStatCard({ icon: 'calendar_today', value: appOggi.length, label: 'Appuntamenti Oggi', color: '#0d9488', bg: 'rgba(13,148,136,0.12)' })}
                        ${renderStatCard({ icon: 'groups', value: stats.pazientiTot || 0, label: 'Pazienti Totali', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' })}
                        ${renderStatCard({ icon: 'payments', value: formatCurrency(stats.totIncassi || 0), label: 'Incassi Registrati', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' })}
                        ${renderStatCard({ icon: 'account_balance_wallet', value: formatCurrency(stats.utileNettoStudio || 0), label: 'Margine Netto Studio', color: '#d97706', bg: 'rgba(217,119,6,0.12)' })}
                    </div>

                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1.2rem;">
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">event_upcoming</span>Prossimi Appuntamenti in Poltrona</div>
                                <button class="ds-btn ds-btn-ghost" id="ds-goto-agenda" style="font-size:0.8rem; padding:0.4rem 0.8rem;">Vedi Agenda</button>
                            </div>
                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Data e Ora</th>
                                            <th>Paziente</th>
                                            <th>Medico / Operatore</th>
                                            <th>Poltrona</th>
                                            <th>Stato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${appuntamenti.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun appuntamento in programma nei prossimi giorni.</td></tr>' : appuntamenti.slice(0, 6).map(a => `
                                            <tr>
                                                <td style="font-weight:700;">${formatDateTime(a.data_ora_inizio)}</td>
                                                <td><strong>${a.paziente_cognome || ''} ${a.paziente_nome || ''}</strong><br><small style="color:var(--md-on-surface-variant);">${a.paziente_telefono || a.paziente_cf || ''}</small></td>
                                                <td><span class="ds-badge" style="background:${a.colore_calendario || '#0d9488'}22; color:${a.colore_calendario || '#0d9488'}; font-weight:800;">Dr. ${a.medico_cognome || ''}</span></td>
                                                <td>${a.poltrona || 'Unità 1'}</td>
                                                <td><span class="ds-badge ds-badge-${a.stato === 'completato' ? 'green' : (a.stato === 'in_corso' ? 'blue' : (a.stato === 'in_attesa' ? 'amber' : 'teal'))}">${a.stato}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">badge</span>Equipe Medica & Staff</div>
                                <button class="ds-btn ds-btn-ghost" id="ds-goto-staff" style="font-size:0.8rem; padding:0.4rem 0.8rem;">Gestisci</button>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:0.7rem;">
                                ${staffList.length === 0 ? '<p style="color:var(--md-on-surface-variant); text-align:center;">Nessun operatore configurato.</p>' : staffList.slice(0, 5).map(s => `
                                    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:12px; border:1px solid var(--md-outline-variant);">
                                        <div style="display:flex; align-items:center; gap:0.6rem;">
                                            <span class="material-symbols-rounded" style="color:${s.colore_calendario || '#0d9488'}; font-size:1.4rem;">account_circle</span>
                                            <div>
                                                <div style="font-weight:700; font-size:0.88rem;">${s.cognome} ${s.nome}</div>
                                                <div style="font-size:0.74rem; color:var(--md-on-surface-variant);">${s.ruolo.replace(/_/g, ' ')}</div>
                                            </div>
                                        </div>
                                        <span class="ds-badge ds-badge-teal">${s.tipo_compenso_default === 'percentuale' ? s.valore_compenso_default + '%' : s.valore_compenso_default + ' €'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const btnQuickP = el.querySelector('#ds-quick-paziente');
            if (btnQuickP && onNavigate) btnQuickP.addEventListener('click', () => onNavigate('pazienti', { openNew: true }));

            const btnQuickV = el.querySelector('#ds-quick-visita');
            if (btnQuickV && onNavigate) btnQuickV.addEventListener('click', () => onNavigate('agenda', { openNew: true }));

            const btnGotoA = el.querySelector('#ds-goto-agenda');
            if (btnGotoA && onNavigate) btnGotoA.addEventListener('click', () => onNavigate('agenda'));

            const btnGotoS = el.querySelector('#ds-goto-staff');
            if (btnGotoS && onNavigate) btnGotoS.addEventListener('click', () => onNavigate('staff'));

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore nel rendering della dashboard: ${e.message}</p></div>`;
        }
    }
};
