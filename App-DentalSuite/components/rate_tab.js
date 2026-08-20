import { callApi } from '../shared/api.js';
import { formatCurrency, formatDate } from '../shared/ui_kit.js';
import { openInstallmentPlanModal } from './installment_modal.js';
import { openNotificationModal } from './notification_modal.js';

export function renderRateTab(container, { paziente, rateList = [], onUpdated }) {
    try {
        container.innerHTML = `
            <div class="ds-panel">
                <div class="ds-panel-header">
                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">credit_card</span>Piani di Rateizzazione & Scadenziario</div>
                    <button class="ds-btn ds-btn-primary" id="ds-new-plan-btn"><span class="material-symbols-rounded">add</span>Nuovo Piano Rateale</button>
                </div>

                <div class="ds-table-wrap">
                    <table class="ds-table">
                        <thead>
                            <tr>
                                <th>Rata n°</th>
                                <th>Importo</th>
                                <th>Data Scadenza</th>
                                <th>Stato</th>
                                <th>Data Pagamento</th>
                                <th style="text-align:right;">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rateList.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessuna rata attiva per questo paziente.</td></tr>' : rateList.map(r => `
                                <tr>
                                    <td><strong>Rata ${r.numero_rata}</strong></td>
                                    <td style="font-weight:800; color:var(--ds-teal);">${formatCurrency(r.importo)}</td>
                                    <td>${formatDate(r.data_scadenza)}</td>
                                    <td><span class="ds-badge ds-badge-${r.stato === 'pagata' ? 'green' : 'amber'}">${r.stato.toUpperCase()}</span></td>
                                    <td>${r.data_pagamento ? formatDate(r.data_pagamento) : '-'}</td>
                                    <td style="text-align:right;">
                                        <div style="display:inline-flex; gap:0.35rem;">
                                            ${r.stato !== 'pagata' ? `<button class="ds-btn ds-btn-primary ds-paga-rata" data-id="${r.id}" style="padding:0.35rem 0.6rem; font-size:0.8rem;"><span class="material-symbols-rounded" style="font-size:1rem;">check_circle</span> Salda</button>` : ''}
                                            <button class="ds-btn ds-btn-ghost ds-notify-rata" data-id="${r.id}" title="Invia Promemoria Scadenza" style="padding:0.35rem 0.6rem; color:var(--ds-green);"><span class="material-symbols-rounded" style="font-size:1.1rem;">chat</span></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.querySelector('#ds-new-plan-btn').addEventListener('click', () => {
            openInstallmentPlanModal({
                pazienteId: paziente.id,
                onCreated: () => { if (typeof onUpdated === 'function') onUpdated(); }
            });
        });

        container.querySelectorAll('.ds-paga-rata').forEach(b => {
            b.addEventListener('click', async () => {
                const metodo = prompt('Metodo di pagamento (pos, bonifico, contanti):', 'pos') || 'pos';
                await callApi('rate:pagaRata', { rata_id: b.dataset.id, metodo_pagamento: metodo });
                if (typeof onUpdated === 'function') onUpdated();
            });
        });

        container.querySelectorAll('.ds-notify-rata').forEach(b => {
            b.addEventListener('click', () => {
                const r = rateList.find(item => item.id === b.dataset.id);
                if (r) openNotificationModal({ paziente, rata: r });
            });
        });
    } catch (e) {}
}
