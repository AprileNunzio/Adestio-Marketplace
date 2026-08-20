import { callApi } from '../shared/api.js';
import { renderHero, formatCurrency, showNotification } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            const isEdit = !!params.staffId;
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Collaboratore Clinico...</p></div>';

            let staffMember = {};
            if (isEdit) {
                const res = await callApi('staff:getAll');
                if (res && res.success && res.data) {
                    staffMember = res.data.find(s => s.id === params.staffId) || {};
                }
            }

            const s = staffMember || {};

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: isEdit ? `Scheda Collaboratore • ${s.cognome || ''} ${s.nome || ''}` : 'Nuovo Membro Equipe Clinica & Staff',
                        subtitle: 'Dati professionali, iscrizione albo, mansioni, orari e regole di compenso provvigionale o fisso.',
                        icon: isEdit ? 'badge' : 'person_add',
                        actionsHtml: `
                            <button class="ds-btn ds-btn-hero" id="ds-staff-btn-back"><span class="material-symbols-rounded">arrow_back</span>Torna all'Elenco Staff</button>
                            <button class="ds-btn ds-btn-hero" id="ds-staff-btn-save"><span class="material-symbols-rounded">save</span>${isEdit ? 'Salva Modifiche' : 'Registra Collaboratore'}</button>
                        `
                    })}

                    <form id="ds-form-staff-full">
                        <div style="display:flex; flex-direction:column; gap:1.4rem;">
                            
                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">person</span>1. Anagrafica & Identità Professionale</div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Cognome *</label>
                                        <input type="text" name="cognome" id="ds-inp-s-cognome" class="ds-input" required placeholder="Es. Rossi" value="${s.cognome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Nome Principale *</label>
                                        <input type="text" name="nome" id="ds-inp-s-nome" class="ds-input" required placeholder="Es. Marco" value="${s.nome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Secondo Nome</label>
                                        <input type="text" name="secondo_nome" class="ds-input" placeholder="Es. Antonio" value="${s.secondo_nome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Ruolo Professionale nello Studio *</label>
                                        <select name="ruolo" class="ds-select">
                                            <option value="medico_odontoiatra" ${s.ruolo === 'medico_odontoiatra' ? 'selected' : ''}>Medico Odontoiatra Specialista</option>
                                            <option value="direttore_sanitario" ${s.ruolo === 'direttore_sanitario' ? 'selected' : ''}>Direttore Sanitario Odontoiatra</option>
                                            <option value="igienista_dentale" ${s.ruolo === 'igienista_dentale' ? 'selected' : ''}>Igienista Dentale Abilitato</option>
                                            <option value="aso_assistente" ${s.ruolo === 'aso_assistente' ? 'selected' : ''}>Assistente alla Poltrona (ASO)</option>
                                            <option value="segretaria_receptionist" ${s.ruolo === 'segretaria_receptionist' ? 'selected' : ''}>Segreteria & Front Desk</option>
                                            <option value="amministratore" ${s.ruolo === 'amministratore' ? 'selected' : ''}>Amministratore Gestionale</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Specializzazione Clinica / Branca Principale</label>
                                        <input type="text" name="specializzazione" class="ds-input" placeholder="Es. Ortodonzia e Gnatologia, Implantologia..." value="${s.specializzazione || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Codice Fiscale</label>
                                        <input type="text" name="codice_fiscale" class="ds-input" maxlength="16" style="text-transform:uppercase; font-family:monospace;" placeholder="RSSMRC80A01H501Z" value="${s.codice_fiscale || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Numero Iscrizione Albo / Ordine dei Medici</label>
                                        <input type="text" name="albo_numero" class="ds-input" placeholder="Es. Albo Odontoiatri Roma n. 12345" value="${s.albo_numero || ''}">
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">contact_phone</span>2. Recapiti & Presenza in Agenda</div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Cellulare / Telefono</label>
                                        <input type="text" name="telefono" class="ds-input" placeholder="Es. 340 1234567" value="${s.telefono || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Email Professionale</label>
                                        <input type="email" name="email" class="ds-input" placeholder="dottore@studio.it" value="${s.email || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Colore Badge & Calendario Agenda</label>
                                        <input type="color" name="colore_calendario" class="ds-input" style="height:44px; padding:2px; cursor:pointer;" value="${s.colore_calendario || '#0d9488'}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Stato Operativo</label>
                                        <select name="attivo" class="ds-select">
                                            <option value="1" ${s.attivo !== 0 ? 'selected' : ''}>Attivo in Servizio</option>
                                            <option value="0" ${s.attivo === 0 ? 'selected' : ''}>Non in Servizio / Sospeso</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">payments</span>3. Regole di Compenso Economico Predefinito</div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Modalità di Retribuzione Default</label>
                                        <select name="tipo_compenso_default" class="ds-select">
                                            <option value="percentuale" ${s.tipo_compenso_default === 'percentuale' ? 'selected' : ''}>Percentuale (%) su Prestazioni Eseguite</option>
                                            <option value="fisso_seduta" ${s.tipo_compenso_default === 'fisso_seduta' ? 'selected' : ''}>Compenso Fisso (€) a Seduta / Mezza Giornata</option>
                                            <option value="stipendio_mensile" ${s.tipo_compenso_default === 'stipendio_mensile' ? 'selected' : ''}>Stipendio Mensile Fisso</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Valore Predefinito (% o €)</label>
                                        <input type="number" step="0.01" name="valore_compenso_default" class="ds-input" placeholder="Es. 35 per il 35%, oppure 150.00" value="${s.valore_compenso_default || 35}">
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:1rem; padding:1rem 0;">
                                <button type="button" class="ds-btn ds-btn-ghost" id="ds-staff-btn-cancel-bottom">Annulla</button>
                                <button type="button" class="ds-btn ds-btn-primary" id="ds-staff-btn-save-bottom" style="padding:0.8rem 1.6rem;">
                                    <span class="material-symbols-rounded">check_circle</span>
                                    ${isEdit ? 'Salva Modifiche Collaboratore' : 'Conferma Inserimento Collaboratore'}
                                </button>
                            </div>

                        </div>
                    </form>
                </div>
            `;

            const backHandler = () => { if (onNavigate) onNavigate('staff'); };
            el.querySelector('#ds-staff-btn-back').addEventListener('click', backHandler);
            el.querySelector('#ds-staff-btn-cancel-bottom').addEventListener('click', backHandler);

            const saveHandler = async () => {
                try {
                    const form = el.querySelector('#ds-form-staff-full');
                    const cognome = (form.querySelector('[name=cognome]')?.value || '').trim();
                    const nome = (form.querySelector('[name=nome]')?.value || '').trim();

                    if (!cognome || !nome) {
                        showNotification('Cognome e Nome sono obbligatori.', 'danger');
                        el.querySelector('#ds-inp-s-cognome')?.focus();
                        return;
                    }

                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());
                    payload.cognome = cognome;
                    payload.nome = nome;
                    payload.secondo_nome = (form.querySelector('[name=secondo_nome]')?.value || '').trim();
                    payload.attivo = payload.attivo === '1';

                    if (isEdit) payload.id = s.id;

                    const action = isEdit ? 'staff:update' : 'staff:create';
                    const res = await callApi(action, payload);

                    if (res && res.success) {
                        showNotification(isEdit ? 'Dati collaboratore aggiornati con successo' : 'Collaboratore inserito con successo nello staff!', 'success');
                        setTimeout(() => {
                            if (onNavigate) onNavigate('staff');
                        }, 400);
                    } else {
                        showNotification(res.error || 'Errore nel salvataggio staff', 'danger');
                    }
                } catch (err) {
                    showNotification(err.message, 'danger');
                }
            };

            el.querySelector('#ds-staff-btn-save').addEventListener('click', saveHandler);
            el.querySelector('#ds-staff-btn-save-bottom').addEventListener('click', saveHandler);

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
