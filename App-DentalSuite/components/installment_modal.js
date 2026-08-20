import { callApi } from '../shared/api.js';
import { renderModal, formatCurrency, formatDate , showNotification } from '../shared/ui_kit.js';
import { calculateInstallmentPlan } from '../domain/installment_calculator.js';
import { createPatientSearchPicker } from './patient_search_picker.js';

export function openInstallmentPlanModal({ pazienteId = null, preventivo = null, onCreated }) {
    try {
        let allPazienti = [];

        callApi('pazienti:getAll').then(res => {
            if (res && res.success) allPazienti = res.data || [];
            showModal();
        }).catch(() => showModal());

        function showModal() {
            const totIniziale = preventivo ? preventivo.totale_netto : 1200;

            const modalHtml = renderModal({
                id: 'ds-modal-installment',
                title: 'Nuovo Piano di Rateizzazione Personalizzato',
                icon: 'credit_card',
                bodyHtml: `
                    <form id="ds-form-installment">
                        <div class="ds-form-grid">
                            <div class="ds-form-field" style="grid-column:1/-1;" id="ds-plan-patient-picker-slot"></div>
                            <div class="ds-form-field">
                                <label>Importo Totale Cura (€) *</label>
                                <input type="number" step="0.01" name="totale" id="ds-inst-total" class="ds-input" required value="${totIniziale}">
                            </div>
                            <div class="ds-form-field">
                                <label>Acconto Versato Subito (€)</label>
                                <input type="number" step="0.01" name="acconto" id="ds-inst-acconto" class="ds-input" value="0.00">
                            </div>
                            <div class="ds-form-field">
                                <label>Numero di Rate Mensili *</label>
                                <select name="numero_rate" id="ds-inst-num" class="ds-select">
                                    <option value="2">2 Rate Mensili</option>
                                    <option value="3">3 Rate Mensili</option>
                                    <option value="4">4 Rate Mensili</option>
                                    <option value="6" selected>6 Rate Mensili</option>
                                    <option value="10">10 Rate Mensili</option>
                                    <option value="12">12 Rate Mensili</option>
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Decorrenza Prima Rata *</label>
                                <input type="date" name="data_prima_rata" id="ds-inst-start" class="ds-input" value="${new Date(Date.now() + 30*86400000).toISOString().split('T')[0]}">
                            </div>
                            <div class="ds-form-field" style="grid-column:1/-1;">
                                <label>Note Piano di Pagamento</label>
                                <input type="text" name="note" class="ds-input" placeholder="Es. Pagamento rateale concordato con POS/SDD...">
                            </div>
                        </div>

                        <div style="margin-top:1.2rem; background:var(--md-surface-container-low); padding:1rem; border-radius:14px; border:1px solid var(--md-outline-variant);">
                            <div style="font-weight:800; font-size:0.88rem; color:var(--md-on-surface); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
                                <span class="material-symbols-rounded" style="color:var(--ds-teal);">calculate</span>
                                Simulazione Scadenziario Quote
                            </div>
                            <div id="ds-inst-preview" style="font-size:0.84rem;"></div>
                        </div>
                    </form>
                `,
                footerHtml: `
                    <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                    <button type="button" class="ds-btn ds-btn-primary" id="ds-save-inst-btn"><span class="material-symbols-rounded">check</span>Genera Piano Rateale</button>
                `
            });

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);
            const mEl = modalContainer.querySelector('#ds-modal-installment');
            mEl.style.display = 'flex';

            const close = () => { modalContainer.remove(); };
            mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

            const patientPicker = createPatientSearchPicker({
                pazienti: allPazienti,
                initialPazienteId: pazienteId
            });
            const pickerSlot = mEl.querySelector('#ds-plan-patient-picker-slot');
            if (pickerSlot) pickerSlot.appendChild(patientPicker.element);

            function updatePreview() {
                const total = Number(mEl.querySelector('#ds-inst-total').value) || 0;
                const acconto = Number(mEl.querySelector('#ds-inst-acconto').value) || 0;
                const num = Number(mEl.querySelector('#ds-inst-num').value) || 1;
                const startDate = mEl.querySelector('#ds-inst-start').value || new Date().toISOString().split('T')[0];

                const plan = calculateInstallmentPlan({ totalAmount: total, advancePayment: acconto, numberOfInstallments: num, startDate });
                const prevEl = mEl.querySelector('#ds-inst-preview');

                prevEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem; font-weight:700;">
                        <span>Totale: ${formatCurrency(plan.totale_importo)}</span>
                        <span>Acconto: ${formatCurrency(plan.acconto_versato)}</span>
                        <span>Rimanente da Rateizzare: ${formatCurrency(plan.residuo_rateizzato)}</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:0.5rem;">
                        ${plan.rate.map(ins => `
                            <div style="background:var(--md-surface); border:1px solid var(--md-outline-variant); padding:0.5rem; border-radius:8px; text-align:center;">
                                <div style="font-weight:800; color:var(--ds-teal);">Rata ${ins.numero_rata}: ${formatCurrency(ins.importo)}</div>
                                <div style="font-size:0.75rem; color:var(--md-on-surface-variant);">Scadenza: ${formatDate(ins.data_scadenza)}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            ['#ds-inst-total', '#ds-inst-acconto', '#ds-inst-num', '#ds-inst-start'].forEach(sel => {
                const elField = mEl.querySelector(sel);
                if (elField) elField.addEventListener('input', updatePreview);
            });
            updatePreview();

            mEl.querySelector('#ds-save-inst-btn').addEventListener('click', async () => {
                try {
                    const selPazId = patientPicker.getSelectedPazienteId();
                    if (!selPazId) {
                        showNotification('Seleziona un paziente.', 'error');
                        return;
                    }

                    const total = Number(mEl.querySelector('#ds-inst-total').value) || 0;
                    const acconto = Number(mEl.querySelector('#ds-inst-acconto').value) || 0;
                    const num = Number(mEl.querySelector('#ds-inst-num').value) || 1;
                    const startDate = mEl.querySelector('#ds-inst-start').value;
                    const note = mEl.querySelector('[name=note]').value;

                    const res = await callApi('rate:creaPiano', {
                        paziente_id: selPazId,
                        preventivo_id: preventivo ? preventivo.id : null,
                        totale_piano: total,
                        acconto_iniziale: acconto,
                        numero_rate: num,
                        data_decorrenza: startDate,
                        note: note
                    });

                    if (res && res.success) {
                        close();
                        if (typeof onCreated === 'function') onCreated(res.data);
                    } else {
                        showNotification(res.error || 'Errore nella creazione del piano', 'error');
                    }
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            });
        }
    } catch (e) {}
}
