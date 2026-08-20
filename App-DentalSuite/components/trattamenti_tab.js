import { callApi } from '../shared/api.js';
import { renderModal, formatCurrency, formatDate , showNotification } from '../shared/ui_kit.js';

export function renderTrattamentiTab(container, { pazienteId, trattamenti = [], allStaff = [], allPrestazioni = [], onUpdated }) {
    try {
        container.innerHTML = `
            <div class="ds-panel">
                <div class="ds-panel-header">
                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">healing</span>Diario Clinico</div>
                    <button class="ds-btn ds-btn-primary" id="ds-add-trattamento"><span class="material-symbols-rounded">add</span>Registra Trattamento</button>
                </div>

                <div class="ds-table-wrap">
                    <table class="ds-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Prestazione / Descrizione</th>
                                <th>Dente</th>
                                <th>Medico</th>
                                <th>Importo</th>
                                <th>Quota Medico</th>
                                <th>Quota Segreteria</th>
                                <th style="text-align:right;">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trattamenti.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun trattamento registrato.</td></tr>' : trattamenti.map(t => {
                                const med = allStaff.find(s => s.id === t.medico_id);
                                return `
                                    <tr>
                                        <td><strong>${formatDate(t.data_trattamento)}</strong></td>
                                        <td><strong>${t.descrizione}</strong></td>
                                        <td>${t.dente ? `<span class="ds-badge ds-badge-teal">Dente ${t.dente}</span>` : '-'}</td>
                                        <td>${med ? 'Dr. ' + med.cognome : '-'}</td>
                                        <td style="font-weight:700;">${formatCurrency(t.importo)}</td>
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
        `;

        container.querySelector('#ds-add-trattamento').addEventListener('click', () => {
            openTrattamentoModal(pazienteId, allStaff, allPrestazioni, onUpdated);
        });

        container.querySelectorAll('.ds-del-tratt').forEach(b => {
            b.addEventListener('click', async () => {
                if (!confirm('Rimuovere questo trattamento?')) return;
                await callApi('pazienti:deleteTrattamento', { id: b.dataset.id });
                if (typeof onUpdated === 'function') onUpdated();
            });
        });
    } catch (e) {}
}

function openTrattamentoModal(pazienteId, allStaff, allPrestazioni, onUpdated) {
    try {
        const prestOptions = allPrestazioni.map(pr => `<option value="${pr.id}" data-prezzo="${pr.prezzo_paziente}" data-qmed-tipo="${pr.tipo_quota_medico}" data-qmed-val="${pr.valore_quota_medico}" data-qseg-tipo="${pr.tipo_quota_segretaria}" data-qseg-val="${pr.valore_quota_segretaria}" data-cmat="${pr.costo_materiale_stimato}">${pr.nome} (${formatCurrency(pr.prezzo_paziente)})</option>`).join('');
        const staffOptions = allStaff.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('igienista') || s.ruolo.includes('direttore')).map(s => `<option value="${s.id}">Dr. ${s.cognome} ${s.nome}</option>`).join('');
        const segretariaOptions = allStaff.filter(s => s.ruolo.includes('segretaria') || s.ruolo.includes('aso')).map(s => `<option value="${s.id}">${s.cognome} ${s.nome}</option>`).join('');

        const modalHtml = renderModal({
            id: 'ds-modal-trattamento',
            title: 'Registrazione Trattamento Odontoiatrico',
            icon: 'healing',
            bodyHtml: `
                <form id="ds-form-trattamento">
                    <div class="ds-form-grid">
                        <div class="ds-form-field" style="grid-column:1/-1;">
                            <label>Prestazione dal Listino</label>
                            <select name="prestazione_id" id="ds-sel-prestazione" class="ds-select">
                                <option value="">-- Seleziona Prestazione --</option>
                                ${prestOptions}
                            </select>
                        </div>
                        <div class="ds-form-field" style="grid-column:1/-1;">
                            <label>Descrizione Trattamento *</label>
                            <input type="text" name="descrizione" id="ds-tratt-desc" class="ds-input" required placeholder="Es. Otturazione composito molare...">
                        </div>
                        <div class="ds-form-field">
                            <label>Dente (FDI)</label>
                            <input type="number" name="dente" class="ds-input" placeholder="Es. 16, 21, 46...">
                        </div>
                        <div class="ds-form-field">
                            <label>Data</label>
                            <input type="date" name="data_trattamento" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="ds-form-field">
                            <label>Medico Operatore *</label>
                            <select name="medico_id" class="ds-select" required>
                                <option value="">-- Seleziona Medico --</option>
                                ${staffOptions}
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Assistente / Segretaria</label>
                            <select name="segretaria_id" class="ds-select">
                                <option value="">-- Nessuna --</option>
                                ${segretariaOptions}
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Importo (€) *</label>
                            <input type="number" step="0.01" name="importo" id="ds-tratt-importo" class="ds-input" required value="0.00">
                        </div>
                        <div class="ds-form-field">
                            <label>Quota Medico (€)</label>
                            <input type="number" step="0.01" name="quota_medico" id="ds-tratt-qmed" class="ds-input" value="0.00">
                        </div>
                        <div class="ds-form-field">
                            <label>Quota Segretaria/ASO (€)</label>
                            <input type="number" step="0.01" name="quota_segretaria" id="ds-tratt-qseg" class="ds-input" value="0.00">
                        </div>
                        <div class="ds-form-field">
                            <label>Costo Materiali (€)</label>
                            <input type="number" step="0.01" name="costo_materiali" id="ds-tratt-cmat" class="ds-input" value="0.00">
                        </div>
                    </div>
                </form>
            `,
            footerHtml: `
                <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                <button type="button" class="ds-btn ds-btn-primary" id="ds-save-tratt"><span class="material-symbols-rounded">save</span>Salva Trattamento</button>
            `
        });

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const mEl = modalContainer.querySelector('#ds-modal-trattamento');
        mEl.style.display = 'flex';

        const close = () => { modalContainer.remove(); };
        mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

        const selPrest = mEl.querySelector('#ds-sel-prestazione');
        if (selPrest) {
            selPrest.addEventListener('change', () => {
                const opt = selPrest.selectedOptions[0];
                if (opt && opt.value) {
                    const prezzo = Number(opt.dataset.prezzo) || 0;
                    const qMedTipo = opt.dataset.qmedTipo;
                    const qMedVal = Number(opt.dataset.qmedVal) || 0;
                    const qSegTipo = opt.dataset.qsegTipo;
                    const qSegVal = Number(opt.dataset.qsegVal) || 0;
                    const cmat = Number(opt.dataset.cmat) || 0;

                    const qMedComputed = qMedTipo === 'percentuale' ? (prezzo * qMedVal / 100) : qMedVal;
                    const qSegComputed = qSegTipo === 'percentuale' ? (prezzo * qSegVal / 100) : qSegVal;

                    mEl.querySelector('#ds-tratt-desc').value = opt.textContent.split(' (')[0];
                    mEl.querySelector('#ds-tratt-importo').value = prezzo.toFixed(2);
                    mEl.querySelector('#ds-tratt-qmed').value = qMedComputed.toFixed(2);
                    mEl.querySelector('#ds-tratt-qseg').value = qSegComputed.toFixed(2);
                    mEl.querySelector('#ds-tratt-cmat').value = cmat.toFixed(2);
                }
            });
        }

        mEl.querySelector('#ds-save-tratt').addEventListener('click', async () => {
            const form = mEl.querySelector('#ds-form-trattamento');
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            payload.paziente_id = pazienteId;
            const res = await callApi('pazienti:addTrattamento', payload);
            if (res && res.success) {
                close();
                if (typeof onUpdated === 'function') onUpdated();
            } else {
                showNotification(res.error || 'Errore', 'error');
            }
        });
    } catch (e) {}
}
