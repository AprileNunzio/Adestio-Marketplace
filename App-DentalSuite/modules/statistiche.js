import { callApi } from '../shared/api.js';
import { checkPermission } from '../shared/rbac_guard.js';
import { renderHero, renderStatCard, formatCurrency } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            const hasStatsPermission = await checkPermission('stats');
            if (!hasStatsPermission) {
                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: 'Accesso Riservato • Direzione Sanitaria',
                            subtitle: 'Area protetta da controllo accessi RBAC.',
                            icon: 'lock'
                        })}
                        <div class="ds-panel" style="text-align:center; padding:3rem 1.5rem;">
                            <span class="material-symbols-rounded" style="font-size:3.5rem; color:var(--ds-rose);">security</span>
                            <h3 style="margin:1rem 0 0.5rem;">Permesso Non Disponibile</h3>
                            <p style="color:var(--md-on-surface-variant); max-width:480px; margin:0 auto 1.5rem;">Questa sezione di analisi economica e margini operativi è riservata al Medico Capo / Direttore Sanitario della struttura.</p>
                            <button class="ds-btn ds-btn-primary" id="ds-stats-back-dash" style="margin:0 auto;"><span class="material-symbols-rounded">dashboard</span>Torna alla Dashboard</button>
                        </div>
                    </div>
                `;
                el.querySelector('#ds-stats-back-dash').addEventListener('click', () => onNavigate('dashboard'));
                return;
            }

            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Elaborazione Indicatori Economici & Redditività...</p></div>';

            const [globalRes, mediciRes, brancaRes] = await Promise.all([
                callApi('statistiche:getGlobalStats'),
                callApi('statistiche:getStatsByMedico'),
                callApi('statistiche:getStatsByBranca')
            ]);

            const global = (globalRes && globalRes.success) ? globalRes.data : {};
            const medici = (mediciRes && mediciRes.success) ? mediciRes.data : [];
            const branche = (brancaRes && brancaRes.success) ? brancaRes.data : [];

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'Cruscotto Direzionale & Analisi Margini',
                        subtitle: 'Visione globale per il Direttore Sanitario: utili netti, redditività specialisti e branche cliniche.',
                        icon: 'monitoring',
                        actionsHtml: `<span class="ds-badge" style="background:#ffffff; color:var(--ds-teal-dark); font-weight:800;"><span class="material-symbols-rounded">verified_user</span>Vista Direzione Sanitaria</span>`
                    })}

                    <div class="ds-grid-stats">
                        ${renderStatCard({ icon: 'payments', value: formatCurrency(global.totIncassi || 0), label: 'Fatturato / Incassi Totali', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' })}
                        ${renderStatCard({ icon: 'shopping_bag', value: formatCurrency(global.totSpese || 0), label: 'Spese Vive di Gestione', color: '#e11d48', bg: 'rgba(225,29,72,0.12)' })}
                        ${renderStatCard({ icon: 'medical_services', value: formatCurrency(global.totMedici || 0), label: 'Compensi Medici Maturati', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' })}
                        ${renderStatCard({ icon: 'support_agent', value: formatCurrency(global.totSegreteria || 0), label: 'Compensi Segreteria/ASO', color: '#9333ea', bg: 'rgba(147,51,234,0.12)' })}
                        ${renderStatCard({ icon: 'account_balance', value: formatCurrency(global.utileNettoStudio || 0), label: 'Margine Netto Studio Odontoiatrico', color: '#0d9488', bg: 'rgba(13,148,136,0.15)' })}
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.2rem;">
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">person_star</span>Redditività & Volume per Medico / Specialista</div>
                            </div>
                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Medico</th>
                                            <th>Trattamenti Eseguiti</th>
                                            <th>Fatturato Generato</th>
                                            <th>Compenso Medico</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${medici.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun dato registrato.</td></tr>' : medici.map(m => `
                                            <tr>
                                                <td><strong style="color:${m.colore_calendario || 'inherit'};">Dr. ${m.cognome} ${m.nome}</strong></td>
                                                <td><strong>${m.numero_prestazioni || 0}</strong></td>
                                                <td style="font-weight:700; color:var(--ds-teal);">${formatCurrency(m.fatturato_generato || 0)}</td>
                                                <td style="font-weight:700; color:var(--ds-blue);">${formatCurrency(m.compensi_maturati || 0)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">pie_chart</span>Ripartizione per Branca Odontoiatrica</div>
                            </div>
                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Branca</th>
                                            <th>Numero Interventi</th>
                                            <th>Fatturato Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${branche.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun dato registrato.</td></tr>' : branche.map(b => `
                                            <tr>
                                                <td><span class="ds-badge ds-badge-teal">${b.branca.toUpperCase()}</span></td>
                                                <td><strong>${b.conteggio || 0}</strong></td>
                                                <td style="font-weight:800; font-size:0.95rem;">${formatCurrency(b.fatturato || 0)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
