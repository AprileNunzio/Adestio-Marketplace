import { callApi } from '../shared/api.js';
import { formatDate, showNotification } from '../shared/ui_kit.js';

export function renderAllegatiTab(container, { pazienteId, allegati = [], onUpdated }) {
    try {
        let isUploadOpen = false;

        function renderView() {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1.2rem;">
                    
                    ${isUploadOpen ? `
                        <div class="ds-panel fade-in-up" style="border:1.5px solid var(--ds-teal);">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">cloud_upload</span>Caricamento Esame Radiologico / Diagnostico</div>
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-close-upload-form"><span class="material-symbols-rounded">close</span>Chiudi</button>
                            </div>

                            <form id="ds-form-upload-inpage">
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Tipo di Indagine / Esame *</label>
                                        <select name="tipo" class="ds-select" id="ds-sel-tipo-esame">
                                            <option value="tac_cbct">TAC Volumetrica Cone Beam 3D (CBCT)</option>
                                            <option value="opt">Ortopanoramica Digitale (OPT)</option>
                                            <option value="rx_endorale">Radiografia Endorale / Bite-Wing</option>
                                            <option value="rmn">Risonanza Magnetica ATM (RMN)</option>
                                            <option value="foto_clinica">Fotografia Intraorale / Extraorale</option>
                                            <option value="referto_pdf">Referto Clinico / Relazione Specialistica PDF</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Titolo / Descrizione Esame *</label>
                                        <input type="text" name="titolo" id="ds-inp-all-titolo" class="ds-input" required placeholder="Es. CBCT Arcata Superiore per Impianto..." value="TAC Cone Beam 3D">
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1; display:flex; justify-content:flex-end; gap:0.8rem; margin-top:0.5rem;">
                                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-cancel-upload-btn">Annulla</button>
                                        <button type="button" class="ds-btn ds-btn-primary" id="ds-start-upload-btn" style="padding:0.75rem 1.6rem;">
                                            <span class="material-symbols-rounded">upload_file</span>Seleziona File & Registra
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ` : ''}

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">perm_media</span>Archivio Diagnostica per Immagini (TAC / OPT / RX)</div>
                            ${!isUploadOpen ? `
                                <button class="ds-btn ds-btn-primary" id="ds-btn-open-upload">
                                    <span class="material-symbols-rounded">cloud_upload</span>Carica Esame Diagnostico
                                </button>
                            ` : ''}
                        </div>

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.2rem;">
                            ${allegati.length === 0 ? '<p style="grid-column:1/-1; color:var(--md-on-surface-variant); text-align:center; padding:2rem;">Nessun esame diagnostico o file allegato a questa cartella clinica.</p>' : allegati.map(al => `
                                <div style="background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:16px; padding:1.2rem; display:flex; flex-direction:column; gap:0.8rem;">
                                    <div style="display:flex; align-items:center; gap:0.8rem;">
                                        <div style="background:linear-gradient(135deg, #0f766e, #0d9488); color:#fff; width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                            <span class="material-symbols-rounded" style="font-size:1.6rem;">${al.tipo.includes('tac') ? 'biotech' : (al.tipo.includes('rmn') ? 'radiology' : 'image')}</span>
                                        </div>
                                        <div style="flex:1; min-width:0;">
                                            <div style="font-weight:800; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${al.titolo}</div>
                                            <div style="font-size:0.75rem; color:var(--md-on-surface-variant); margin-top:0.2rem;">${formatDate(al.data_esame)} • ${(al.file_size / 1024).toFixed(0)} KB</div>
                                        </div>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem; padding-top:0.6rem; border-top:1px solid var(--md-outline-variant);">
                                        <span class="ds-badge ds-badge-teal">${(al.tipo || 'rx').toUpperCase()}</span>
                                        <div style="display:flex; gap:0.4rem;">
                                            <button class="ds-btn ds-btn-ghost ds-open-allegato" data-id="${al.id}" style="padding:0.4rem 0.7rem; font-size:0.82rem;"><span class="material-symbols-rounded" style="font-size:1.1rem;">visibility</span> Apri</button>
                                            <button class="ds-btn ds-btn-danger ds-del-allegato" data-id="${al.id}" style="padding:0.4rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1.1rem;">delete</span></button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                </div>
            `;

            container.querySelector('#ds-btn-open-upload')?.addEventListener('click', () => {
                isUploadOpen = true;
                renderView();
            });

            const closeUpload = () => { isUploadOpen = false; renderView(); };
            container.querySelector('#ds-close-upload-form')?.addEventListener('click', closeUpload);
            container.querySelector('#ds-cancel-upload-btn')?.addEventListener('click', closeUpload);

            container.querySelector('#ds-start-upload-btn')?.addEventListener('click', async () => {
                try {
                    const form = container.querySelector('#ds-form-upload-inpage');
                    const tipo = form.querySelector('[name=tipo]')?.value || 'tac_cbct';
                    const titolo = (form.querySelector('[name=titolo]')?.value || '').trim();

                    if (!titolo) {
                        showNotification('Inserisci il titolo dell esame', 'danger');
                        return;
                    }

                    const upRes = await callApi('allegati:upload', { paziente_id: pazienteId, tipo, titolo });
                    if (upRes && upRes.success) {
                        showNotification('Esame diagnostico caricato con successo!', 'success');
                        isUploadOpen = false;
                        if (typeof onUpdated === 'function') onUpdated();
                    } else {
                        showNotification(upRes?.error || 'Caricamento completato', 'info');
                        isUploadOpen = false;
                        if (typeof onUpdated === 'function') onUpdated();
                    }
                } catch (err) {
                    showNotification(err.message, 'danger');
                }
            });

            container.querySelectorAll('.ds-open-allegato').forEach(b => {
                b.addEventListener('click', () => callApi('allegati:open', { id: b.dataset.id }));
            });

            container.querySelectorAll('.ds-del-allegato').forEach(b => {
                b.addEventListener('click', async () => {
                    const res = await callApi('allegati:delete', { id: b.dataset.id });
                    if (res && res.success) {
                        showNotification('Allegato rimosso', 'info');
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
