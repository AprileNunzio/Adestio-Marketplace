import { callApi } from '../shared/api.js';
import { renderHero, renderStatCard, formatCurrency } from '../shared/ui_kit.js';
import { checkPermission } from '../shared/rbac_guard.js';
import { computeMonthlyTrends, computeCategoryDistribution, computePaymentMethodsDistribution } from '../domain/financial_analytics.js';
import { computeSmartCashflow } from '../domain/smart_cashflow_engine.js';
import { renderBarTrendChart, renderDonutChart } from '../components/chart_renderer.js';
import { renderCashflowAnalyticsView } from '../components/cashflow_analytics_view.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Elaborazione Cruscotto Statistico Direzionale...</p></div>';

            const canView = await checkPermission('statistiche:view');

            if (!canView) {
                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: 'Accesso Riservato Direzione',
                            subtitle: 'Questa sezione è protetta dal controllo accessi RBAC dello studio odontoiatrico.',
                            icon: 'lock'
                        })}
                        <div class="ds-panel" style="text-align:center; padding:3rem 1.5rem;">
                            <span class="material-symbols-rounded" style="font-size:3rem; color:var(--ds-rose);">security</span>
                            <h3 style="margin:0.8rem 0 0.4rem; font-size:1.2rem;">Permessi Insufficienti</h3>
                            <p style="color:var(--md-on-surface-variant); font-size:0.9rem; max-width:500px; margin:0 auto;">
                                L'accesso alle analisi economiche, ai margini di redditività e alle previsioni di cassa è consentito esclusivamente al <strong>Direttore Sanitario</strong> o agli utenti autorizzati.
                            </p>
                        </div>
                    </div>
                `;
                return;
            }

            const [statRes, incRes, speseRes, prevRes, tratRes, prestRes, rateRes, appRes, staffRes] = await Promise.all([
                callApi('statistiche:getKpi'),
                callApi('contabilita:getIncassi'),
                callApi('contabilita:getSpese'),
                callApi('contabilita:getPreventivi'),
                callApi('pazienti:getTrattamenti'),
                callApi('prestazioni:getAll'),
                callApi('rate:getAllScadenziario'),
                callApi('agenda:getAppuntamenti', { dateFrom: Date.now(), dateTo: Date.now() + 60 * 86400000 }),
                callApi('staff:getAll')
            ]);

            const kpi = (statRes && statRes.success) ? statRes.data : {};
            const incassi = (incRes && incRes.success) ? incRes.data : [];
            const spese = (speseRes && speseRes.success) ? speseRes.data : [];
            const preventivi = (prevRes && prevRes.success) ? prevRes.data : [];
            const trattamenti = (tratRes && tratRes.success) ? tratRes.data : [];
            const prestazioni = (prestRes && prestRes.success) ? prestRes.data : [];
            const rate = (rateRes && rateRes.success) ? rateRes.data : [];
            const appuntamenti = (appRes && appRes.success) ? appRes.data : [];
            const staff = (staffRes && staffRes.success) ? staffRes.data : [];

            const monthlyTrends = computeMonthlyTrends(incassi, spese, 6);
            const smartForecast = computeSmartCashflow({
                rate,
                preventivi,
                incassi,
                spese,
                appuntamenti,
                prestazioni,
                staff
            });
            const categoryDist = computeCategoryDistribution(trattamenti, prestazioni);
            const paymentMethodsDist = computePaymentMethodsDistribution(incassi);

            const totInc = incassi.reduce((a, b) => a + (Number(b.importo) || 0), 0);
            const totSp = spese.reduce((a, b) => a + (Number(b.importo) || 0), 0);
            const margineNetto = totInc - totSp;
            const percentualeMargine = totInc > 0 ? Math.round((margineNetto / totInc) * 100) : 0;

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'Statistiche Economiche & Previsioni di Cassa',
                        subtitle: 'Analisi andamenti, cashflow predittivo multi-variabile, margini e scomposizione clinica.',
                        icon: 'monitoring',
                                theme: 'rose',
                        actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-refresh-stats"><span class="material-symbols-rounded">sync</span>Aggiorna Dati</button>`
                    })}

                    <div class="ds-grid-stats">
                        ${renderStatCard({
                            label: 'Incassi Complessivi',
                            value: formatCurrency(totInc),
                            icon: 'payments',
                            color: '#0d9488',
                            bgColor: 'rgba(13,148,136,0.12)'
                        })}
                        ${renderStatCard({
                            label: 'Spese & Uscite Studio',
                            value: formatCurrency(totSp),
                            icon: 'shopping_cart_checkout',
                            color: '#e11d48',
                            bgColor: 'rgba(225,29,72,0.12)'
                        })}
                        ${renderStatCard({
                            label: 'Margine Operativo Netto',
                            value: formatCurrency(margineNetto),
                            icon: 'savings',
                            color: margineNetto >= 0 ? '#16a34a' : '#d97706',
                            bgColor: margineNetto >= 0 ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)'
                        })}
                        ${renderStatCard({
                            label: 'Redditività / Margine %',
                            value: `${percentualeMargine}%`,
                            icon: 'percent',
                            color: '#2563eb',
                            bgColor: 'rgba(37,99,235,0.12)'
                        })}
                    </div>

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title">
                                <span class="material-symbols-rounded" style="color:var(--ds-purple);">insights</span>
                                Previsioni di Cassa & Cashflow Forecasting Intelligente
                            </div>
                            <span class="ds-badge ds-badge-purple">Algoritmo Multi-Vettore</span>
                        </div>
                        <div id="ds-smart-forecast-outlet"></div>
                    </div>

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title">
                                <span class="material-symbols-rounded" style="color:var(--ds-teal);">bar_chart</span>
                                Andamento Storico Mensile Incassi vs Spese (Ultimi 6 Mesi)
                            </div>
                            <span class="ds-badge ds-badge-teal">Trend Economico Reale</span>
                        </div>
                        ${renderBarTrendChart({ months: monthlyTrends, height: 230 })}
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.2rem;">
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title">
                                    <span class="material-symbols-rounded" style="color:var(--ds-blue);">pie_chart</span>
                                    Fatturato per Branca Odontoiatrica
                                </div>
                            </div>
                            ${renderDonutChart({ items: categoryDist, size: 170 })}
                        </div>

                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title">
                                    <span class="material-symbols-rounded" style="color:var(--ds-green);">account_balance</span>
                                    Distribuzione Metodi di Pagamento
                                </div>
                            </div>
                            ${renderDonutChart({ items: paymentMethodsDist, size: 170 })}
                        </div>
                    </div>

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title">
                                <span class="material-symbols-rounded" style="color:var(--ds-teal);">leaderboard</span>
                                Redditività Collaboratori ed Equipe Specialistica
                            </div>
                        </div>
                        <div class="ds-table-wrap">
                            <table class="ds-table">
                                <thead>
                                    <tr>
                                        <th>Medico / Specialista</th>
                                        <th>Ruolo Clinico</th>
                                        <th>Trattamenti Eseguiti</th>
                                        <th>Fatturato Generato</th>
                                        <th>Compensi Spettanti</th>
                                        <th>Margine Studio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${!kpi.mediciTop || kpi.mediciTop.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun dato registrato.</td></tr>' : kpi.mediciTop.map(m => {
                                        const incGen = Number(m.totale_generato) || 0;
                                        const comp = Number(m.totale_compensi) || 0;
                                        const marg = incGen - comp;
                                        return `
                                            <tr>
                                                <td><strong>Dr. ${m.cognome} ${m.nome}</strong></td>
                                                <td><span class="ds-badge ds-badge-teal">${(m.ruolo || '').replace(/_/g, ' ').toUpperCase()}</span></td>
                                                <td>${m.trattamenti_eseguiti || 0} sedute</td>
                                                <td style="font-weight:800; color:var(--ds-blue);">${formatCurrency(incGen)}</td>
                                                <td style="font-weight:700; color:var(--ds-purple);">${formatCurrency(comp)}</td>
                                                <td style="font-weight:800; color:${marg >= 0 ? 'var(--ds-green)' : 'var(--ds-rose)'};">${formatCurrency(marg)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            const forecastContainer = el.querySelector('#ds-smart-forecast-outlet');
            if (forecastContainer) {
                renderCashflowAnalyticsView(forecastContainer, smartForecast);
            }

            const btnRef = el.querySelector('#ds-btn-refresh-stats');
            if (btnRef) btnRef.addEventListener('click', () => onNavigate('statistiche'));

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
