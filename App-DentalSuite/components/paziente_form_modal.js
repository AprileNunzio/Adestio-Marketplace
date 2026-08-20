import { callApi } from '../shared/api.js';
import { renderModal , showNotification } from '../shared/ui_kit.js';

export function openPazienteFormModal({ paziente = null, onSaved }) {
    try {
        const isEdit = !!paziente;
        const modalHtml = renderModal({
            id: 'ds-modal-paziente',
            title: isEdit ? 'Modifica Dati Paziente' : 'Nuovo Paziente Odontoiatrico',
            icon: isEdit ? 'edit' : 'person_add',
            bodyHtml: `
                <form id="ds-form-paziente">
                    <div class="ds-form-grid">
                        <div class="ds-form-field">
                            <label>Cognome *</label>
                            <input type="text" name="cognome" class="ds-input" required value="${paziente ? paziente.cognome : ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Nome *</label>
                            <input type="text" name="nome" class="ds-input" required value="${paziente ? paziente.nome : ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Codice Fiscale *</label>
                            <input type="text" name="codice_fiscale" class="ds-input" required maxlength="16" style="text-transform:uppercase;" value="${paziente ? paziente.codice_fiscale : ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Data di Nascita</label>
                            <input type="date" name="data_nascita" class="ds-input" value="${paziente ? paziente.data_nascita : ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Telefono / Cellulare</label>
                            <input type="text" name="telefono" class="ds-input" value="${paziente ? paziente.telefono : ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Email</label>
                            <input type="email" name="email" class="ds-input" value="${paziente ? paziente.email : ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Città</label>
                            <input type="text" name="citta" class="ds-input" value="${paziente ? paziente.citta : ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Fondo Sanitario / Assicurazione</label>
                            <input type="text" name="assicurazione" class="ds-input" placeholder="Es. Unisalute, Metasalute..." value="${paziente ? paziente.assicurazione : ''}">
                        </div>
                        <div class="ds-form-field" style="grid-column: 1/-1;">
                            <label>Indirizzo</label>
                            <input type="text" name="indirizzo" class="ds-input" value="${paziente ? paziente.indirizzo : ''}">
                        </div>
                        <div class="ds-form-field" style="grid-column: 1/-1;">
                            <label>Note</label>
                            <textarea name="note" class="ds-textarea" rows="2">${paziente ? paziente.note : ''}</textarea>
                        </div>
                    </div>
                </form>
            `,
            footerHtml: `
                <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                <button type="button" class="ds-btn ds-btn-primary" id="ds-modal-save-paziente"><span class="material-symbols-rounded">save</span>Salva Paziente</button>
            `
        });

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const mEl = modalContainer.querySelector('#ds-modal-paziente');
        mEl.style.display = 'flex';

        const close = () => { modalContainer.remove(); };
        mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

        mEl.querySelector('#ds-modal-save-paziente').addEventListener('click', async () => {
            try {
                const form = mEl.querySelector('#ds-form-paziente');
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());
                if (isEdit) payload.id = paziente.id;

                const action = isEdit ? 'pazienti:update' : 'pazienti:create';
                const pRes = await callApi(action, payload);
                if (pRes && pRes.success) {
                    close();
                    if (typeof onSaved === 'function') onSaved(isEdit ? paziente.id : (pRes.data && pRes.data.id));
                } else {
                    showNotification(pRes.error || 'Errore', 'error');
                }
            } catch (err) {
                showNotification(err.message, 'error');
            }
        });
    } catch (e) {}
}
