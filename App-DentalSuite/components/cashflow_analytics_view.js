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
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.8rem; background:var(--md-surface-container-low); border:1.5px solid var(--md-outline-variant); border-radius:18px; padding:1rem 1.4rem;">
                        <div style="display:flex; align-items:center; gap:0.8rem;">
                            <div style="width:44px; height:44px; border-radius:14px; background:rgba(126,34,206,0.12); display:flex; align-items:center; justify-content:center; color:var(--ds-purple);">
                                <span class="material-symbols-rounded" style="font-size:1.6rem;">insights</span>
                            </div>
                            <div>
                                <div style="font-weight:800; font-size:1.05rem; color:var(--md-on-surface);">Motore Predittivo Multi-Variabile Cashflow</div>
                                <div style="font-size:0.78rem; color:var(--md-on-surface-variant); margin-top:2px;">Indice di copertura cassa: <strong style="color:var(--ds-teal); font-size:0.88rem;">${forecast.coverageRatio}x</strong> (Liquidità / Uscite)</div>
                            </div>
                        </div>
                        <div class="ds-nav" style="background:var(--md-surface); padding:4px; border-radius:999px; border:1px solid var(--md-outline-variant);">
                            <button class="ds-nav-btn ${activeScenario === 'prudenziale' ? 'active' : ''}" data-scen="prudenziale" style="font-size:0.8rem; padding:0.4rem 0.9rem;">🛡️ Prudenziale</button>
                            <button class="ds-nav-btn ${activeScenario === 'realistico' ? 'active' : ''}" data-scen="realistico" style="font-size:0.8rem; padding:0.4rem 0.9rem;">🎯 Atteso (Ponderato)</button>
                            <button class="ds-nav-btn ${activeScenario === 'ottimistico' ? 'active' : ''}" data-scen="ottimistico" style="font-size:0.8rem; padding:0.4rem 0.9rem;">🚀 Ottimistico</button>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
                        <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:18px; padding:1.2rem 1.4rem; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.78rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant); letter-spacing:0.04em;">Entrate Previste (30gg)</span>
                                <div style="width:36px; height:36px; border-radius:10px; background:rgba(13,148,136,0.12); display:flex; align-items:center; justify-content:center; color:var(--ds-teal);">
                                    <span class="material-symbols-rounded">trending_up</span>
                                </div>
                            </div>
                            <div style="font-size:1.65rem; font-weight:800; color:var(--ds-teal); margin-top:0.4rem;">${formatCurrency(sc.m30)}</div>
                            <div style="font-size:0.76rem; color:var(--md-on-surface-variant); margin-top:0.35rem;">60gg: <strong>${formatCurrency(sc.m60)}</strong> • 90gg: <strong>${formatCurrency(sc.m90)}</strong></div>
                        </div>

                        <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:18px; padding:1.2rem 1.4rem; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.78rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant); letter-spacing:0.04em;">Uscite Fisse & Variabili (30gg)</span>
                                <div style="width:36px; height:36px; border-radius:10px; background:rgba(225,29,72,0.12); display:flex; align-items:center; justify-content:center; color:var(--ds-rose);">
                                    <span class="material-symbols-rounded">trending_down</span>
                                </div>
                            </div>
                            <div style="font-size:1.65rem; font-weight:800; color:var(--ds-rose); margin-top:0.4rem;">${formatCurrency(out.m30)}</div>
                            <div style="font-size:0.76rem; color:var(--md-on-surface-variant); margin-top:0.35rem;">Totale Trimestre: <strong>${formatCurrency(out.total)}</strong></div>
                        </div>

                        <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:18px; padding:1.2rem 1.4rem; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.78rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant); letter-spacing:0.04em;">Flusso Netto Atteso (30gg)</span>
                                <div style="width:36px; height:36px; border-radius:10px; background:${net.m30 >= 0 ? 'rgba(22,163,74,0.12)' : 'rgba(225,29,72,0.12)'}; display:flex; align-items:center; justify-content:center; color:${net.m30 >= 0 ? 'var(--ds-green)' : 'var(--ds-rose)'};">
                                    <span class="material-symbols-rounded">savings</span>
                                </div>
                            </div>
                            <div style="font-size:1.65rem; font-weight:800; color:${net.m30 >= 0 ? 'var(--ds-green)' : 'var(--ds-rose)'}; margin-top:0.4rem;">${formatCurrency(net.m30)}</div>
                            <div style="font-size:0.76rem; color:var(--md-on-surface-variant); margin-top:0.35rem;">Netto Trimestrale: <strong>${formatCurrency(net.total)}</strong></div>
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
                            <div style="display:flex; flex-direction:column; gap:0.7rem; font-size:0.88rem;">
                                <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--md-outline-variant);">
                                    <span>📆 Rate Contrattualizzate (Pesate Solvibilità)</span>
                                    <strong style="color:var(--ds-teal);">${formatCurrency(bk.rateCerte)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--md-outline-variant);">
                                    <span>📋 Preventivi Accettati & Pipeline Ponderata</span>
                                    <strong style="color:var(--ds-blue);">${formatCurrency(bk.preventiviPonderati)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--md-outline-variant);">
                                    <span>💺 Produttività Agenda Poltrone</span>
                                    <strong style="color:var(--ds-purple);">${formatCurrency(bk.agendaVelocity)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:0.5rem 0;">
                                    <span>📈 Routine Clinica & Stagionalità</span>
                                    <strong style="color:var(--ds-green);">${formatCurrency(bk.routineRicorrente)}</strong>
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
                                ${forecast.advisory.length === 0 ? '<p style="color:var(--md-on-surface-variant); text-align:center; padding:1.2rem;">Tutti gli indicatori sono ottimali.</p>' : forecast.advisory.map(adv => `
                                    <div style="display:flex; gap:0.9rem; padding:0.85rem 1rem; background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:14px;">
                                        <span class="material-symbols-rounded" style="color:var(--ds-${adv.type === 'danger' ? 'rose' : (adv.type === 'warning' ? 'amber' : 'teal')}); font-size:1.5rem; flex-shrink:0;">${adv.icon}</span>
                                        <div>
                                            <div style="font-weight:800; font-size:0.9rem; color:var(--md-on-surface);">${adv.title}</div>
                                            <div style="font-size:0.82rem; color:var(--md-on-surface-variant); margin-top:0.25rem; line-height:1.35;">${adv.desc}</div>
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
