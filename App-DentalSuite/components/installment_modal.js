import { callApi } from '../shared/api.js';
import { renderModal, formatCurrency } from '../shared/ui_kit.js';
import { calculateInstallmentPlan } from '../domain/installment_calculator.js';

export function openInstallmentPlanModal({ pazienteId, preventivo = null, onCreated }) {
    try {
        const initialTotal = preventivo ? preventivo.totale_netto : 1000;

        const modalHtml = renderModal({
            id: 'ds-modal-inst-plan',
            title: 'Creazione Piano di Rateizzazione & Acconto',
            icon: 'credit_card',
            bodyHtml: `
                <form id="ds-form-inst">
                    <div class="ds-form-grid">
                        <div class="ds-form-field">
                            <label>Totale Trattamento / Preventivo (€) *</label>
                            <input type="number" step="0.01" id="ds-inst-total" class="ds-input" required value="${initialTotal}">
                        </div>
                        <div class="ds-form-field">
                            <label>Acconto Iniziale Versato (€)</label>
                            <input type="number" step="0.01" id="ds-inst-advance" class="ds-input" value="200.00">
                        </div>
                        <div class="ds-form-field">
                            <label>Metodo di Pagamento Acconto</label>
                            <select id="ds-inst-adv-method" class="ds-select">
                                <option value="pos">POS / Carta</option>
                                <option value="bonifico">Bonifico</option>
                                <option value="contanti">Contanti</option>
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Numero di Rate</label>
                            <select id="ds-inst-num" class="ds-select">
                                <option value="2">2 Rate Mensili</option>
                                <option value="3" selected>3 Rate Mensili</option>
                                <option value="4">4 Rate Mensili</option>
                                <option value="6">6 Rate Mensili</option>
                                <option value="12">12 Rate Mensili</option>
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Data Decorrenza Prima Rata</label>
                            <input type="date" id="ds-inst-start" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>

                    <div style="margin-top:1.2rem;">
                        <label style="font-weight:700; font-size:0.8rem; text-transform:uppercase; color:var(--md-on-surface-variant);">Anteprima Scadenziario Rate</label>
                        <div id="ds-inst-preview" style="margin-top:0.5rem; background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:12px; padding:0.8rem;"></div>
                    </div>
                </form>
            `,
            footerHtml: `
                <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                <button type="button" class="ds-btn ds-btn-primary" id="ds-btn-save-plan"><span class="material-symbols-rounded">save</span>Genera Piano Rateale</button>
            `
        });

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const mEl = modalContainer.querySelector('#ds-modal-inst-plan');
        mEl.style.display = 'flex';

        const close = () => { modalContainer.remove(); };
        mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

        function updatePreview() {
            try {
                const tot = Number(mEl.querySelector('#ds-inst-total').value) || 0;
                const adv = Number(mEl.querySelector('#ds-inst-advance').value) || 0;
                const num = Number(mEl.querySelector('#ds-inst-num').value) || 3;
                const start = mEl.querySelector('#ds-inst-start').value || new Date();

                const plan = calculateInstallmentPlan({
                    totalAmount: tot,
                    advancePayment: adv,
                    numberOfInstallments: num,
                    startDate: start
                });

                const previewBox = mEl.querySelector('#ds-inst-preview');
                previewBox.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem; font-size:0.85rem;">
                        <span>Acconto Immediato: <strong style="color:var(--ds-green);">${formatCurrency(plan.acconto_versato)}</strong></span>
                        <span>Residuo da Rateizzare: <strong>${formatCurrency(plan.residuo_rateizzato)}</strong></span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.4rem;">
                        ${plan.rate.map(r => `
                            <div style="display:flex; justify-content:space-between; background:var(--md-surface); padding:0.4rem 0.6rem; border-radius:8px; font-size:0.85rem; border:1px solid var(--md-outline-variant);">
                                <span>Rata n° ${r.numero_rata} (Scadenza: ${new Date(r.data_scadenza).toLocaleDateString('it-IT')})</span>
                                <strong style="color:var(--ds-teal);">${formatCurrency(r.importo)}</strong>
                            </div>
                        `).join('')}
                    </div>
                `;
                return plan;
            } catch (err) {
                return null;
            }
        }

        ['#ds-inst-total', '#ds-inst-advance', '#ds-inst-num', '#ds-inst-start'].forEach(sel => {
            mEl.querySelector(sel).addEventListener('input', updatePreview);
        });

        updatePreview();

        mEl.querySelector('#ds-btn-save-plan').addEventListener('click', async () => {
            try {
                const plan = updatePreview();
                if (!plan) return;

                const payload = {
                    paziente_id: pazienteId,
                    preventivo_id: preventivo ? preventivo.id : '',
                    totale_importo: plan.totale_importo,
                    acconto_versato: plan.acconto_versato,
                    metodo_pagamento_acconto: mEl.querySelector('#ds-inst-adv-method').value,
                    rate: plan.rate
                };

                const res = await callApi('rate:creaPiano', payload);
                if (res && res.success) {
                    close();
                    if (typeof onCreated === 'function') onCreated();
                } else {
                    alert(res.error || 'Errore');
                }
            } catch (err) {
                alert(err.message);
            }
        });
    } catch (e) {}
}
