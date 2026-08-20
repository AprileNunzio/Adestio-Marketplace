import { callApi } from '../shared/api.js';
import { renderModal } from '../shared/ui_kit.js';
import { detectAppointmentConflicts } from '../domain/appointment_validator.js';
import { createPatientSearchPicker } from './patient_search_picker.js';

export function openAppointmentModal({ appointment = null, defaultDate = null, defaultPoltrona = '', onSaved }) {
    try {
        const isEdit = !!appointment;
        let allPazienti = [];
        let allStaff = [];
        let allExistingAppointments = [];
        let allPoltrone = [];
        let allSedi = [];

        Promise.all([
            callApi('pazienti:getAll'),
            callApi('staff:getAll'),
            callApi('struttura:getAll'),
            callApi('agenda:getAppuntamenti', { dateFrom: Date.now() - 30 * 86400000, dateTo: Date.now() + 60 * 86400000 })
        ]).then(([pazRes, staffRes, struttRes, appRes]) => {
            if (pazRes && pazRes.success) allPazienti = pazRes.data || [];
            if (staffRes && staffRes.success) allStaff = staffRes.data || [];
            if (struttRes && struttRes.success && struttRes.data) {
                allPoltrone = struttRes.data.poltrone || [];
                allSedi = struttRes.data.sedi || [];
            }
            if (appRes && appRes.success) allExistingAppointments = appRes.data || [];
            showModal();
        }).catch(() => {
            showModal();
        });

        function showModal() {
            const doctors = allStaff.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('igienista') || s.ruolo.includes('direttore'));
            const docOptions = doctors.map(d => `<option value="${d.id}" ${(appointment && appointment.medico_id === d.id) ? 'selected' : ''}>Dr. ${d.cognome} ${d.nome} (${d.ruolo.replace(/_/g, ' ')})</option>`).join('');

            const polOptions = allPoltrone.length > 0
                ? allPoltrone.map(p => {
                    const sede = allSedi.find(s => s.id === p.sede_id);
                    const isSel = (appointment && appointment.poltrona === p.nome) || (!appointment && defaultPoltrona === p.nome);
                    return `<option value="${p.nome}" data-medico-def="${p.medico_default_id || ''}" ${isSel ? 'selected' : ''}>${p.nome} ${sede ? '(' + sede.nome + ')' : ''}</option>`;
                }).join('')
                : `
                    <option value="Unità 1">Unità 1 - Operativa Principale</option>
                    <option value="Unità 2">Unità 2 - Conservativa</option>
                    <option value="Sala Igiene">Sala Igiene & Prevenzione</option>
                    <option value="Sala Chirurgia">Sala Chirurgia & Implantologia</option>
                `;

            const now = new Date();
            const initDate = appointment ? new Date(appointment.data_ora_inizio) : (defaultDate ? new Date(defaultDate) : now);
            const dateStr = initDate.toISOString().split('T')[0];
            const timeStr = initDate.toTimeString().substring(0, 5);

            const modalHtml = renderModal({
                id: 'ds-modal-appuntamento',
                title: isEdit ? 'Modifica Visita Odontoiatrica' : 'Nuovo Appuntamento Clinico',
                icon: 'calendar_month',
                bodyHtml: `
                    <form id="ds-form-appuntamento">
                        <div class="ds-form-grid">
                            <div class="ds-form-field" style="grid-column:1/-1;" id="ds-app-patient-picker-slot"></div>
                            <div class="ds-form-field">
                                <label>Poltrona / Riunito Clinico *</label>
                                <select name="poltrona" id="ds-app-poltrona" class="ds-select" required>
                                    ${polOptions}
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Medico Operatore / Specialista *</label>
                                <select name="medico_id" id="ds-app-medico-id" class="ds-select" required>
                                    <option value="">-- Seleziona Medico --</option>
                                    ${docOptions}
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Data Visita *</label>
                                <input type="date" name="data_visita" id="ds-app-data" class="ds-input" required value="${dateStr}">
                            </div>
                            <div class="ds-form-field">
                                <label>Ora Inizio *</label>
                                <input type="time" name="ora_inizio" id="ds-app-ora" class="ds-input" required value="${timeStr}">
                            </div>
                            <div class="ds-form-field" style="grid-column:1/-1;">
                                <label>Durata (Minuti) *</label>
                                <input type="number" name="durata_minuti" id="ds-app-durata" class="ds-input" required value="${appointment ? appointment.durata_minuti : 30}" min="5" step="5">
                            </div>
                            <div class="ds-form-field" style="grid-column:1/-1;">
                                <label>Motivo della Visita / Prestazione *</label>
                                <input type="text" name="motivo_visita" class="ds-input" required placeholder="Es. Controllo semestrale, Prima visita con ortopanoramica..." value="${appointment ? appointment.motivo_visita : ''}">
                            </div>
                            <div class="ds-form-field" style="grid-column:1/-1;">
                                <label>Note Operative</label>
                                <textarea name="note" class="ds-textarea" rows="2" placeholder="Note per l'assistente o il medico...">${appointment ? (appointment.note || '') : ''}</textarea>
                            </div>
                        </div>
                        <div id="ds-conflict-alert" style="display:none; margin-top:1rem; padding:0.8rem 1rem; background:var(--md-error-container); color:var(--md-on-error-container); border-radius:12px; font-size:0.86rem; font-weight:700;"></div>
                    </form>
                `,
                footerHtml: `
                    <button class="ds-btn ds-btn-ghost" id="ds-m-app-cancel">Annulla</button>
                    <button class="ds-btn ds-btn-primary" id="ds-m-app-save"><span class="material-symbols-rounded">save</span>${isEdit ? 'Salva Modifiche' : 'Conferma Appuntamento'}</button>
                `
            });

            const container = document.createElement('div');
            container.innerHTML = modalHtml;
            const modalEl = container.firstElementChild;
            document.body.appendChild(modalEl);

            const pickerSlot = modalEl.querySelector('#ds-app-patient-picker-slot');
            let selectedPazienteId = appointment ? appointment.paziente_id : '';
            if (pickerSlot) {
                createPatientSearchPicker(pickerSlot, {
                    pazienti: allPazienti,
                    initialPatientId: selectedPazienteId,
                    isRequired: true,
                    label: 'Paziente *',
                    onSelect: (paz) => {
                        selectedPazienteId = paz ? paz.id : '';
                    }
                });
            }

            const poltronaSelect = modalEl.querySelector('#ds-app-poltrona');
            const medicoSelect = modalEl.querySelector('#ds-app-medico-id');

            function syncDefaultDoctor() {
                if (!poltronaSelect || !medicoSelect) return;
                const opt = poltronaSelect.selectedOptions[0];
                if (opt && opt.dataset.medicoDef && !isEdit) {
                    medicoSelect.value = opt.dataset.medicoDef;
                }
            }

            if (poltronaSelect) {
                poltronaSelect.addEventListener('change', syncDefaultDoctor);
                if (!isEdit) syncDefaultDoctor();
            }

            const closeModal = () => modalEl.remove();
            modalEl.querySelector('#ds-modal-close')?.addEventListener('click', closeModal);
            modalEl.querySelector('#ds-m-app-cancel')?.addEventListener('click', closeModal);

            const form = modalEl.querySelector('#ds-form-appuntamento');
            const conflictAlert = modalEl.querySelector('#ds-conflict-alert');

            function checkConflicts() {
                const dataVal = modalEl.querySelector('#ds-app-data').value;
                const oraVal = modalEl.querySelector('#ds-app-ora').value;
                const durataVal = Number(modalEl.querySelector('#ds-app-durata').value) || 30;
                const polVal = poltronaSelect.value;
                const medVal = medicoSelect.value;

                if (!dataVal || !oraVal) return false;

                const startTimestamp = new Date(`${dataVal}T${oraVal}`).getTime();
                const endTimestamp = startTimestamp + durataVal * 60000;

                const conflicts = detectAppointmentConflicts({
                    startTimestamp,
                    endTimestamp,
                    poltrona: polVal,
                    medicoId: medVal,
                    ignoreAppointmentId: appointment ? appointment.id : null,
                    existingAppointments: allExistingAppointments
                });

                if (conflicts.length > 0) {
                    conflictAlert.style.display = 'block';
                    conflictAlert.innerHTML = `<span class="material-symbols-rounded" style="vertical-align:middle; font-size:1.1rem;">warning</span> Attenzione: Rilevata sovrapposizione d'orario per <strong>${conflicts[0].motivo}</strong>!`;
                    return true;
                } else {
                    conflictAlert.style.display = 'none';
                    return false;
                }
            }

            ['#ds-app-data', '#ds-app-ora', '#ds-app-durata', '#ds-app-poltrona', '#ds-app-medico-id'].forEach(sel => {
                modalEl.querySelector(sel)?.addEventListener('change', checkConflicts);
            });

            modalEl.querySelector('#ds-m-app-save')?.addEventListener('click', async () => {
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }
                if (!selectedPazienteId) {
                    alert('Seleziona un paziente dal campo di ricerca.');
                    return;
                }

                const dataVal = modalEl.querySelector('#ds-app-data').value;
                const oraVal = modalEl.querySelector('#ds-app-ora').value;
                const durataVal = Number(modalEl.querySelector('#ds-app-durata').value) || 30;
                const startTimestamp = new Date(`${dataVal}T${oraVal}`).getTime();

                const payload = {
                    paziente_id: selectedPazienteId,
                    medico_id: medicoSelect.value,
                    poltrona: poltronaSelect.value,
                    data_ora_inizio: startTimestamp,
                    durata_minuti: durataVal,
                    motivo_visita: form.querySelector('[name=motivo_visita]').value,
                    note: form.querySelector('[name=note]').value,
                    colore_calendario: '#0d9488'
                };

                if (isEdit) payload.id = appointment.id;

                const res = await callApi('agenda:saveAppuntamento', payload);
                if (res && res.success) {
                    closeModal();
                    if (onSaved) onSaved();
                } else {
                    alert((res && res.error) || 'Errore salvataggio appuntamento');
                }
            });
        }
    } catch (e) {}
}
