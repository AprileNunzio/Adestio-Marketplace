import { callApi } from '../shared/api.js';
import { renderModal, formatDate , showNotification } from '../shared/ui_kit.js';

export function renderPrescrizioniTab(container, { pazienteId, prescrizioni = [], allStaff = [], onUpdated }) {
    try {
        container.innerHTML = `
            <div class="ds-panel">
                <div class="ds-panel-header">
                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">prescriptions</span>Ricettario Farmaceutico</div>
                    <button class="ds-btn ds-btn-primary" id="ds-add-prescrizione"><span class="material-symbols-rounded">add</span>Nuova Prescrizione</button>
                </div>

                <div class="ds-table-wrap">
                    <table class="ds-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Farmaco</th>
                                <th>Posologia</th>
                                <th>Durata</th>
                                <th style="text-align:right;">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prescrizioni.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessuna prescrizione registrata.</td></tr>' : prescrizioni.map(pr => `
                                <tr>
                                    <td><strong>${formatDate(pr.data_prescrizione)}</strong></td>
                                    <td><strong>${pr.farmaco}</strong> ${pr.dosaggio ? `(${pr.dosaggio})` : ''}</td>
                                    <td>${pr.posologia}</td>
                                    <td>${pr.durata_giorni} giorni</td>
                                    <td style="text-align:right;">
                                        <button class="ds-btn ds-btn-danger ds-del-prescr" data-id="${pr.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.querySelector('#ds-add-prescrizione').addEventListener('click', () => {
            openPrescrizioneModal(pazienteId, allStaff, onUpdated);
        });

        container.querySelectorAll('.ds-del-prescr').forEach(b => {
            b.addEventListener('click', async () => {
                if (!confirm('Rimuovere questa prescrizione?')) return;
                await callApi('pazienti:deletePrescrizione', { id: b.dataset.id });
                if (typeof onUpdated === 'function') onUpdated();
            });
        });
    } catch (e) {}
}

function openPrescrizioneModal(pazienteId, allStaff, onUpdated) {
    try {
        const staffOptions = allStaff.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('direttore')).map(s => `<option value="${s.id}">Dr. ${s.cognome} ${s.nome}</option>`).join('');

        const modalHtml = renderModal({
            id: 'ds-modal-prescrizione',
            title: 'Nuova Prescrizione Farmaceutica',
            icon: 'prescriptions',
            bodyHtml: `
                <form id="ds-form-prescrizione">
                    <div class="ds-form-grid">
                        <div class="ds-form-field">
                            <label>Farmaco *</label>
                            <input type="text" name="farmaco" class="ds-input" required placeholder="Es. Augmentin, Oki, Curasept...">
                        </div>
                        <div class="ds-form-field">
                            <label>Principio Attivo</label>
                            <input type="text" name="principio_attivo" class="ds-input">
                        </div>
                        <div class="ds-form-field">
                            <label>Dosaggio</label>
                            <input type="text" name="dosaggio" class="ds-input">
                        </div>
                        <div class="ds-form-field">
                            <label>Durata (Giorni)</label>
                            <input type="number" name="durata_giorni" class="ds-input" value="6">
                        </div>
                        <div class="ds-form-field" style="grid-column:1/-1;">
                            <label>Posologia *</label>
                            <input type="text" name="posologia" class="ds-input" required placeholder="Es. 1 compressa ogni 12 ore a stomaco pieno">
                        </div>
                    </div>
                </form>
            `,
            footerHtml: `
                <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                <button type="button" class="ds-btn ds-btn-primary" id="ds-save-prescr"><span class="material-symbols-rounded">save</span>Salva Prescrizione</button>
            `
        });

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const mEl = modalContainer.querySelector('#ds-modal-prescrizione');
        mEl.style.display = 'flex';

        const close = () => { modalContainer.remove(); };
        mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

        mEl.querySelector('#ds-save-prescr').addEventListener('click', async () => {
            const form = mEl.querySelector('#ds-form-prescrizione');
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            payload.paziente_id = pazienteId;
            const res = await callApi('pazienti:addPrescrizione', payload);
            if (res && res.success) {
                close();
                if (typeof onUpdated === 'function') onUpdated();
            } else {
                showNotification(res.error || 'Errore', 'error');
            }
        });
    } catch (e) {}
}
