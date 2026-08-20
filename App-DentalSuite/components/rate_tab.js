import { callApi } from '../shared/api.js';
import { formatCurrency, formatDate, showNotification } from '../shared/ui_kit.js';
import { openNotificationModal } from './notification_modal.js';

export function renderRateTab(container, { paziente, rateList = [], onUpdated }) {
    try {
        let isPlanFormOpen = false;

        function renderView() {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1.2rem;">
                    
                    ${isPlanFormOpen ? `
                        <div class="ds-panel fade-in-up" style="border:1.5px solid var(--ds-teal);">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">calculate</span>Nuovo Piano di Rateizzazione Personalizzato</div>
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-close-rate-form"><span class="material-symbols-rounded">close</span>Chiudi</button>
                            </div>

                            <form id="ds-form-rate-inpage">
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Importo Totale da Rateizzare (€) *</label>
                                        <input type="number" step="0.01" name="totale" id="ds-inp-rate-tot" class="ds-input" required placeholder="0.00" value="1200.00">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Acconto Versato Subito (€)</label>
                                        <input type="number" step="0.01" name="acconto" id="ds-inp-rate-acc" class="ds-input" placeholder="0.00" value="200.00">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Numero di Rate Mensili *</label>
                                        <input type="number" min="1" max="48" name="numero_rate" id="ds-inp-rate-num" class="ds-input" required value="5">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Data di Scadenza Prima Rata *</label>
                                        <input type="date" name="data_prima_rata" class="ds-input" required value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <div style="padding:1rem 1.2rem; background:var(--md-surface-container-low); border:1px solid var(--ds-teal); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                                            <div>Importo Residuo Rateizzato: <strong id="ds-sim-rate-res">1.000,00 €</strong></div>
                                            <div>Importo Singola Rata Mensile: <strong id="ds-sim-rate-singola" style="color:var(--ds-teal); font-size:1.1rem; font-weight:800;">200,00 € / mese</strong></div>
                                        </div>
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1; display:flex; justify-content:flex-end; gap:0.8rem; margin-top:0.5rem;">
                                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-cancel-rate-btn">Annulla</button>
                                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-rate-btn" style="padding:0.75rem 1.6rem;">
                                            <span class="material-symbols-rounded">check_circle</span>Genera Scadenziario Rateale
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ` : ''}

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">credit_card</span>Piani di Rateizzazione & Scadenziario</div>
                            ${!isPlanFormOpen ? `
                                <button class="ds-btn ds-btn-primary" id="ds-btn-open-rate-form">
                                    <span class="material-symbols-rounded">add_circle</span>Nuovo Piano Rateale
                                </button>
                            ` : ''}
                        </div>

                        <div class="ds-table-wrap">
                            <table class="ds-table">
                                <thead>
                                    <tr>
                                        <th>Rata n°</th>
                                        <th>Importo Scadenza</th>
                                        <th>Data Scadenza</th>
                                        <th>Stato Rata</th>
                                        <th>Data Effettiva Pagamento</th>
                                        <th>Metodo Pagamento</th>
                                        <th style="text-align:right;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rateList.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessuna rata attiva per questo paziente.</td></tr>' : rateList.map(r => `
                                        <tr>
                                            <td><strong>Rata #${r.numero_rata}</strong></td>
                                            <td style="font-weight:800; color:var(--ds-teal); font-size:0.95rem;">${formatCurrency(r.importo)}</td>
                                            <td>${formatDate(r.data_scadenza)}</td>
                                            <td><span class="ds-badge ds-badge-${r.stato === 'pagata' ? 'green' : 'amber'}">${r.stato.toUpperCase()}</span></td>
                                            <td>${r.data_pagamento ? formatDate(r.data_pagamento) : '-'}</td>
                                            <td>${r.metodo_pagamento ? `<span class="ds-badge ds-badge-teal">${r.metodo_pagamento.toUpperCase()}</span>` : '-'}</td>
                                            <td style="text-align:right;">
                                                <div style="display:inline-flex; gap:0.4rem;">
                                                    ${r.stato !== 'pagata' ? `
                                                        <button class="ds-btn ds-btn-primary ds-paga-rata" data-id="${r.id}" style="padding:0.35rem 0.65rem; font-size:0.8rem;">
                                                            <span class="material-symbols-rounded" style="font-size:1rem;">check_circle</span> Salda
                                                        </button>
                                                    ` : ''}
                                                    <button class="ds-btn ds-btn-ghost ds-notify-rata" data-id="${r.id}" title="Invia Promemoria Scadenza WhatsApp" style="padding:0.35rem 0.6rem; color:var(--ds-green);">
                                                        <span class="material-symbols-rounded" style="font-size:1.1rem;">chat</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            `;

            container.querySelector('#ds-btn-open-rate-form')?.addEventListener('click', () => {
                isPlanFormOpen = true;
                renderView();
            });

            const closeRateForm = () => { isPlanFormOpen = false; renderView(); };
            container.querySelector('#ds-close-rate-form')?.addEventListener('click', closeRateForm);
            container.querySelector('#ds-cancel-rate-btn')?.addEventListener('click', closeRateForm);

            function updateRateSim() {
                const form = container.querySelector('#ds-form-rate-inpage');
                if (!form) return;
                const tot = Number(form.querySelector('#ds-inp-rate-tot')?.value) || 0;
                const acc = Number(form.querySelector('#ds-inp-rate-acc')?.value) || 0;
                const num = Number(form.querySelector('#ds-inp-rate-num')?.value) || 1;
                const res = Math.max(0, tot - acc);
                const singola = num > 0 ? (res / num) : 0;

                const elRes = container.querySelector('#ds-sim-rate-res');
                const elSingola = container.querySelector('#ds-sim-rate-singola');
                if (elRes) elRes.innerText = formatCurrency(res);
                if (elSingola) elSingola.innerText = `${formatCurrency(singola)} / mese`;
            }

            ['#ds-inp-rate-tot', '#ds-inp-rate-acc', '#ds-inp-rate-num'].forEach(sel => {
                const inp = container.querySelector(sel);
                if (inp) inp.addEventListener('input', updateRateSim);
            });

            container.querySelector('#ds-save-rate-btn')?.addEventListener('click', async () => {
                try {
                    const form = container.querySelector('#ds-form-rate-inpage');
                    const tot = Number(form.querySelector('[name=totale]')?.value) || 0;
                    const num = Number(form.querySelector('[name=numero_rate]')?.value) || 1;
                    const dataPrima = form.querySelector('[name=data_prima_rata]')?.value;

                    if (!tot || tot <= 0) {
                        showNotification('Inserisci un importo totale valido.', 'danger');
                        return;
                    }

                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());
                    payload.paziente_id = paziente.id;

                    const res = await callApi('rate:creaPiano', payload);
                    if (res && res.success) {
                        showNotification('Piano di rateizzazione generato con successo!', 'success');
                        isPlanFormOpen = false;
                        if (typeof onUpdated === 'function') onUpdated();
                    } else {
                        showNotification(res.error || 'Errore generazione piano rateale', 'danger');
                    }
                } catch (err) {
                    showNotification(err.message, 'danger');
                }
            });

            container.querySelectorAll('.ds-paga-rata').forEach(b => {
                b.addEventListener('click', async () => {
                    const res = await callApi('rate:pagaRata', { rata_id: b.dataset.id, metodo_pagamento: 'pos' });
                    if (res && res.success) {
                        showNotification('Rata saldata con successo!', 'success');
                        if (typeof onUpdated === 'function') onUpdated();
                    }
                });
            });

            container.querySelectorAll('.ds-notify-rata').forEach(b => {
                b.addEventListener('click', () => {
                    const r = rateList.find(item => item.id === b.dataset.id);
                    if (r) openNotificationModal({ paziente, rata: r });
                });
            });
        }

        renderView();

    } catch (e) {
        container.innerHTML = `<p style="color:var(--md-error);">Errore: ${e.message}</p>`;
    }
}
