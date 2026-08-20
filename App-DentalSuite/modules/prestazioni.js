import { callApi } from '../shared/api.js';
import { renderHero, renderModal, formatCurrency } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Nomenclatore Prestazioni...</p></div>';

            const res = await callApi('prestazioni:getAll');
            const prestazioni = (res && res.success) ? res.data : [];

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'Listino Prestazioni & Compensi Staff',
                        subtitle: 'Tariffario odontoiatrico, tempi poltrona e regole di compenso per Medico e Segreteria/ASO.',
                        icon: 'list_alt',
                        actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-prest"><span class="material-symbols-rounded">add</span>Nuova Prestazione</button>`
                    })}

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">category</span>Catalogo Trattamenti & Tariffe</div>
                            <span class="ds-badge ds-badge-teal">${prestazioni.length} Prestazioni Attive</span>
                        </div>

                        <div class="ds-table-wrap">
                            <table class="ds-table">
                                <thead>
                                    <tr>
                                        <th>Branca</th>
                                        <th>Codice & Nome Prestazione</th>
                                        <th>Durata</th>
                                        <th>Tariffa Paziente</th>
                                        <th>Quota Medico</th>
                                        <th>Quota Segreteria/ASO</th>
                                        <th>Costo Materiali</th>
                                        <th style="text-align:right;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${prestazioni.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessuna prestazione configurata.</td></tr>' : prestazioni.map(p => `
                                        <tr>
                                            <td><span class="ds-badge ds-badge-teal">${p.branca.toUpperCase()}</span></td>
                                            <td><strong>${p.nome}</strong>${p.descrizione ? `<br><small style="color:var(--md-on-surface-variant);">${p.descrizione}</small>` : ''}</td>
                                            <td>${p.durata_minuti} min</td>
                                            <td style="font-weight:800; color:var(--md-on-surface); font-size:0.95rem;">${formatCurrency(p.prezzo_paziente)}</td>
                                            <td><span class="ds-badge ds-badge-blue">${p.tipo_quota_medico === 'percentuale' ? p.valore_quota_medico + '%' : formatCurrency(p.valore_quota_medico)}</span></td>
                                            <td><span class="ds-badge ds-badge-purple">${p.tipo_quota_segretaria === 'percentuale' ? p.valore_quota_segretaria + '%' : formatCurrency(p.valore_quota_segretaria)}</span></td>
                                            <td style="color:var(--md-on-surface-variant);">${formatCurrency(p.costo_materiale_stimato)}</td>
                                            <td style="text-align:right;">
                                                <button class="ds-btn ds-btn-ghost ds-edit-prest" data-id="${p.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">edit</span></button>
                                                <button class="ds-btn ds-btn-danger ds-del-prest" data-id="${p.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            el.querySelector('#ds-btn-new-prest').addEventListener('click', () => openPrestModal());

            el.querySelectorAll('.ds-edit-prest').forEach(b => {
                b.addEventListener('click', () => {
                    const item = prestazioni.find(p => p.id === b.dataset.id);
                    if (item) openPrestModal(item);
                });
            });

            el.querySelectorAll('.ds-del-prest').forEach(b => {
                b.addEventListener('click', async () => {
                    if (!confirm('Rimuovere questa prestazione dal listino?')) return;
                    await callApi('prestazioni:remove', { id: b.dataset.id });
                    this.render(el, onNavigate);
                });
            });

            function openPrestModal(prest = null) {
                const isEdit = !!prest;
                const modalHtml = renderModal({
                    id: 'ds-modal-prest',
                    title: isEdit ? 'Modifica Prestazione Odontoiatrica' : 'Nuova Prestazione a Listino',
                    icon: isEdit ? 'edit' : 'add',
                    bodyHtml: `
                        <form id="ds-form-prest">
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Branca Odontoiatrica *</label>
                                    <select name="branca" class="ds-select" required>
                                        <option value="igiene" ${prest && prest.branca === 'igiene' ? 'selected' : ''}>Igiene & Prevenzione</option>
                                        <option value="conservativa" ${prest && prest.branca === 'conservativa' ? 'selected' : ''}>Conservativa & Ricostruzioni</option>
                                        <option value="endodonzia" ${prest && prest.branca === 'endodonzia' ? 'selected' : ''}>Endodonzia & Devitalizzazioni</option>
                                        <option value="chirurgia" ${prest && prest.branca === 'chirurgia' ? 'selected' : ''}>Chirurgia Orale & Estrattiva</option>
                                        <option value="implantologia" ${prest && prest.branca === 'implantologia' ? 'selected' : ''}>Implantologia</option>
                                        <option value="protesi" ${prest && prest.branca === 'protesi' ? 'selected' : ''}>Protesi Fissa / Mobile</option>
                                        <option value="ortodonzia" ${prest && prest.branca === 'ortodonzia' ? 'selected' : ''}>Ortodonzia & Gnatologia</option>
                                        <option value="diagnostica" ${prest && prest.branca === 'diagnostica' ? 'selected' : ''}>Diagnostica per Immagini</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Codice Nomenclatore</label>
                                    <input type="text" name="codice" class="ds-input" placeholder="Es. IGI-01, DEV-03..." value="${prest ? prest.codice : ''}">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Nome Prestazione *</label>
                                    <input type="text" name="nome" class="ds-input" required placeholder="Es. Ablazione tartaro con ultrasuoni..." value="${prest ? prest.nome : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Tariffa Paziente (€) *</label>
                                    <input type="number" step="0.01" name="prezzo_paziente" class="ds-input" required value="${prest ? prest.prezzo_paziente : '80.00'}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Durata Stimata (Minuti)</label>
                                    <input type="number" name="durata_minuti" class="ds-input" value="${prest ? prest.durata_minuti : 30}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Tipo Quota Medico</label>
                                    <select name="tipo_quota_medico" class="ds-select">
                                        <option value="fisso" ${prest && prest.tipo_quota_medico === 'fisso' ? 'selected' : ''}>Fisso in Euro (€)</option>
                                        <option value="percentuale" ${prest && prest.tipo_quota_medico === 'percentuale' ? 'selected' : ''}>Percentuale sul prezzo (%)</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Valore Quota Medico</label>
                                    <input type="number" step="0.01" name="valore_quota_medico" class="ds-input" value="${prest ? prest.valore_quota_medico : '20.00'}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Tipo Quota Segreteria/ASO</label>
                                    <select name="tipo_quota_segretaria" class="ds-select">
                                        <option value="fisso" ${prest && prest.tipo_quota_segretaria === 'fisso' ? 'selected' : ''}>Fisso in Euro (€)</option>
                                        <option value="percentuale" ${prest && prest.tipo_quota_segretaria === 'percentuale' ? 'selected' : ''}>Percentuale sul prezzo (%)</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Valore Quota Segreteria/ASO</label>
                                    <input type="number" step="0.01" name="valore_quota_segretaria" class="ds-input" value="${prest ? prest.valore_quota_segretaria : '5.00'}">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Costo Materiali / Laboratorio Odontotecnico (€)</label>
                                    <input type="number" step="0.01" name="costo_materiale_stimato" class="ds-input" value="${prest ? prest.costo_materiale_stimato : '0.00'}">
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-prest-btn"><span class="material-symbols-rounded">save</span>Salva Prestazione</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-prest');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-prest-btn').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-prest');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        if (isEdit) payload.id = prest.id;

                        const action = isEdit ? 'prestazioni:update' : 'prestazioni:create';
                        const pRes = await callApi(action, payload);
                        if (pRes && pRes.success) {
                            close();
                            this.render(el, onNavigate);
                        } else {
                            alert(pRes.error || 'Errore');
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
