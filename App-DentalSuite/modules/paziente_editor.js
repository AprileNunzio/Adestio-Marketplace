import { callApi } from '../shared/api.js';
import { renderHero, showNotification } from '../shared/ui_kit.js';
import { formatPatientDemographics } from '../shared/formatters.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            const isEdit = !!params.pazienteId;
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Scheda Paziente...</p></div>';

            let paziente = {};
            let anamnesi = {};

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

            let activeCardView = null;

            const CARDS_META = [
                {
                    id: 'anagrafica',
                    title: '1. Dati Anagrafici & Identità',
                    subtitle: 'Cognome, nome principale, secondo nome, codice fiscale, sesso, data e luogo di nascita, stato civile.',
                    icon: 'badge',
                    color: '#0d9488',
                    getBadge: () => (paziente.cognome && paziente.nome) ? `${paziente.cognome} ${paziente.nome}` : 'Obbligatorio *'
                },
                {
                    id: 'recapiti',
                    title: '2. Recapiti & Canali Notifiche',
                    subtitle: 'Cellulare, WhatsApp nativo Windows, email e consensi per i promemoria automatici.',
                    icon: 'contact_phone',
                    color: '#2563eb',
                    getBadge: () => paziente.telefono || 'Da inserire'
                },
                {
                    id: 'residenza',
                    title: '3. Residenza & Fatturazione SDI',
                    subtitle: 'Indirizzo, CAP, comune, provincia, codice destinatario SDI e PEC per le fatture elettroniche.',
                    icon: 'home_pin',
                    color: '#0284c7',
                    getBadge: () => paziente.citta ? `${paziente.citta} (${paziente.provincia || ''})` : 'Facoltativo'
                },
                {
                    id: 'assicurazioni',
                    title: '4. Fondi Sanitari, Polizze & MMG',
                    subtitle: 'Fondo di categoria, assicurazione sanitaria integrativa, esenzioni ticket e medico di base.',
                    icon: 'medical_services',
                    color: '#7e22ce',
                    getBadge: () => paziente.assicurazione || 'Nessun Fondo'
                },
                {
                    id: 'alert_clinici',
                    title: '5. Alert Clinici, Allergie & Rischi',
                    subtitle: 'Terapia anticoagulanti, pacemaker, patologie cardiovascolari, diabete, gruppo sanguigno e allergie.',
                    icon: 'health_and_safety',
                    color: '#e11d48',
                    getBadge: () => (anamnesi.terapia_anticoagulanti || paziente.pacemaker || anamnesi.allergie_farmaci) ? '⚠️ Alert Presenti' : 'Nessun Rischio'
                },
                {
                    id: 'note',
                    title: '6. Emergenze, Orari & Note Studio',
                    subtitle: 'Contatto di emergenza o tutore, fasce orarie e giorni preferiti per le sedute e note riservate.',
                    icon: 'emergency',
                    color: '#d97706',
                    getBadge: () => paziente.contatto_emergenza_nome || 'Libero'
                }
            ];

            function renderMainView() {
                const demoText = isEdit ? formatPatientDemographics(paziente) : 'Nuova Cartella Odontoiatrica';

                if (activeCardView) {
                    renderSingleCardForm(activeCardView);
                    return;
                }

                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: isEdit ? `Cartella Paziente • ${paziente.cognome || ''} ${paziente.nome || ''}` : 'Nuova Cartella Paziente Odontoiatrico',
                            subtitle: isEdit ? `${demoText} • CF: ${paziente.codice_fiscale || '-'} • Tel: ${paziente.telefono || '-'}` : 'Seleziona una Card tematica per compilare le sezioni della cartella clinica.',
                            icon: isEdit ? 'folder_shared' : 'person_add',
                            theme: 'teal',
                            actionsHtml: `
                                <button class="ds-btn ds-btn-hero" id="ds-hub-btn-back"><span class="material-symbols-rounded">arrow_back</span>Torna all'Elenco Pazienti</button>
                                <button class="ds-btn ds-btn-hero" id="ds-hub-btn-save-all"><span class="material-symbols-rounded">save</span>${isEdit ? 'Salva Modifiche Cartella' : 'Conferma e Salva Cartella'}</button>
                            `
                        })}

                        <div class="ds-hub-grid">
                            ${CARDS_META.map(c => `
                                <div class="ds-hub-card ds-hub-card-clickable fade-in-up" data-card="${c.id}" style="--hub-card-accent:${c.color}; border-top:4px solid ${c.color};">
                                    <div class="ds-hub-card-header">
                                        <div class="ds-hub-card-icon" style="background:${c.color};">
                                            <span class="material-symbols-rounded">${c.icon}</span>
                                        </div>
                                        <span class="ds-hub-card-badge" style="color:${c.color}; border:1px solid ${c.color};">${c.getBadge()}</span>
                                    </div>
                                    <h3 class="ds-hub-card-title">${c.title}</h3>
                                    <p class="ds-hub-card-subtitle">${c.subtitle}</p>
                                    <div class="ds-hub-card-footer">
                                        <span class="ds-hub-card-action">Apri e Compila Card</span>
                                        <span class="material-symbols-rounded">arrow_forward</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                el.querySelector('#ds-hub-btn-back')?.addEventListener('click', () => {
                    if (onNavigate) onNavigate('pazienti');
                });
                el.querySelector('#ds-hub-btn-save-all')?.addEventListener('click', () => submitPatientData());

                el.querySelectorAll('.ds-hub-card[data-card]').forEach(cardEl => {
                    cardEl.addEventListener('click', () => {
                        activeCardView = cardEl.dataset.card;
                        renderMainView();
                    });
                });
            }

            function renderSingleCardForm(cardId) {
                const currentMeta = CARDS_META.find(c => c.id === cardId) || CARDS_META[0];

                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: currentMeta.title,
                            subtitle: `Cartella di: ${paziente.cognome || 'Nuovo Paziente'} ${paziente.nome || ''} • ${currentMeta.subtitle}`,
                            icon: currentMeta.icon,
                            theme: 'teal',
                            actionsHtml: `
                                <button class="ds-btn ds-btn-hero" id="ds-card-btn-back-grid"><span class="material-symbols-rounded">grid_view</span>Torna alla Panoramica Cards</button>
                                <button class="ds-btn ds-btn-hero" id="ds-card-btn-save"><span class="material-symbols-rounded">save</span>${isEdit ? 'Salva e Chiudi' : 'Salva Cartella'}</button>
                            `
                        })}

                        <form id="ds-single-card-form">
                            <div class="ds-panel border-teal">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:${currentMeta.color};">${currentMeta.icon}</span>
                                        ${currentMeta.title}
                                    </div>
                                    <span class="ds-badge" style="background:${currentMeta.color}; color:#fff;">Card Attiva</span>
                                </div>

                                ${getCardFormHtml(cardId)}
                            </div>

                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.2rem; padding:1rem 0;">
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-card-btn-back-bottom">
                                    <span class="material-symbols-rounded">arrow_back</span>Torna alla Panoramica Cards
                                </button>
                                <button type="button" class="ds-btn ds-btn-primary" id="ds-card-btn-apply-bottom" style="padding:0.8rem 1.6rem;">
                                    <span class="material-symbols-rounded">check</span>Salva e Torna alle Cards
                                </button>
                            </div>
                        </form>
                    </div>
                `;

                const backToGrid = () => {
                    syncCurrentCardData(cardId);
                    activeCardView = null;
                    renderMainView();
                };

                el.querySelector('#ds-card-btn-back-grid')?.addEventListener('click', backToGrid);
                el.querySelector('#ds-card-btn-back-bottom')?.addEventListener('click', backToGrid);
                el.querySelector('#ds-card-btn-apply-bottom')?.addEventListener('click', backToGrid);
                el.querySelector('#ds-card-btn-save')?.addEventListener('click', () => {
                    syncCurrentCardData(cardId);
                    submitPatientData();
                });
            }

            function syncCurrentCardData(cardId) {
                const form = el.querySelector('#ds-single-card-form');
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

            function getCardFormHtml(cardId) {
                if (cardId === 'anagrafica') {
                    return `
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
                                <select name="sesso" class="ds-select">
                                    <option value="M" ${(paziente.sesso === 'M' || paziente.sesso === 'Uomo') ? 'selected' : ''}>Uomo (Maschio)</option>
                                    <option value="F" ${(paziente.sesso === 'F' || paziente.sesso === 'Donna') ? 'selected' : ''}>Donna (Femmina)</option>
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Data di Nascita *</label>
                                <input type="date" name="data_nascita" class="ds-input" required value="${paziente.data_nascita || ''}">
                            </div>
                            <div class="ds-form-field">
                                <label>Luogo di Nascita</label>
                                <input type="text" name="luogo_nascita" class="ds-input" placeholder="Es. Roma (RM)" value="${paziente.luogo_nascita || ''}">
                            </div>
                            <div class="ds-form-field">
                                <label>Professione</label>
                                <input type="text" name="professione" class="ds-input" placeholder="Es. Insegnante..." value="${paziente.professione || ''}">
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
                    `;
                } else if (cardId === 'recapiti') {
                    return `
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
                                    <option value="telefono" ${paziente.canale_preferito === 'telefono' ? 'selected' : ''}>Telefonata</option>
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Consenso Notifiche & Promemoria</label>
                                <select name="consenso_promemoria" class="ds-select">
                                    <option value="1" ${paziente.consenso_promemoria !== 0 ? 'selected' : ''}>Acconsentito (Invia Promemoria)</option>
                                    <option value="0" ${paziente.consenso_promemoria === 0 ? 'selected' : ''}>Non Acconsentito</option>
                                </select>
                            </div>
                        </div>
                    `;
                } else if (cardId === 'residenza') {
                    return `
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
                    `;
                } else if (cardId === 'assicurazioni') {
                    return `
                        <div class="ds-form-grid">
                            <div class="ds-form-field">
                                <label>Fondo Sanitario / Assicurazione</label>
                                <input type="text" name="assicurazione" class="ds-input" placeholder="Es. Unisalute, Metasalute, Fasi..." value="${paziente.assicurazione || ''}">
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
                    `;
                } else if (cardId === 'alert_clinici') {
                    return `
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
                                <label style="color:var(--ds-rose);">Allergie Farmacologiche (Lattice, Penicillina, Anestetici)</label>
                                <input type="text" name="allergie_farmaci" class="ds-input" placeholder="Es. Penicillina, Cefalosporine..." value="${anamnesi.allergie_farmaci || paziente.allergie_farmaci || ''}">
                            </div>
                        </div>
                    `;
                } else if (cardId === 'note') {
                    return `
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
                    `;
                }
                return '';
            }

            async function submitPatientData() {
                try {
                    const cognome = (paziente.cognome || '').trim();
                    const nome = (paziente.nome || '').trim();
                    const codiceFiscale = (paziente.codice_fiscale || '').trim().toUpperCase();

                    if (!cognome || !nome) {
                        showNotification('Cognome e Nome sono obbligatori.', 'danger');
                        activeCardView = 'anagrafica';
                        renderMainView();
                        el.querySelector('#ds-inp-cognome')?.focus();
                        return;
                    }
                    if (!codiceFiscale) {
                        showNotification('Il Codice Fiscale è obbligatorio.', 'danger');
                        activeCardView = 'anagrafica';
                        renderMainView();
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
            }

            renderMainView();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
