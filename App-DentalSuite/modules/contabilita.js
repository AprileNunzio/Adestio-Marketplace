import { callApi } from '../shared/api.js';
import { renderHero, renderModal, formatCurrency, formatDate } from '../shared/ui_kit.js';
import { openInstallmentPlanModal } from '../components/installment_modal.js';
import { openNotificationModal } from '../components/notification_modal.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Contabilità Studio...</p></div>';

            const [incRes, speseRes, prevRes, pazRes] = await Promise.all([
                callApi('contabilita:getIncassi'),
                callApi('contabilita:getSpese'),
                callApi('contabilita:getPreventivi'),
                callApi('pazienti:getAll')
            ]);

            const incassi = (incRes && incRes.success) ? incRes.data : [];
            const spese = (speseRes && speseRes.success) ? speseRes.data : [];
            const preventivi = (prevRes && prevRes.success) ? prevRes.data : [];
            const pazienti = (pazRes && pazRes.success) ? pazRes.data : [];

            let subTab = 'incassi';

            function renderScreen() {
                const totInc = incassi.reduce((a, b) => a + (Number(b.importo) || 0), 0);
                const totSpese = spese.reduce((a, b) => a + (Number(b.importo) || 0), 0);
                const bilancio = totInc - totSpese;

                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: 'Contabilità Studio & Incassi Pazienti',
                            subtitle: 'Ricevute sanitarie, rateizzazioni, acconti, acquisto materiali dentali e spese di gestione.',
                            icon: 'account_balance_wallet',
                            actionsHtml: `
                                <button class="ds-btn ds-btn-hero" id="ds-btn-new-incasso"><span class="material-symbols-rounded">add_card</span>Emetti Ricevuta / Acconto</button>
                                <button class="ds-btn ds-btn-hero" id="ds-btn-new-plan"><span class="material-symbols-rounded">credit_card</span>Nuovo Piano Rateale</button>
                                <button class="ds-btn ds-btn-hero" id="ds-btn-new-spesa"><span class="material-symbols-rounded">shopping_cart</span>Registra Spesa</button>
                            `
                        })}

                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                            <div class="ds-nav">
                                <button class="ds-nav-btn ${subTab === 'incassi' ? 'active' : ''}" data-sub="incassi"><span class="material-symbols-rounded">payments</span>Incassi & Ricevute (${incassi.length})</button>
                                <button class="ds-nav-btn ${subTab === 'preventivi' ? 'active' : ''}" data-sub="preventivi"><span class="material-symbols-rounded">request_quote</span>Preventivi (${preventivi.length})</button>
                                <button class="ds-nav-btn ${subTab === 'spese' ? 'active' : ''}" data-sub="spese"><span class="material-symbols-rounded">shopping_bag</span>Spese & Uscite Studio (${spese.length})</button>
                            </div>
                            <div style="display:flex; gap:0.6rem; align-items:center;">
                                <span class="ds-badge ds-badge-green">Entrate: ${formatCurrency(totInc)}</span>
                                <span class="ds-badge ds-badge-rose">Uscite: ${formatCurrency(totSpese)}</span>
                                <span class="ds-badge ${bilancio >= 0 ? 'ds-badge-teal' : 'ds-badge-amber'}">Flusso di Cassa: ${formatCurrency(bilancio)}</span>
                            </div>
                        </div>

                        <div id="ds-contab-content"></div>
                    </div>
                `;

                el.querySelectorAll('.ds-nav-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        subTab = btn.dataset.sub;
                        renderScreen();
                    });
                });

                el.querySelector('#ds-btn-new-incasso').addEventListener('click', () => openIncassoModal());
                el.querySelector('#ds-btn-new-spesa').addEventListener('click', () => openSpesaModal());
                el.querySelector('#ds-btn-new-plan').addEventListener('click', () => {
                    if (pazienti.length === 0) { alert('Nessun paziente presente.'); return; }
                    openInstallmentPlanModal({
                        pazienteId: pazienti[0].id,
                        onCreated: () => renderScreen()
                    });
                });

                const contentEl = el.querySelector('#ds-contab-content');

                if (subTab === 'incassi') {
                    contentEl.innerHTML = `
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">payments</span>Registro Ricevute Sanitarie & Incassi</div>
                            </div>
                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Numero Documento</th>
                                            <th>Data</th>
                                            <th>Paziente</th>
                                            <th>Tipo Documento</th>
                                            <th>Metodo</th>
                                            <th>Importo Incassato</th>
                                            <th>Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${incassi.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessun incasso registrato.</td></tr>' : incassi.map(inc => `
                                            <tr>
                                                <td><strong style="color:var(--ds-teal);">${inc.numero_documento}</strong></td>
                                                <td>${formatDate(inc.data_pagamento)}</td>
                                                <td><strong>${inc.paziente_cognome || ''} ${inc.paziente_nome || ''}</strong><br><small style="color:var(--md-on-surface-variant);">${inc.paziente_cf || ''}</small></td>
                                                <td><span class="ds-badge ds-badge-${inc.tipo_documento === 'acconto' ? 'blue' : (inc.tipo_documento === 'rata' ? 'purple' : 'teal')}">${inc.tipo_documento.toUpperCase()}</span></td>
                                                <td><span class="ds-badge ds-badge-teal">${inc.metodo_pagamento.toUpperCase()}</span></td>
                                                <td style="font-weight:800; color:var(--ds-green); font-size:0.95rem;">${formatCurrency(inc.importo)}</td>
                                                <td style="color:var(--md-on-surface-variant);">${inc.note || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                } else if (subTab === 'preventivi') {
                    contentEl.innerHTML = `
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">request_quote</span>Piani di Cura e Preventivi Pazienti</div>
                            </div>
                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Numero Preventivo</th>
                                            <th>Data Emissione</th>
                                            <th>Paziente</th>
                                            <th>Medico Referente</th>
                                            <th>Stato</th>
                                            <th>Totale Netto</th>
                                            <th style="text-align:right;">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${preventivi.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessun preventivo registrato.</td></tr>' : preventivi.map(pr => `
                                            <tr>
                                                <td><strong style="color:var(--ds-blue);">${pr.numero_preventivo}</strong></td>
                                                <td>${formatDate(pr.data_emissione)}</td>
                                                <td><strong>${pr.paziente_cognome || ''} ${pr.paziente_nome || ''}</strong></td>
                                                <td>${pr.medico_cognome ? 'Dr. ' + pr.medico_cognome : '-'}</td>
                                                <td><span class="ds-badge ds-badge-${pr.stato === 'accettato' ? 'green' : (pr.stato === 'bozza' ? 'amber' : 'rose')}">${pr.stato.toUpperCase()}</span></td>
                                                <td style="font-weight:800; font-size:0.95rem;">${formatCurrency(pr.totale_netto)}</td>
                                                <td style="text-align:right;">
                                                    <button class="ds-btn ds-btn-primary ds-rateizza-prev" data-id="${pr.id}" style="padding:0.35rem 0.6rem; font-size:0.8rem;"><span class="material-symbols-rounded" style="font-size:1rem;">credit_card</span> Rateizza</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;

                    contentEl.querySelectorAll('.ds-rateizza-prev').forEach(b => {
                        b.addEventListener('click', () => {
                            const pr = preventivi.find(p => p.id === b.dataset.id);
                            if (pr) {
                                openInstallmentPlanModal({
                                    pazienteId: pr.paziente_id,
                                    preventivo: pr,
                                    onCreated: () => renderScreen()
                                });
                            }
                        });
                    });
                } else if (subTab === 'spese') {
                    contentEl.innerHTML = `
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">shopping_bag</span>Registro Uscite e Spese di Gestione Studio</div>
                            </div>
                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Categoria</th>
                                            <th>Descrizione</th>
                                            <th>Fornitore / Fattura</th>
                                            <th>Metodo</th>
                                            <th>Importo</th>
                                            <th style="text-align:right;">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${spese.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessuna spesa registrata.</td></tr>' : spese.map(sp => `
                                            <tr>
                                                <td>${formatDate(sp.data_spesa)}</td>
                                                <td><span class="ds-badge ds-badge-amber">${sp.categoria.replace(/_/g, ' ').toUpperCase()}</span></td>
                                                <td><strong>${sp.descrizione}</strong></td>
                                                <td>${sp.fornitore || '-'}${sp.numero_fattura ? ` (Ft. ${sp.numero_fattura})` : ''}</td>
                                                <td>${sp.metodo_pagamento.toUpperCase()}</td>
                                                <td style="font-weight:800; color:var(--ds-rose); font-size:0.95rem;">${formatCurrency(sp.importo)}</td>
                                                <td style="text-align:right;">
                                                    <button class="ds-btn ds-btn-danger ds-del-spesa" data-id="${sp.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;

                    contentEl.querySelectorAll('.ds-del-spesa').forEach(b => {
                        b.addEventListener('click', async () => {
                            if (!confirm('Rimuovere questa spesa?')) return;
                            await callApi('contabilita:deleteSpesa', { id: b.dataset.id });
                            renderScreen();
                        });
                    });
                }
            }

            renderScreen();

            function openIncassoModal() {
                const pazOptions = pazienti.map(p => `<option value="${p.id}">${p.cognome} ${p.nome} (${p.codice_fiscale || ''})</option>`).join('');

                const modalHtml = renderModal({
                    id: 'ds-modal-incasso',
                    title: 'Emissione Ricevuta / Acconto Paziente',
                    icon: 'add_card',
                    bodyHtml: `
                        <form id="ds-form-incasso">
                            <div class="ds-form-grid">
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Paziente *</label>
                                    <select name="paziente_id" class="ds-select" required>
                                        <option value="">-- Seleziona Paziente --</option>
                                        ${pazOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Importo (€) *</label>
                                    <input type="number" step="0.01" name="importo" class="ds-input" required placeholder="0.00">
                                </div>
                                <div class="ds-form-field">
                                    <label>Metodo di Pagamento *</label>
                                    <select name="metodo_pagamento" class="ds-select">
                                        <option value="pos">POS / Carta di Credito / Bancomat</option>
                                        <option value="bonifico">Bonifico Bancario</option>
                                        <option value="contanti">Contanti</option>
                                        <option value="assegno">Assegno</option>
                                        <option value="finanziamento">Finanziamento Sanitario</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Tipo Documento</label>
                                    <select name="tipo_documento" class="ds-select">
                                        <option value="ricevuta_sanitaria">Ricevuta Sanitaria</option>
                                        <option value="acconto">Acconto / Anticipo</option>
                                        <option value="saldo">Saldo Finale</option>
                                        <option value="fattura">Fattura Fiscale</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Data Pagamento</label>
                                    <input type="date" name="data_pagamento" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Note Ricevuta</label>
                                    <input type="text" name="note" class="ds-input" placeholder="Es. Acconto su preventivo, Prima seduta...">
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-incasso-btn"><span class="material-symbols-rounded">save</span>Conferma Incasso</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-incasso');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-incasso-btn').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-incasso');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        const res = await callApi('contabilita:registraIncasso', payload);
                        if (res && res.success) {
                            close();
                            renderScreen();
                        } else {
                            alert(res.error || 'Errore');
                        }
                    } catch (err) {
                        alert(err.message);
                    }
                });
            }

            function openSpesaModal() {
                const modalHtml = renderModal({
                    id: 'ds-modal-spesa',
                    title: 'Registrazione Spesa / Uscita Studio',
                    icon: 'shopping_cart',
                    bodyHtml: `
                        <form id="ds-form-spesa">
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Categoria Spesa *</label>
                                    <select name="categoria" class="ds-select" required>
                                        <option value="materiali_dentali">Materiali di Consumo & Impianti</option>
                                        <option value="laboratorio_odontotecnico">Laboratorio Odontotecnico</option>
                                        <option value="manutenzione_riuniti">Manutenzione Riuniti & Attrezzature</option>
                                        <option value="utenze">Utenze (Luce, Gas, Telefono)</option>
                                        <option value="affitto">Canone di Locazione</option>
                                        <option value="software">Software & Licenze Sanitarie</option>
                                        <option value="assicurazione_rc">Assicurazione RC Professionale</option>
                                        <option value="consulenze">Consulenze Fiscali / Legali</option>
                                        <option value="varie">Spese Varie</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Importo Spesa (€) *</label>
                                    <input type="number" step="0.01" name="importo" class="ds-input" required placeholder="0.00">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Descrizione Spesa *</label>
                                    <input type="text" name="descrizione" class="ds-input" required placeholder="Es. Fornitura impianti, Compositi...">
                                </div>
                                <div class="ds-form-field">
                                    <label>Fornitore</label>
                                    <input type="text" name="fornitore" class="ds-input" placeholder="Es. DentalStore Srl...">
                                </div>
                                <div class="ds-form-field">
                                    <label>Numero Fattura</label>
                                    <input type="text" name="numero_fattura" class="ds-input">
                                </div>
                                <div class="ds-form-field">
                                    <label>Data Pagamento</label>
                                    <input type="date" name="data_spesa" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Metodo di Pagamento</label>
                                    <select name="metodo_pagamento" class="ds-select">
                                        <option value="bonifico">Bonifico</option>
                                        <option value="carta">Carta di Credito</option>
                                        <option value="riba">RiBa</option>
                                        <option value="contanti">Cassa Contanti</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-spesa-btn"><span class="material-symbols-rounded">save</span>Registra Spesa</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-spesa');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-spesa-btn').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-spesa');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        const res = await callApi('contabilita:registraSpesa', payload);
                        if (res && res.success) {
                            close();
                            renderScreen();
                        } else {
                            alert(res.error || 'Errore');
                        }
                    } catch (err) {
                        alert(err.message);
                    }
                });
            }

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
