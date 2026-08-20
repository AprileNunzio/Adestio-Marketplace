import { formatCurrency } from '../shared/ui_kit.js';

export function renderCashflowAnalyticsView(container, forecast) {
    try {
        let activeScenario = 'realistico';

        function render() {
            const sc = forecast.scenarios[activeScenario] || forecast.scenarios.realistico;
            const net = forecast.netFlows;
            const out = forecast.outflows;
            const bk = forecast.breakdown30;

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1.2rem;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.8rem; background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:16px; padding:0.9rem 1.2rem;">
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                            <span class="material-symbols-rounded" style="color:var(--ds-purple); font-size:1.6rem;">insights</span>
                            <div>
                                <div style="font-weight:800; font-size:1rem; color:var(--md-on-surface);">Motore Predittivo Multi-Variabile</div>
                                <div style="font-size:0.76rem; color:var(--md-on-surface-variant);">Indice di copertura cassa: <strong style="color:var(--ds-teal);">${forecast.coverageRatio}x</strong></div>
                            </div>
                        </div>
                        <div class="ds-nav" style="background:var(--md-surface-container-low); padding:4px; border-radius:12px;">
                            <button class="ds-nav-btn ${activeScenario === 'prudenziale' ? 'active' : ''}" data-scen="prudenziale" style="font-size:0.78rem; padding:0.4rem 0.8rem;">🛡️ Prudenziale</button>
                            <button class="ds-nav-btn ${activeScenario === 'realistico' ? 'active' : ''}" data-scen="realistico" style="font-size:0.78rem; padding:0.4rem 0.8rem;">🎯 Atteso (Ponderato)</button>
                            <button class="ds-nav-btn ${activeScenario === 'ottimistico' ? 'active' : ''}" data-scen="ottimistico" style="font-size:0.78rem; padding:0.4rem 0.8rem;">🚀 Ottimistico</button>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
                        <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:16px; padding:1.2rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.76rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant);">Entrate Previste (30gg)</span>
                                <span class="material-symbols-rounded" style="color:var(--ds-teal);">trending_up</span>
                            </div>
                            <div style="font-size:1.6rem; font-weight:800; color:var(--ds-teal); margin-top:0.3rem;">${formatCurrency(sc.m30)}</div>
                            <div style="font-size:0.75rem; color:var(--md-on-surface-variant); margin-top:0.3rem;">60gg: ${formatCurrency(sc.m60)} • 90gg: ${formatCurrency(sc.m90)}</div>
                        </div>

                        <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:16px; padding:1.2rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.76rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant);">Uscite Fisse & Variabili (30gg)</span>
                                <span class="material-symbols-rounded" style="color:var(--ds-rose);">trending_down</span>
                            </div>
                            <div style="font-size:1.6rem; font-weight:800; color:var(--ds-rose); margin-top:0.3rem;">${formatCurrency(out.m30)}</div>
                            <div style="font-size:0.75rem; color:var(--md-on-surface-variant); margin-top:0.3rem;">Totale Trimestre: ${formatCurrency(out.total)}</div>
                        </div>

                        <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:16px; padding:1.2rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.76rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant);">Flusso Netto Atteso (30gg)</span>
                                <span class="material-symbols-rounded" style="color:${net.m30 >= 0 ? 'var(--ds-green)' : 'var(--ds-rose)'};">savings</span>
                            </div>
                            <div style="font-size:1.6rem; font-weight:800; color:${net.m30 >= 0 ? 'var(--ds-green)' : 'var(--ds-rose)'}; margin-top:0.3rem;">${formatCurrency(net.m30)}</div>
                            <div style="font-size:0.75rem; color:var(--md-on-surface-variant); margin-top:0.3rem;">Netto Trimestrale: ${formatCurrency(net.total)}</div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.2rem;">
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title">
                                    <span class="material-symbols-rounded" style="color:var(--ds-teal);">account_tree</span>
                                    Scomposizione Vettori di Incasso (Prossimi 30 Giorni)
                                </div>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:0.6rem; font-size:0.86rem;">
                                <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--md-outline-variant);">
                                    <span>📆 Rate Contrattualizzate (Pesate Solvibilità)</span>
                                    <strong>${formatCurrency(bk.rateCerte)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--md-outline-variant);">
                                    <span>📋 Preventivi Accettati & Pipeline Ponderata</span>
                                    <strong>${formatCurrency(bk.preventiviPonderati)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--md-outline-variant);">
                                    <span>💺 Produttività Agenda Poltrone</span>
                                    <strong>${formatCurrency(bk.agendaVelocity)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:0.4rem 0;">
                                    <span>📈 Routine Clinica & Stagionalità</span>
                                    <strong>${formatCurrency(bk.routineRicorrente)}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title">
                                    <span class="material-symbols-rounded" style="color:var(--ds-purple);">lightbulb</span>
                                    Smart Advisory & Suggerimenti Direzionali
                                </div>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:0.8rem;">
                                ${forecast.advisory.length === 0 ? '<p style="color:var(--md-on-surface-variant);">Nessun alert generato.</p>' : forecast.advisory.map(adv => `
                                    <div style="display:flex; gap:0.8rem; padding:0.7rem 0.9rem; background:var(--md-surface-container-low); border-radius:12px;">
                                        <span class="material-symbols-rounded" style="color:var(--ds-${adv.type === 'danger' ? 'rose' : (adv.type === 'warning' ? 'amber' : 'teal')}); font-size:1.4rem;">${adv.icon}</span>
                                        <div>
                                            <div style="font-weight:800; font-size:0.88rem; color:var(--md-on-surface);">${adv.title}</div>
                                            <div style="font-size:0.8rem; color:var(--md-on-surface-variant); margin-top:0.2rem;">${adv.desc}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                </div>
            `;

            container.querySelectorAll('.ds-nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeScenario = btn.dataset.scen;
                    render();
                });
            });
        }

        render();
    } catch (e) {}
}
