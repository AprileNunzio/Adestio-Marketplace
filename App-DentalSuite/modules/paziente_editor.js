import { callApi } from '../shared/api.js';
import { renderHero , showNotification } from '../shared/ui_kit.js';
import { calculateAge, formatPatientDemographics } from '../shared/formatters.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            const isEdit = !!params.pazienteId;
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Scheda Paziente...</p></div>';

            let paziente = null;
            let anamnesi = null;

            if (isEdit) {
                const res = await callApi('pazienti:getById', { id: params.pazienteId });
                if (res && res.success && res.data) {
                    paziente = res.data.paziente || {};
                    anamnesi = res.data.anamnesi || {};
                } else {
                    showNotification('Paziente non trovato.', 'error');
                    if (onNavigate) onNavigate('pazienti');
                    return;
                }
            }

            paziente = paziente || {};
            anamnesi = anamnesi || {};

            const demoText = isEdit ? formatPatientDemographics(paziente) : 'Nuova Scheda';

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: isEdit ? `Scheda Paziente • ${paziente.cognome} ${paziente.nome}` : 'Nuova Cartella Paziente Odontoiatrico',
                        subtitle: isEdit ? `${demoText} • CF: ${paziente.codice_fiscale || '-'} • Tel: ${paziente.telefono || '-'}` : 'Compila tutti i dettagli anagrafici, fiscali, sanitari e clinici del paziente.',
                        icon: isEdit ? 'folder_shared' : 'person_add',
                        actionsHtml: `
                            <button class="ds-btn ds-btn-hero" id="ds-editor-cancel"><span class="material-symbols-rounded">arrow_back</span>Torna all'Elenco</button>
                            <button class="ds-btn ds-btn-hero" id="ds-editor-save-btn"><span class="material-symbols-rounded">save</span>Salva Scheda</button>
                        `
                    })}

                    <form id="ds-form-paziente-full">
                        <div style="display:flex; flex-direction:column; gap:1.4rem;">
                            
                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-teal);">badge</span>
                                        1. Dati Anagrafici & Identità
                                    </div>
                                    <span id="ds-live-age-badge" class="ds-badge ds-badge-teal" style="font-size:0.8rem;">${demoText}</span>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Cognome *</label>
                                        <input type="text" name="cognome" id="ds-inp-cognome" class="ds-input" required placeholder="Es. Rossi" value="${paziente.cognome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Nome Principale *</label>
                                        <input type="text" name="nome" id="ds-inp-nome" class="ds-input" required placeholder="Es. Mario" value="${paziente.nome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Secondo Nome / Altri Nomi</label>
                                        <input type="text" name="secondo_nome" id="ds-inp-secondo-nome" class="ds-input" placeholder="Es. Teresa, Luigi, Elena" value="${paziente.secondo_nome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Codice Fiscale *</label>
                                        <input type="text" name="codice_fiscale" id="ds-inp-cf" class="ds-input" required maxlength="16" style="text-transform:uppercase; font-family:monospace; font-weight:700;" placeholder="RSSMRA88R01H501Z" value="${paziente.codice_fiscale || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Sesso *</label>
                                        <select name="sesso" id="ds-inp-sesso" class="ds-select">
                                            <option value="M" ${(paziente.sesso === 'M' || paziente.sesso === 'Uomo') ? 'selected' : ''}>Uomo (Maschio)</option>
                                            <option value="F" ${(paziente.sesso === 'F' || paziente.sesso === 'Donna') ? 'selected' : ''}>Donna (Femmina)</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Data di Nascita *</label>
                                        <input type="date" name="data_nascita" id="ds-inp-data-nascita" class="ds-input" required value="${paziente.data_nascita || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Luogo di Nascita</label>
                                        <input type="text" name="luogo_nascita" class="ds-input" placeholder="Es. Roma (RM)" value="${paziente.luogo_nascita || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Professione</label>
                                        <input type="text" name="professione" class="ds-input" placeholder="Es. Insegnante, Impiegato..." value="${paziente.professione || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Stato Civile</label>
                                        <select name="stato_civile" class="ds-select">
                                            <option value="">-- Non specificato --</option>
                                            <option value="celibe_nubile" ${paziente.stato_civile === 'celibe_nubile' ? 'selected' : ''}>Celibe / Nubile</option>
                                            <option value="coniugato" ${paziente.stato_civile === 'coniugato' ? 'selected' : ''}>Coniugato/a</option>
                                            <option value="separato_divorziato" ${paziente.stato_civile === 'separato_divorziato' ? 'selected' : ''}>Separato/a o Divorziato/a</option>
                                            <option value="vedovo" ${paziente.stato_civile === 'vedovo' ? 'selected' : ''}>Vedovo/a</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-blue);">contact_phone</span>
                                        2. Recapiti & Preferenze Comunicazione
                                    </div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Cellulare / WhatsApp *</label>
                                        <input type="text" name="telefono" class="ds-input" required placeholder="Es. 340 1234567" value="${paziente.telefono || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Email</label>
                                        <input type="email" name="email" class="ds-input" placeholder="paziente@email.it" value="${paziente.email || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Canale Preferito Notifiche</label>
                                        <select name="canale_preferito" class="ds-select">
                                            <option value="whatsapp" ${paziente.canale_preferito === 'whatsapp' ? 'selected' : ''}>WhatsApp (Consigliato)</option>
                                            <option value="email" ${paziente.canale_preferito === 'email' ? 'selected' : ''}>Email</option>
                                            <option value="sms" ${paziente.canale_preferito === 'sms' ? 'selected' : ''}>SMS</option>
                                            <option value="telefono" ${paziente.canale_preferito === 'telefono' ? 'selected' : ''}>Telefonata Diretta</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Consenso Notifiche & Promemoria</label>
                                        <select name="consenso_promemoria" class="ds-select">
                                            <option value="1" ${paziente.consenso_promemoria !== 0 ? 'selected' : ''}>Acconsentito (Invia Promemoria)</option>
                                            <option value="0" ${paziente.consenso_promemoria === 0 ? 'selected' : ''}>Non Acconsentito (Nessun Invio)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-green);">home_pin</span>
                                        3. Residenza & Dati di Fatturazione Elettronica
                                    </div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Indirizzo di Residenza</label>
                                        <input type="text" name="indirizzo" class="ds-input" placeholder="Es. Via Roma 12" value="${paziente.indirizzo || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>CAP</label>
                                        <input type="text" name="cap" class="ds-input" placeholder="00100" maxlength="5" value="${paziente.cap || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Città</label>
                                        <input type="text" name="citta" class="ds-input" placeholder="Es. Milano" value="${paziente.citta || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Provincia</label>
                                        <input type="text" name="provincia" class="ds-input" placeholder="MI" maxlength="2" style="text-transform:uppercase;" value="${paziente.provincia || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Codice Destinatario SDI</label>
                                        <input type="text" name="codice_sdi" class="ds-input" placeholder="0000000" maxlength="7" value="${paziente.codice_sdi || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>PEC Fatturazione</label>
                                        <input type="email" name="pec" class="ds-input" placeholder="paziente@pec.it" value="${paziente.pec || ''}">
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-purple);">medical_services</span>
                                        4. Fondi Sanitari, Assicurazioni & Medico di Base (MMG)
                                    </div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Fondo Sanitario / Assicurazione</label>
                                        <input type="text" name="assicurazione" class="ds-input" placeholder="Es. Unisalute, Metasalute, Fasi, RBM..." value="${paziente.assicurazione || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Numero Tessera / Polizza</label>
                                        <input type="text" name="numero_polizza" class="ds-input" value="${paziente.numero_polizza || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Esenzioni Ticket Sanitario</label>
                                        <input type="text" name="esenzioni" class="ds-input" placeholder="Es. E01, E02, 048..." value="${paziente.esenzioni || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Medico di Base Curante (MMG)</label>
                                        <input type="text" name="medico_curante" class="ds-input" placeholder="Dr. Nome Cognome" value="${paziente.medico_curante || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Telefono Medico di Base</label>
                                        <input type="text" name="tel_medico_curante" class="ds-input" value="${paziente.tel_medico_curante || ''}">
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-amber);">emergency</span>
                                        5. Contatti di Emergenza & Tutore / Caregiver
                                    </div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Nominativo Referente Emergenza</label>
                                        <input type="text" name="contatto_emergenza_nome" class="ds-input" placeholder="Nome e Cognome" value="${paziente.contatto_emergenza_nome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Grado di Parentela / Ruolo</label>
                                        <input type="text" name="contatto_emergenza_parentela" class="ds-input" placeholder="Es. Coniuge, Genitore, Figlio..." value="${paziente.contatto_emergenza_parentela || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Telefono di Emergenza</label>
                                        <input type="text" name="contatto_emergenza_tel" class="ds-input" placeholder="Cellulare referente" value="${paziente.contatto_emergenza_tel || ''}">
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-rose);">health_and_safety</span>
                                        6. Alert Clinici Critici, Allergie & Rischio Sanitario
                                    </div>
                                </div>
                                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1rem; margin-bottom:1.2rem;">
                                    <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                        <input type="checkbox" name="terapia_anticoagulanti" ${anamnesi.terapia_anticoagulanti ? 'checked' : ''}>
                                        <strong style="color:var(--ds-rose);">Terapia Anticoagulanti (Cardioaspirina/Coumadin)</strong>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                        <input type="checkbox" name="pacemaker" ${paziente.pacemaker ? 'checked' : ''}>
                                        <strong style="color:var(--ds-rose);">Portatore di Pacemaker / Defibrillatore</strong>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                        <input type="checkbox" name="patologie_cardiovascolari" ${anamnesi.patologie_cardiovascolari ? 'checked' : ''}>
                                        <strong>Patologie Cardiovascolari</strong>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                        <input type="checkbox" name="diabete" ${anamnesi.diabete ? 'checked' : ''}>
                                        <strong>Diabete Mellito</strong>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                        <input type="checkbox" name="ipertensione" ${anamnesi.ipertensione ? 'checked' : ''}>
                                        <strong>Ipertensione Arteriosa</strong>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                        <input type="checkbox" name="ansia_odontoiatrica" ${anamnesi.ansia_odontoiatrica ? 'checked' : ''}>
                                        <strong>Odontofobia / Ansia Grave</strong>
                                    </label>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Gruppo Sanguigno</label>
                                        <select name="gruppo_sanguigno" class="ds-select">
                                            <option value="">-- Non specificato --</option>
                                            <option value="0_pos" ${paziente.gruppo_sanguigno === '0_pos' ? 'selected' : ''}>0 Positivo (0+)</option>
                                            <option value="0_neg" ${paziente.gruppo_sanguigno === '0_neg' ? 'selected' : ''}>0 Negativo (0-)</option>
                                            <option value="A_pos" ${paziente.gruppo_sanguigno === 'A_pos' ? 'selected' : ''}>A Positivo (A+)</option>
                                            <option value="A_neg" ${paziente.gruppo_sanguigno === 'A_neg' ? 'selected' : ''}>A Negativo (A-)</option>
                                            <option value="B_pos" ${paziente.gruppo_sanguigno === 'B_pos' ? 'selected' : ''}>B Positivo (B+)</option>
                                            <option value="B_neg" ${paziente.gruppo_sanguigno === 'B_neg' ? 'selected' : ''}>B Negativo (B-)</option>
                                            <option value="AB_pos" ${paziente.gruppo_sanguigno === 'AB_pos' ? 'selected' : ''}>AB Positivo (AB+)</option>
                                            <option value="AB_neg" ${paziente.gruppo_sanguigno === 'AB_neg' ? 'selected' : ''}>AB Negativo (AB-)</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label style="color:var(--ds-rose);">Allergie Note (Farmaci, Anestetici, Lattice, Metalli)</label>
                                        <input type="text" name="allergie_farmaci" class="ds-input" placeholder="Es. Penicillina, Cefalosporine, Lattice..." value="${anamnesi.allergie_farmaci || ''}">
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-cyan);">schedule</span>
                                        7. Preferenze Visita & Note Riservate Equipe
                                    </div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Fasce Orarie e Giorni Preferiti</label>
                                        <input type="text" name="preferenze_orari" class="ds-input" placeholder="Es. Solo pomeriggi dopo le 17:00, Preferibilmente Sabato mattina..." value="${paziente.preferenze_orari || ''}">
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Note Cliniche e Gestionali Riservate</label>
                                        <textarea name="note" class="ds-textarea" rows="3" placeholder="Informazioni utili per accoglienza, medico e segreteria...">${paziente.note || ''}</textarea>
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:1rem; padding:1rem 0;">
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-editor-cancel-bottom">Annulla</button>
                                <button type="button" class="ds-btn ds-btn-primary" id="ds-editor-save-bottom" style="padding:0.8rem 1.6rem; font-size:0.95rem;">
                                    <span class="material-symbols-rounded">check_circle</span>
                                    ${isEdit ? 'Salva Modifiche Cartella' : 'Registra Paziente & Apri Scheda'}
                                </button>
                            </div>

                        </div>
                    </form>
                </div>
            `;

            function updateLiveAge() {
                const birthVal = el.querySelector('#ds-inp-data-nascita').value;
                const sexVal = el.querySelector('#ds-inp-sesso').value;
                const badge = el.querySelector('#ds-live-age-badge');
                if (birthVal && badge) {
                    const tempPaz = { data_nascita: birthVal, sesso: sexVal };
                    badge.innerText = formatPatientDemographics(tempPaz) || 'Età non disponibile';
                }
            }

            el.querySelector('#ds-inp-data-nascita').addEventListener('change', updateLiveAge);
            el.querySelector('#ds-inp-sesso').addEventListener('change', updateLiveAge);

            const cancelHandler = () => { if (onNavigate) onNavigate('pazienti'); };
            el.querySelector('#ds-editor-cancel').addEventListener('click', cancelHandler);
            el.querySelector('#ds-editor-cancel-bottom').addEventListener('click', cancelHandler);

                        const saveHandler = async () => {
                try {
                    const form = el.querySelector('#ds-form-paziente-full');
                    if (!form) return;

                    const cognome = (form.querySelector('[name=cognome]')?.value || '').trim();
                    const nome = (form.querySelector('[name=nome]')?.value || '').trim();
                    const codiceFiscale = (form.querySelector('[name=codice_fiscale]')?.value || '').trim().toUpperCase();

                    if (!cognome || !nome) {
                        showNotification('Cognome e Nome sono obbligatori.', 'danger');
                        form.querySelector('[name=cognome]')?.focus();
                        return;
                    }
                    if (!codiceFiscale) {
                        showNotification('Il Codice Fiscale è obbligatorio.', 'danger');
                        form.querySelector('[name=codice_fiscale]')?.focus();
                        return;
                    }

                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());

                    payload.cognome = cognome;
                    payload.nome = nome;
                    payload.secondo_nome = (form.querySelector('[name=secondo_nome]')?.value || '').trim();
                    payload.codice_fiscale = codiceFiscale;

                    payload.pacemaker = form.querySelector('[name=pacemaker]')?.checked || false;
                    payload.terapia_anticoagulanti = form.querySelector('[name=terapia_anticoagulanti]')?.checked || false;
                    payload.patologie_cardiovascolari = form.querySelector('[name=patologie_cardiovascolari]')?.checked || false;
                    payload.diabete = form.querySelector('[name=diabete]')?.checked || false;
                    payload.ipertensione = form.querySelector('[name=ipertensione]')?.checked || false;
                    payload.ansia_odontoiatrica = form.querySelector('[name=ansia_odontoiatrica]')?.checked || false;

                    if (isEdit) payload.id = paziente.id;

                    const action = isEdit ? 'pazienti:update' : 'pazienti:create';
                    const res = await callApi(action, payload);

                    if (res && res.success) {
                        showNotification(isEdit ? 'Scheda paziente aggiornata con successo' : 'Paziente registrato con successo!', 'success');
                        const targetId = isEdit ? paziente.id : (res.data && res.data.id);
                        setTimeout(() => {
                            if (onNavigate) onNavigate('pazienti', { pazienteId: targetId });
                        }, 500);
                    } else {
                        showNotification(res.error || 'Errore nel salvataggio della scheda paziente', 'danger');
                    }
                } catch (err) {
                    showNotification(err.message, 'danger');
                }
            };

            el.querySelector('#ds-editor-save-btn').addEventListener('click', saveHandler);
            el.querySelector('#ds-editor-save-bottom').addEventListener('click', saveHandler);

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
