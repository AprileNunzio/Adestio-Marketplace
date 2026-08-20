import { callApi } from '../shared/api.js';
import { formatCurrency, formatDate, showNotification } from '../shared/ui_kit.js';

export function renderTrattamentiTab(container, { pazienteId, trattamenti = [], allStaff = [], allPrestazioni = [], onUpdated }) {
    try {
        let isFormOpen = false;

        function renderView() {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1.2rem;">
                    
                    ${isFormOpen ? `
                        <div class="ds-panel fade-in-up" style="border:1.5px solid var(--ds-teal);">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">add_task</span>Nuovo Intervento / Trattamento Clinico</div>
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-close-tratt-form"><span class="material-symbols-rounded">close</span>Chiudi</button>
                            </div>

                            <form id="ds-form-trattamento-inpage">
                                <div class="ds-form-grid">
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Seleziona Prestazione dal Listino</label>
                                        <select name="prestazione_id" id="ds-sel-p-tratt" class="ds-select">
                                            <option value="">-- Seleziona Voce Nomenclatore --</option>
                                            ${allPrestazioni.map(pr => `
                                                <option value="${pr.id}" data-prezzo="${pr.prezzo_paziente}" data-qmed-tipo="${pr.tipo_quota_medico}" data-qmed-val="${pr.valore_quota_medico}" data-qseg-tipo="${pr.tipo_quota_segretaria}" data-qseg-val="${pr.valore_quota_segretaria}" data-cmat="${pr.costo_materiale_stimato}">
                                                    ${pr.nome} (${formatCurrency(pr.prezzo_paziente)})
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>

                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Descrizione / Diario Clinico Intervento *</label>
                                        <input type="text" name="descrizione" id="ds-inp-tratt-desc" class="ds-input" required placeholder="Es. Ricostruzione estetica composito, devitalizzazione canale mesiale...">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Elemento Dentale (FDI)</label>
                                        <input type="number" name="dente" class="ds-input" placeholder="Es. 16, 21, 36...">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Data Esecuzione *</label>
                                        <input type="date" name="data_trattamento" class="ds-input" required value="${new Date().toISOString().split('T')[0]}">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Medico Operatore *</label>
                                        <select name="medico_id" class="ds-select" required>
                                            <option value="">-- Seleziona Medico --</option>
                                            ${allStaff.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('igienista') || s.ruolo.includes('direttore')).map(s => `
                                                <option value="${s.id}">Dr. ${s.cognome} ${s.nome} (${s.ruolo})</option>
                                            `).join('')}
                                        </select>
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Assistente alla Poltrona (ASO) / Segreteria</label>
                                        <select name="segretaria_id" class="ds-select">
                                            <option value="">-- Nessuna / Non assegnata --</option>
                                            ${allStaff.filter(s => s.ruolo.includes('segretaria') || s.ruolo.includes('aso')).map(s => `
                                                <option value="${s.id}">${s.cognome} ${s.nome}</option>
                                            `).join('')}
                                        </select>
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Importo Addebitato (€) *</label>
                                        <input type="number" step="0.01" name="importo" id="ds-inp-tratt-imp" class="ds-input" required value="0.00">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Quota Medico Operatore (€)</label>
                                        <input type="number" step="0.01" name="quota_medico" id="ds-inp-tratt-qmed" class="ds-input" value="0.00">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Incentivo Staff / ASO (€)</label>
                                        <input type="number" step="0.01" name="quota_segretaria" id="ds-inp-tratt-qseg" class="ds-input" value="0.00">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Costi Materiali / Laboratorio (€)</label>
                                        <input type="number" step="0.01" name="costo_materiali" id="ds-inp-tratt-cmat" class="ds-input" value="0.00">
                                    </div>

                                    <div class="ds-form-field" style="grid-column:1/-1; display:flex; justify-content:flex-end; gap:0.8rem; margin-top:0.5rem;">
                                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-cancel-tratt-btn">Annulla</button>
                                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-tratt-btn" style="padding:0.75rem 1.6rem;">
                                            <span class="material-symbols-rounded">check_circle</span>Registra nel Diario Clinico
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ` : ''}

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">healing</span>Diario Clinico Trattamenti</div>
                            ${!isFormOpen ? `
                                <button class="ds-btn ds-btn-primary" id="ds-btn-open-tratt-form">
                                    <span class="material-symbols-rounded">add_circle</span>Registra Nuovo Trattamento
                                </button>
                            ` : ''}
                        </div>

                        <div class="ds-table-wrap">
                            <table class="ds-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Prestazione / Descrizione Clinica</th>
                                        <th>Dente</th>
                                        <th>Medico Operatore</th>
                                        <th>Importo Paziente</th>
                                        <th>Spettanza Medico</th>
                                        <th>Quota Staff</th>
                                        <th style="text-align:right;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${trattamenti.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessun trattamento registrato in cartella clinica.</td></tr>' : trattamenti.map(t => {
                                        const med = allStaff.find(s => s.id === t.medico_id);
                                        return `
                                            <tr>
                                                <td><strong>${formatDate(t.data_trattamento)}</strong></td>
                                                <td><strong>${t.descrizione}</strong></td>
                                                <td>${t.dente ? `<span class="ds-badge ds-badge-teal">Dente #${t.dente}</span>` : '-'}</td>
                                                <td>${med ? 'Dr. ' + med.cognome : '-'}</td>
                                                <td style="font-weight:800; color:var(--md-on-surface); font-size:0.95rem;">${formatCurrency(t.importo)}</td>
                                                <td style="color:var(--ds-blue); font-weight:700;">${formatCurrency(t.quota_medico)}</td>
                                                <td style="color:var(--ds-purple); font-weight:700;">${formatCurrency(t.quota_segretaria)}</td>
                                                <td style="text-align:right;">
                                                    <button class="ds-btn ds-btn-danger ds-del-tratt" data-id="${t.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            `;

            container.querySelector('#ds-btn-open-tratt-form')?.addEventListener('click', () => {
                isFormOpen = true;
                renderView();
            });

            const closeForm = () => { isFormOpen = false; renderView(); };
            container.querySelector('#ds-close-tratt-form')?.addEventListener('click', closeForm);
            container.querySelector('#ds-cancel-tratt-btn')?.addEventListener('click', closeForm);

            const selP = container.querySelector('#ds-sel-p-tratt');
            if (selP) {
                selP.addEventListener('change', () => {
                    const opt = selP.selectedOptions[0];
                    if (opt && opt.value) {
                        const prezzo = Number(opt.dataset.prezzo) || 0;
                        const qMedTipo = opt.dataset.qmedTipo;
                        const qMedVal = Number(opt.dataset.qmedVal) || 0;
                        const qSegTipo = opt.dataset.qsegTipo;
                        const qSegVal = Number(opt.dataset.qsegVal) || 0;
                        const cmat = Number(opt.dataset.cmat) || 0;

                        const qMedComputed = qMedTipo === 'percentuale' ? (prezzo * qMedVal / 100) : qMedVal;
                        const qSegComputed = qSegTipo === 'percentuale' ? (prezzo * qSegVal / 100) : qSegVal;

                        container.querySelector('#ds-inp-tratt-desc').value = opt.textContent.split(' (')[0].trim();
                        container.querySelector('#ds-inp-tratt-imp').value = prezzo.toFixed(2);
                        container.querySelector('#ds-inp-tratt-qmed').value = qMedComputed.toFixed(2);
                        container.querySelector('#ds-inp-tratt-qseg').value = qSegComputed.toFixed(2);
                        container.querySelector('#ds-inp-tratt-cmat').value = cmat.toFixed(2);
                    }
                });
            }

            container.querySelector('#ds-save-tratt-btn')?.addEventListener('click', async () => {
                try {
                    const form = container.querySelector('#ds-form-trattamento-inpage');
                    const desc = (form.querySelector('[name=descrizione]')?.value || '').trim();
                    const medId = form.querySelector('[name=medico_id]')?.value;

                    if (!desc) {
                        showNotification('Inserisci la descrizione del trattamento.', 'danger');
                        return;
                    }
                    if (!medId) {
                        showNotification('Seleziona il Medico Operatore.', 'danger');
                        return;
                    }

                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());
                    payload.paziente_id = pazienteId;

                    const res = await callApi('pazienti:addTrattamento', payload);
                    if (res && res.success) {
                        showNotification('Trattamento registrato nel diario clinico!', 'success');
                        isFormOpen = false;
                        if (typeof onUpdated === 'function') onUpdated();
                    } else {
                        showNotification(res.error || 'Errore salvataggio trattamento', 'danger');
                    }
                } catch (err) {
                    showNotification(err.message, 'danger');
                }
            });

            container.querySelectorAll('.ds-del-tratt').forEach(b => {
                b.addEventListener('click', async () => {
                    const res = await callApi('pazienti:deleteTrattamento', { id: b.dataset.id });
                    if (res && res.success) {
                        showNotification('Trattamento eliminato', 'info');
                        if (typeof onUpdated === 'function') onUpdated();
                    }
                });
            });
        }

        renderView();

    } catch (e) {
        container.innerHTML = `<p style="color:var(--md-error);">Errore: ${e.message}</p>`;
    }
}
