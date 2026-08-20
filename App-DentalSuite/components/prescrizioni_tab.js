import { callApi } from '../shared/api.js';
import { formatDate, showNotification } from '../shared/ui_kit.js';

export function renderPrescrizioniTab(container, { pazienteId, prescrizioni = [], allStaff = [], onUpdated }) {
    try {
        let isFormOpen = false;

        function renderView() {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1.2rem;">
                    
                    ${isFormOpen ? `
                        <div class="ds-panel fade-in-up" style="border:1.5px solid var(--ds-teal);">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">prescriptions</span>Nuova Ricetta & Prescrizione Farmaceutica</div>
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-close-prescr-form"><span class="material-symbols-rounded">close</span>Chiudi</button>
                            </div>

                            <form id="ds-form-prescr-inpage">
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Nome Commerciale Farmaco *</label>
                                        <input type="text" name="farmaco" id="ds-inp-p-farmaco" class="ds-input" required placeholder="Es. Augmentin, Zimox, Oki, Brufen, Aulin, Curasept...">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Principio Attivo / Molecola</label>
                                        <input type="text" name="principio_attivo" class="ds-input" placeholder="Es. Amoxicillina + Ac. Clavulanico, Ketoprofene...">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Dosaggio & Confezione</label>
                                        <input type="text" name="dosaggio" class="ds-input" placeholder="Es. 1g compresse, 80mg bustine, 0.20% collutorio...">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Durata Trattamento (Giorni)</label>
                                        <input type="number" name="durata_giorni" class="ds-input" value="6">
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Posologia & Istruzioni Assunzione *</label>
                                        <input type="text" name="posologia" class="ds-input" required placeholder="Es. 1 compressa ogni 12 ore a stomaco pieno per 6 giorni">
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1; display:flex; justify-content:flex-end; gap:0.8rem; margin-top:0.5rem;">
                                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-cancel-prescr-btn">Annulla</button>
                                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-prescr-btn" style="padding:0.75rem 1.6rem;">
                                            <span class="material-symbols-rounded">check_circle</span>Emetti Prescrizione
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ` : ''}

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">prescriptions</span>Ricettario Farmaceutico Paziente</div>
                            ${!isFormOpen ? `
                                <button class="ds-btn ds-btn-primary" id="ds-btn-open-prescr-form">
                                    <span class="material-symbols-rounded">add_circle</span>Nuova Prescrizione
                                </button>
                            ` : ''}
                        </div>

                        <div class="ds-table-wrap">
                            <table class="ds-table">
                                <thead>
                                    <tr>
                                        <th>Data Prescrizione</th>
                                        <th>Farmaco & Dosaggio</th>
                                        <th>Principio Attivo</th>
                                        <th>Posologia Indicata</th>
                                        <th>Durata Terapia</th>
                                        <th style="text-align:right;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${prescrizioni.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessuna prescrizione farmacologica registrata.</td></tr>' : prescrizioni.map(pr => `
                                        <tr>
                                            <td><strong>${formatDate(pr.data_prescrizione)}</strong></td>
                                            <td><strong>${pr.farmaco}</strong> ${pr.dosaggio ? `<span class="ds-badge ds-badge-teal" style="font-size:0.75rem;">${pr.dosaggio}</span>` : ''}</td>
                                            <td style="color:var(--md-on-surface-variant);">${pr.principio_attivo || '-'}</td>
                                            <td>${pr.posologia}</td>
                                            <td><span class="ds-badge ds-badge-blue">${pr.durata_giorni || 6} Giorni</span></td>
                                            <td style="text-align:right;">
                                                <button class="ds-btn ds-btn-danger ds-del-prescr" data-id="${pr.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            `;

            container.querySelector('#ds-btn-open-prescr-form')?.addEventListener('click', () => {
                isFormOpen = true;
                renderView();
            });

            const closeForm = () => { isFormOpen = false; renderView(); };
            container.querySelector('#ds-close-prescr-form')?.addEventListener('click', closeForm);
            container.querySelector('#ds-cancel-prescr-btn')?.addEventListener('click', closeForm);

            container.querySelector('#ds-save-prescr-btn')?.addEventListener('click', async () => {
                try {
                    const form = container.querySelector('#ds-form-prescr-inpage');
                    const farmaco = (form.querySelector('[name=farmaco]')?.value || '').trim();
                    const posologia = (form.querySelector('[name=posologia]')?.value || '').trim();

                    if (!farmaco || !posologia) {
                        showNotification('Farmaco e Posologia sono obbligatori.', 'danger');
                        return;
                    }

                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());
                    payload.paziente_id = pazienteId;

                    const res = await callApi('pazienti:addPrescrizione', payload);
                    if (res && res.success) {
                        showNotification('Prescrizione salvata!', 'success');
                        isFormOpen = false;
                        if (typeof onUpdated === 'function') onUpdated();
                    } else {
                        showNotification(res.error || 'Errore salvataggio prescrizione', 'danger');
                    }
                } catch (err) {
                    showNotification(err.message, 'danger');
                }
            });

            container.querySelectorAll('.ds-del-prescr').forEach(b => {
                b.addEventListener('click', async () => {
                    const res = await callApi('pazienti:deletePrescrizione', { id: b.dataset.id });
                    if (res && res.success) {
                        showNotification('Prescrizione rimossa', 'info');
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
