import { callApi } from '../shared/api.js';

export function openPoltronaModal({ poltrona = null, allSedi = [], allSale = [], allStaff = [], onSaved }) {
    try {
        const isEdit = !!poltrona;
        const p = poltrona || {};

        const overlay = document.createElement('div');
        overlay.className = 'ds-modal-overlay';
        overlay.innerHTML = `
            <div class="ds-modal-card fade-in-up" style="max-width:550px;">
                <div class="ds-modal-header">
                    <div class="ds-modal-title">
                        <span class="material-symbols-rounded" style="color:var(--ds-teal);">chair</span>
                        ${isEdit ? 'Modifica Poltrona Odontoiatrica' : 'Nuova Poltrona Odontoiatrica'}
                    </div>
                    <button class="ds-btn ds-btn-ghost" id="ds-m-close"><span class="material-symbols-rounded">close</span></button>
                </div>
                <form id="ds-form-poltrona" class="ds-form-grid" style="grid-template-columns:1fr 1fr;">
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label>Nome / Identificativo Poltrona *</label>
                        <input type="text" name="nome" class="ds-input" required placeholder="Es. Unità 1 - Conservativa" value="${p.nome || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Sede Operativa *</label>
                        <select name="sede_id" class="ds-select" required>
                            ${allSedi.map(s => `<option value="${s.id}" ${p.sede_id === s.id ? 'selected' : ''}>${s.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ds-form-field">
                        <label>Sala Odontoiatrica</label>
                        <select name="sala_id" class="ds-select">
                            <option value="">-- Nessuna Sala Specifica --</option>
                            ${allSale.map(s => `<option value="${s.id}" ${p.sala_id === s.id ? 'selected' : ''}>${s.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label style="color:var(--ds-teal); font-weight:800;">👨‍⚕️ Medico / Specialista Predefinito per la Poltrona</label>
                        <select name="medico_default_id" class="ds-select">
                            <option value="">-- Nessun Medico Pre-assegnato (Libera) --</option>
                            ${allStaff.filter(s => s.ruolo === 'medico' || s.ruolo === 'igienista').map(m => `<option value="${m.id}" ${p.medico_default_id === m.id ? 'selected' : ''}>Dr. ${m.cognome} ${m.nome} (${m.specializzazione || m.ruolo})</option>`).join('')}
                        </select>
                    </div>
                    <div class="ds-form-field">
                        <label>Marca & Modello</label>
                        <input type="text" name="marca_modello" class="ds-input" placeholder="Es. Stern Weber S300" value="${p.marca_modello || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Matricola Dispositivo</label>
                        <input type="text" name="matricola" class="ds-input" placeholder="SW-2024-..." value="${p.matricola || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Colore Tematico Agenda</label>
                        <input type="color" name="colore_agenda" class="ds-input" style="height:42px; padding:2px;" value="${p.colore_agenda || '#0d9488'}">
                    </div>
                    <div class="ds-form-field">
                        <label>Stato Operativo</label>
                        <select name="stato" class="ds-select">
                            <option value="attiva" ${p.stato !== 'manutenzione' ? 'selected' : ''}>Attiva / Operativa</option>
                            <option value="manutenzione" ${p.stato === 'manutenzione' ? 'selected' : ''}>In Manutenzione / Bloccata</option>
                        </select>
                    </div>
                    <div style="grid-column:1/-1; display:flex; justify-content:flex-end; gap:0.8rem; margin-top:1rem;">
                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-m-cancel">Annulla</button>
                        <button type="submit" class="ds-btn ds-btn-primary"><span class="material-symbols-rounded">save</span> Salva Poltrona</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeModal = () => overlay.remove();
        overlay.querySelector('#ds-m-close').addEventListener('click', closeModal);
        overlay.querySelector('#ds-m-cancel').addEventListener('click', closeModal);

        overlay.querySelector('#ds-form-poltrona').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const payload = Object.fromEntries(formData.entries());
            if (isEdit) payload.id = p.id;
            await callApi('struttura:savePoltrona', payload);
            closeModal();
            if (onSaved) onSaved();
        });
    } catch (e) {}
}

export function openSalaModal({ sala = null, allSedi = [], onSaved }) {
    try {
        const isEdit = !!sala;
        const s = sala || {};

        const overlay = document.createElement('div');
        overlay.className = 'ds-modal-overlay';
        overlay.innerHTML = `
            <div class="ds-modal-card fade-in-up" style="max-width:500px;">
                <div class="ds-modal-header">
                    <div class="ds-modal-title">
                        <span class="material-symbols-rounded" style="color:var(--ds-blue);">meeting_room</span>
                        ${isEdit ? 'Modifica Sala Odontoiatrica' : 'Nuova Sala Odontoiatrica'}
                    </div>
                    <button class="ds-btn ds-btn-ghost" id="ds-m-close"><span class="material-symbols-rounded">close</span></button>
                </div>
                <form id="ds-form-sala" class="ds-form-grid" style="grid-template-columns:1fr 1fr;">
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label>Nome Sala / Ambulatorio *</label>
                        <input type="text" name="nome" class="ds-input" required placeholder="Es. Sala Chirurgica 1" value="${s.nome || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Sede *</label>
                        <select name="sede_id" class="ds-select" required>
                            ${allSedi.map(sd => `<option value="${sd.id}" ${s.sede_id === sd.id ? 'selected' : ''}>${sd.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ds-form-field">
                        <label>Tipologia Sala</label>
                        <select name="tipo_sala" class="ds-select">
                            <option value="operativa" ${s.tipo_sala === 'operativa' ? 'selected' : ''}>Operativa Generale</option>
                            <option value="chirurgia" ${s.tipo_sala === 'chirurgia' ? 'selected' : ''}>Chirurgia & Implantologia</option>
                            <option value="igiene" ${s.tipo_sala === 'igiene' ? 'selected' : ''}>Igiene & Prevenzione</option>
                            <option value="ortodonzia" ${s.tipo_sala === 'ortodonzia' ? 'selected' : ''}>Ortodonzia</option>
                            <option value="rx_diagnostica" ${s.tipo_sala === 'rx_diagnostica' ? 'selected' : ''}>Sala Radiologica / CBCT</option>
                        </select>
                    </div>
                    <div class="ds-form-field">
                        <label>Piano</label>
                        <input type="text" name="piano" class="ds-input" placeholder="Es. Piano Terra" value="${s.piano || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Codice Stanza</label>
                        <input type="text" name="codice_stanza" class="ds-input" placeholder="Es. S1" value="${s.codice_stanza || ''}">
                    </div>
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label>Dotazioni & Tecnologie Speciali</label>
                        <input type="text" name="dotazioni" class="ds-input" placeholder="Es. Microscopio operatorio, Piezo-surgery..." value="${s.dotazioni || ''}">
                    </div>
                    <div style="grid-column:1/-1; display:flex; justify-content:flex-end; gap:0.8rem; margin-top:1rem;">
                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-m-cancel">Annulla</button>
                        <button type="submit" class="ds-btn ds-btn-primary"><span class="material-symbols-rounded">save</span> Salva Sala</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeModal = () => overlay.remove();
        overlay.querySelector('#ds-m-close').addEventListener('click', closeModal);
        overlay.querySelector('#ds-m-cancel').addEventListener('click', closeModal);

        overlay.querySelector('#ds-form-sala').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const payload = Object.fromEntries(formData.entries());
            if (isEdit) payload.id = s.id;
            await callApi('struttura:saveSala', payload);
            closeModal();
            if (onSaved) onSaved();
        });
    } catch (e) {}
}

export function openSedeModal({ sede = null, onSaved }) {
    try {
        const isEdit = !!sede;
        const sd = sede || {};

        const overlay = document.createElement('div');
        overlay.className = 'ds-modal-overlay';
        overlay.innerHTML = `
            <div class="ds-modal-card fade-in-up" style="max-width:550px;">
                <div class="ds-modal-header">
                    <div class="ds-modal-title">
                        <span class="material-symbols-rounded" style="color:var(--ds-teal);">apartment</span>
                        ${isEdit ? 'Modifica Sede dello Studio' : 'Nuova Sede / Clinica'}
                    </div>
                    <button class="ds-btn ds-btn-ghost" id="ds-m-close"><span class="material-symbols-rounded">close</span></button>
                </div>
                <form id="ds-form-sede" class="ds-form-grid" style="grid-template-columns:1fr 1fr;">
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label>Nome Sede / Clinica *</label>
                        <input type="text" name="nome" class="ds-input" required placeholder="Es. Sede Centrale" value="${sd.nome || ''}">
                    </div>
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label>Indirizzo</label>
                        <input type="text" name="indirizzo" class="ds-input" placeholder="Es. Via Roma 10" value="${sd.indirizzo || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Città</label>
                        <input type="text" name="citta" class="ds-input" placeholder="Roma" value="${sd.citta || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>CAP</label>
                        <input type="text" name="cap" class="ds-input" placeholder="00100" value="${sd.cap || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Telefono</label>
                        <input type="text" name="telefono" class="ds-input" placeholder="06 12345678" value="${sd.telefono || ''}">
                    </div>
                    <div class="ds-form-field">
                        <label>Email</label>
                        <input type="email" name="email" class="ds-input" placeholder="sede@dentalsuite.it" value="${sd.email || ''}">
                    </div>
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label>Direttore Sanitario</label>
                        <input type="text" name="direttore_sanitario" class="ds-input" placeholder="Dr. Nome Cognome" value="${sd.direttore_sanitario || ''}">
                    </div>
                    <div class="ds-form-field" style="grid-column:1/-1;">
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer;">
                            <input type="checkbox" name="is_principale" ${sd.is_principale ? 'checked' : ''}>
                            <strong>Imposta come Sede Principale Predefinita</strong>
                        </label>
                    </div>
                    <div style="grid-column:1/-1; display:flex; justify-content:flex-end; gap:0.8rem; margin-top:1rem;">
                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-m-cancel">Annulla</button>
                        <button type="submit" class="ds-btn ds-btn-primary"><span class="material-symbols-rounded">save</span> Salva Sede</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeModal = () => overlay.remove();
        overlay.querySelector('#ds-m-close').addEventListener('click', closeModal);
        overlay.querySelector('#ds-m-cancel').addEventListener('click', closeModal);

        overlay.querySelector('#ds-form-sede').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const payload = Object.fromEntries(formData.entries());
            payload.is_principale = e.target.querySelector('[name=is_principale]').checked;
            if (isEdit) payload.id = sd.id;
            await callApi('struttura:saveSede', payload);
            closeModal();
            if (onSaved) onSaved();
        });
    } catch (e) {}
}
