import { callApi } from '../shared/api.js';
import { renderHero, showNotification } from '../shared/ui_kit.js';
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
                    showNotification('Paziente non trovato.', 'danger');
                    if (onNavigate) onNavigate('pazienti');
                    return;
                }
            }

            paziente = paziente || {};
            anamnesi = anamnesi || {};

            let currentStep = 'anagrafica';
            const demoText = isEdit ? formatPatientDemographics(paziente) : 'Nuova Cartella';

            const STEPS = [
                { id: 'anagrafica', label: '1. Dati Anagrafici & Identità', icon: 'badge', color: '#0d9488' },
                { id: 'recapiti', label: '2. Recapiti & Notifiche', icon: 'contact_phone', color: '#2563eb' },
                { id: 'residenza', label: '3. Residenza & SDI', icon: 'home_pin', color: '#0284c7' },
                { id: 'assicurazioni', label: '4. Fondi Sanitari & MMG', icon: 'medical_services', color: '#7e22ce' },
                { id: 'alert_clinici', label: '5. Alert Clinici & Allergie', icon: 'health_and_safety', color: '#e11d48' },
                { id: 'note', label: '6. Emergenze & Note Studio', icon: 'emergency', color: '#d97706' }
            ];

            function renderEditor() {
                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: isEdit ? `Scheda Paziente • ${paziente.cognome} ${paziente.nome}` : 'Nuova Cartella Paziente Odontoiatrico',
                            subtitle: isEdit ? `${demoText} • CF: ${paziente.codice_fiscale || '-'} • Tel: ${paziente.telefono || '-'}` : 'Compilazione modulare a Cards: anagrafica, fiscalità SDI, alert sanitari e contatti.',
                            icon: isEdit ? 'folder_shared' : 'person_add',
                            theme: 'teal',
                            actionsHtml: `
                                <button class="ds-btn ds-btn-hero" id="ds-editor-cancel"><span class="material-symbols-rounded">arrow_back</span>Torna all'Elenco</button>
                                <button class="ds-btn ds-btn-hero" id="ds-editor-save-btn"><span class="material-symbols-rounded">save</span>${isEdit ? 'Salva Modifiche' : 'Crea Cartella'}</button>
                            `
                        })}

                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                            <div class="ds-nav" style="background:var(--md-surface); padding:4px; border-radius:999px; border:1.5px solid var(--md-outline-variant);">
                                ${STEPS.map(st => `
                                    <button class="ds-nav-btn ${currentStep === st.id ? 'active' : ''}" data-step="${st.id}" style="${currentStep === st.id ? `background:${st.color}; color:#fff; border-color:transparent;` : ''}">
                                        <span class="material-symbols-rounded">${st.icon}</span>${st.label}
                                    </button>
                                `).join('')}
                            </div>
                            <span id="ds-live-age-badge" class="ds-badge ds-badge-teal" style="font-size:0.82rem; padding:0.4rem 0.9rem;">${demoText}</span>
                        </div>

                        <form id="ds-form-paziente-full">
                            <div id="ds-editor-step-outlet"></div>

                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.2rem; padding-top:1rem; border-top:1.5px solid var(--md-outline-variant);">
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-editor-cancel-bottom">Annulla</button>
                                <div style="display:flex; gap:0.8rem;">
                                    <button type="button" class="ds-btn ds-btn-ghost" id="ds-step-prev-btn" style="${currentStep === 'anagrafica' ? 'display:none;' : ''}">
                                        <span class="material-symbols-rounded">arrow_back</span>Sezione Precedente
                                    </button>
                                    <button type="button" class="ds-btn ds-btn-teal" id="ds-step-next-btn" style="${currentStep === 'note' ? 'display:none;' : ''}">
                                        Prossima Sezione<span class="material-symbols-rounded">arrow_forward</span>
                                    </button>
                                    <button type="button" class="ds-btn ds-btn-primary" id="ds-editor-save-bottom" style="padding:0.8rem 1.6rem; font-size:0.95rem;">
                                        <span class="material-symbols-rounded">check_circle</span>
                                        ${isEdit ? 'Salva Modifiche Cartella' : 'Registra Paziente & Apri Scheda'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                `;

                el.querySelectorAll('.ds-nav-btn[data-step]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        saveCurrentFormData();
                        currentStep = btn.dataset.step;
                        renderStepOutlet();
                    });
                });

                el.querySelector('#ds-editor-cancel')?.addEventListener('click', () => { if (onNavigate) onNavigate('pazienti'); });
                el.querySelector('#ds-editor-cancel-bottom')?.addEventListener('click', () => { if (onNavigate) onNavigate('pazienti'); });
                el.querySelector('#ds-editor-save-btn')?.addEventListener('click', saveHandler);
                el.querySelector('#ds-editor-save-bottom')?.addEventListener('click', saveHandler);

                renderStepOutlet();
            }

            function saveCurrentFormData() {
                const form = el.querySelector('#ds-form-paziente-full');
                if (!form) return;
                const fd = new FormData(form);
                for (const [k, v] of fd.entries()) {
                    paziente[k] = v;
                }
                const chk = ['pacemaker', 'terapia_anticoagulanti', 'patologie_cardiovascolari', 'diabete', 'ipertensione', 'ansia_odontoiatrica'];
                chk.forEach(c => {
                    const elC = form.querySelector(`[name=${c}]`);
                    if (elC) {
                        paziente[c] = elC.checked;
                        anamnesi[c] = elC.checked;
                    }
                });
                const allF = form.querySelector('[name=allergie_farmaci]');
                if (allF) anamnesi.allergie_farmaci = allF.value;
            }

            function renderStepOutlet() {
                const outlet = el.querySelector('#ds-editor-step-outlet');
                if (!outlet) return;

                el.querySelectorAll('.ds-nav-btn[data-step]').forEach(b => {
                    const isActive = b.dataset.step === currentStep;
                    b.classList.toggle('active', isActive);
                    const matched = STEPS.find(s => s.id === b.dataset.step);
                    if (matched) {
                        b.style.background = isActive ? matched.color : '';
                        b.style.color = isActive ? '#fff' : '';
                        b.style.borderColor = isActive ? 'transparent' : '';
                    }
                });

                const prevBtn = el.querySelector('#ds-step-prev-btn');
                const nextBtn = el.querySelector('#ds-step-next-btn');
                const stepIdx = STEPS.findIndex(s => s.id === currentStep);
                if (prevBtn) prevBtn.style.display = stepIdx > 0 ? 'inline-flex' : 'none';
                if (nextBtn) nextBtn.style.display = stepIdx < STEPS.length - 1 ? 'inline-flex' : 'none';

                if (prevBtn) {
                    prevBtn.onclick = () => {
                        saveCurrentFormData();
                        if (stepIdx > 0) {
                            currentStep = STEPS[stepIdx - 1].id;
                            renderStepOutlet();
                        }
                    };
                }
                if (nextBtn) {
                    nextBtn.onclick = () => {
                        saveCurrentFormData();
                        if (stepIdx < STEPS.length - 1) {
                            currentStep = STEPS[stepIdx + 1].id;
                            renderStepOutlet();
                        }
                    };
                }

                if (currentStep === 'anagrafica') {
                    outlet.innerHTML = `
                        <div class="ds-panel border-teal fade-in-up">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">badge</span>1. Dati Anagrafici & Identità Personale</div>
                                <span class="ds-badge ds-badge-teal">Campi Obbligatori *</span>
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
                                    <input type="text" name="secondo_nome" class="ds-input" placeholder="Es. Teresa, Luigi..." value="${paziente.secondo_nome || ''}">
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
                    `;

                    const bindAge = () => {
                        const bVal = outlet.querySelector('#ds-inp-data-nascita')?.value;
                        const sVal = outlet.querySelector('#ds-inp-sesso')?.value;
                        const badge = el.querySelector('#ds-live-age-badge');
                        if (bVal && badge) {
                            badge.innerText = formatPatientDemographics({ data_nascita: bVal, sesso: sVal }) || 'Età non disponibile';
                        }
                    };
                    outlet.querySelector('#ds-inp-data-nascita')?.addEventListener('change', bindAge);
                    outlet.querySelector('#ds-inp-sesso')?.addEventListener('change', bindAge);

                } else if (currentStep === 'recapiti') {
                    outlet.innerHTML = `
                        <div class="ds-panel border-blue fade-in-up">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-blue);">contact_phone</span>2. Recapiti & Preferenze Notifiche WhatsApp / Email</div>
                                <span class="ds-badge ds-badge-blue">Canali di Contatto</span>
                            </div>
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Cellulare / WhatsApp *</label>
                                    <input type="text" name="telefono" class="ds-input" required placeholder="Es. 340 1234567" value="${paziente.telefono || ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Email Personale</label>
                                    <input type="email" name="email" class="ds-input" placeholder="paziente@email.it" value="${paziente.email || ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Canale Preferito per Promemoria</label>
                                    <select name="canale_preferito" class="ds-select">
                                        <option value="whatsapp" ${paziente.canale_preferito === 'whatsapp' ? 'selected' : ''}>WhatsApp Desktop / Web</option>
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
                    `;

                } else if (currentStep === 'residenza') {
                    outlet.innerHTML = `
                        <div class="ds-panel border-cyan fade-in-up">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-cyan);">home_pin</span>3. Residenza & Fatturazione Elettronica SDI</div>
                                <span class="ds-badge ds-badge-cyan">Dati Fiscali</span>
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
                    `;

                } else if (currentStep === 'assicurazioni') {
                    outlet.innerHTML = `
                        <div class="ds-panel border-purple fade-in-up">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-purple);">medical_services</span>4. Fondi Sanitari, Assicurazioni & Medico di Base</div>
                                <span class="ds-badge ds-badge-purple">Convenzioni</span>
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
                    `;

                } else if (currentStep === 'alert_clinici') {
                    outlet.innerHTML = `
                        <div class="ds-panel border-rose fade-in-up">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-rose);">health_and_safety</span>5. Alert Clinici Critici, Allergie & Rischio Anamnestico</div>
                                <span class="ds-badge ds-badge-rose">Sicurezza Paziente</span>
                            </div>
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1rem; margin-bottom:1.2rem;">
                                <label style="display:flex; align-items:center; gap:0.6rem; padding:0.8rem 1rem; background:rgba(225,29,72,0.08); border:1px solid rgba(225,29,72,0.25); border-radius:12px; cursor:pointer;">
                                    <input type="checkbox" name="terapia_anticoagulanti" ${(anamnesi.terapia_anticoagulanti || paziente.terapia_anticoagulanti) ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--ds-rose);">
                                    <strong style="color:var(--ds-rose);">Terapia Anticoagulanti (Cardioaspirina/Coumadin)</strong>
                                </label>
                                <label style="display:flex; align-items:center; gap:0.6rem; padding:0.8rem 1rem; background:rgba(225,29,72,0.08); border:1px solid rgba(225,29,72,0.25); border-radius:12px; cursor:pointer;">
                                    <input type="checkbox" name="pacemaker" ${paziente.pacemaker ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--ds-rose);">
                                    <strong style="color:var(--ds-rose);">Portatore di Pacemaker / Defibrillatore</strong>
                                </label>
                                <label style="display:flex; align-items:center; gap:0.6rem; padding:0.8rem 1rem; background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:12px; cursor:pointer;">
                                    <input type="checkbox" name="patologie_cardiovascolari" ${(anamnesi.patologie_cardiovascolari || paziente.patologie_cardiovascolari) ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--ds-teal);">
                                    <strong>Patologie Cardiovascolari</strong>
                                </label>
                                <label style="display:flex; align-items:center; gap:0.6rem; padding:0.8rem 1rem; background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:12px; cursor:pointer;">
                                    <input type="checkbox" name="diabete" ${(anamnesi.diabete || paziente.diabete) ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--ds-teal);">
                                    <strong>Diabete Mellito</strong>
                                </label>
                                <label style="display:flex; align-items:center; gap:0.6rem; padding:0.8rem 1rem; background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:12px; cursor:pointer;">
                                    <input type="checkbox" name="ipertensione" ${(anamnesi.ipertensione || paziente.ipertensione) ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--ds-teal);">
                                    <strong>Ipertensione Arteriosa</strong>
                                </label>
                                <label style="display:flex; align-items:center; gap:0.6rem; padding:0.8rem 1rem; background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:12px; cursor:pointer;">
                                    <input type="checkbox" name="ansia_odontoiatrica" ${(anamnesi.ansia_odontoiatrica || paziente.ansia_odontoiatrica) ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--ds-teal);">
                                    <strong>Odontofobia / Ansia Clinica Grave</strong>
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
                                    <label style="color:var(--ds-rose);">Allergie Farmacologiche o di Contatto (Lattice, Farmaci, Anestetici)</label>
                                    <input type="text" name="allergie_farmaci" class="ds-input" placeholder="Es. Penicillina, Cefalosporine, Lattice, Nichel..." value="${anamnesi.allergie_farmaci || paziente.allergie_farmaci || ''}">
                                </div>
                            </div>
                        </div>
                    `;

                } else if (currentStep === 'note') {
                    outlet.innerHTML = `
                        <div class="ds-panel border-amber fade-in-up">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-amber);">emergency</span>6. Contatti di Emergenza, Preferenze Visita & Note Studio</div>
                                <span class="ds-badge ds-badge-amber">Accoglienza</span>
                            </div>
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Nominativo Referente Emergenza</label>
                                    <input type="text" name="contatto_emergenza_nome" class="ds-input" placeholder="Nome e Cognome Tutore / Caregiver" value="${paziente.contatto_emergenza_nome || ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Grado di Parentela / Ruolo</label>
                                    <input type="text" name="contatto_emergenza_parentela" class="ds-input" placeholder="Es. Coniuge, Genitore, Figlio..." value="${paziente.contatto_emergenza_parentela || ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Telefono di Emergenza</label>
                                    <input type="text" name="contatto_emergenza_tel" class="ds-input" placeholder="Cellulare referente" value="${paziente.contatto_emergenza_tel || ''}">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Fasce Orarie e Giorni Preferiti</label>
                                    <input type="text" name="preferenze_orari" class="ds-input" placeholder="Es. Pomeriggi dopo le 17:00, Sabato mattina..." value="${paziente.preferenze_orari || ''}">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Note Cliniche e Gestionali Riservate</label>
                                    <textarea name="note" class="ds-textarea" rows="3" placeholder="Informazioni utili per accoglienza, medico e segreteria...">${paziente.note || ''}</textarea>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }

            const saveHandler = async () => {
                try {
                    saveCurrentFormData();

                    const cognome = (paziente.cognome || '').trim();
                    const nome = (paziente.nome || '').trim();
                    const codiceFiscale = (paziente.codice_fiscale || '').trim().toUpperCase();

                    if (!cognome || !nome) {
                        showNotification('Cognome e Nome sono obbligatori.', 'danger');
                        currentStep = 'anagrafica';
                        renderStepOutlet();
                        el.querySelector('#ds-inp-cognome')?.focus();
                        return;
                    }
                    if (!codiceFiscale) {
                        showNotification('Il Codice Fiscale è obbligatorio.', 'danger');
                        currentStep = 'anagrafica';
                        renderStepOutlet();
                        el.querySelector('#ds-inp-cf')?.focus();
                        return;
                    }

                    const payload = { ...paziente };
                    payload.cognome = cognome;
                    payload.nome = nome;
                    payload.secondo_nome = (paziente.secondo_nome || '').trim();
                    payload.codice_fiscale = codiceFiscale;

                    payload.pacemaker = !!paziente.pacemaker;
                    payload.terapia_anticoagulanti = !!(anamnesi.terapia_anticoagulanti || paziente.terapia_anticoagulanti);
                    payload.patologie_cardiovascolari = !!(anamnesi.patologie_cardiovascolari || paziente.patologie_cardiovascolari);
                    payload.diabete = !!(anamnesi.diabete || paziente.diabete);
                    payload.ipertensione = !!(anamnesi.ipertensione || paziente.ipertensione);
                    payload.ansia_odontoiatrica = !!(anamnesi.ansia_odontoiatrica || paziente.ansia_odontoiatrica);
                    payload.allergie_farmaci = anamnesi.allergie_farmaci || paziente.allergie_farmaci || '';

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

            renderEditor();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
