import { callApi } from '../shared/api.js';
import { renderModal } from '../shared/ui_kit.js';
import { detectAppointmentConflicts } from '../domain/appointment_validator.js';
import { createPatientSearchPicker } from './patient_search_picker.js';

export function openAppointmentModal({ appointment = null, defaultDate = null, defaultPoltrona = 'Unità 1', onSaved }) {
    try {
        const isEdit = !!appointment;
        let allPazienti = [];
        let allStaff = [];
        let allExistingAppointments = [];

        Promise.all([
            callApi('pazienti:getAll'),
            callApi('staff:getAll'),
            callApi('agenda:getAppuntamenti', { dateFrom: Date.now() - 30 * 86400000, dateTo: Date.now() + 60 * 86400000 })
        ]).then(([pazRes, staffRes, appRes]) => {
            if (pazRes && pazRes.success) allPazienti = pazRes.data || [];
            if (staffRes && staffRes.success) allStaff = staffRes.data || [];
            if (appRes && appRes.success) allExistingAppointments = appRes.data || [];
            showModal();
        }).catch(() => {
            showModal();
        });

        function showModal() {
            const doctors = allStaff.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('igienista') || s.ruolo.includes('direttore'));
            const docOptions = doctors.map(d => `<option value="${d.id}" ${(appointment && appointment.medico_id === d.id) ? 'selected' : ''}>Dr. ${d.cognome} ${d.nome} (${d.ruolo.replace(/_/g, ' ')})</option>`).join('');

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
                            <div class="ds-form-field" style="grid-column:1/-1;">
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
                            <div class="ds-form-field">
                                <label>Durata (Minuti) *</label>
                                <input type="number" name="durata_minuti" id="ds-app-durata" class="ds-input" required value="${appointment ? appointment.durata_minuti : 30}" min="5" step="5">
                            </div>
                            <div class="ds-form-field">
                                <label>Poltrona / Riunito Clinico *</label>
                                <select name="poltrona" id="ds-app-poltrona" class="ds-select" required>
                                    <option value="Unità 1" ${(appointment ? appointment.poltrona : defaultPoltrona) === 'Unità 1' ? 'selected' : ''}>Unità 1 - Operativa Principale</option>
                                    <option value="Unità 2" ${(appointment ? appointment.poltrona : defaultPoltrona) === 'Unità 2' ? 'selected' : ''}>Unità 2 - Conservativa</option>
                                    <option value="Sala Igiene" ${(appointment ? appointment.poltrona : defaultPoltrona) === 'Sala Igiene' ? 'selected' : ''}>Sala Igiene & Prevenzione</option>
                                    <option value="Sala Chirurgia" ${(appointment ? appointment.poltrona : defaultPoltrona) === 'Sala Chirurgia' ? 'selected' : ''}>Sala Chirurgia & Implantologia</option>
                                </select>
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
                    <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                    <button type="button" class="ds-btn ds-btn-primary" id="ds-save-app-btn"><span class="material-symbols-rounded">event_available</span>Salva Appuntamento</button>
                `
            });

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);
            const mEl = modalContainer.querySelector('#ds-modal-appuntamento');
            mEl.style.display = 'flex';

            const close = () => { modalContainer.remove(); };
            mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

            const patientPicker = createPatientSearchPicker({
                pazienti: allPazienti,
                initialPazienteId: appointment ? appointment.paziente_id : null
            });
            const pickerSlot = mEl.querySelector('#ds-app-patient-picker-slot');
            if (pickerSlot) pickerSlot.appendChild(patientPicker.element);

            function checkConflicts() {
                try {
                    const dataV = mEl.querySelector('#ds-app-data').value;
                    const oraV = mEl.querySelector('#ds-app-ora').value;
                    const durataV = Number(mEl.querySelector('#ds-app-durata').value) || 30;
                    const medicoIdV = mEl.querySelector('#ds-app-medico-id').value;
                    const poltronaV = mEl.querySelector('#ds-app-poltrona').value;

                    if (!dataV || !oraV) return [];

                    const start = new Date(`${dataV}T${oraV}:00`).getTime();
                    const candidate = {
                        id: appointment ? appointment.id : null,
                        data_ora_inizio: start,
                        durata_minuti: durataV,
                        medico_id: medicoIdV,
                        poltrona: poltronaV
                    };

                    const conflicts = detectAppointmentConflicts(candidate, allExistingAppointments);
                    const alertEl = mEl.querySelector('#ds-conflict-alert');
                    if (conflicts.length > 0) {
                        alertEl.style.display = 'block';
                        alertEl.innerHTML = `<span class="material-symbols-rounded" style="vertical-align:middle; margin-right:4px;">warning</span> <strong>Attenzione Sovrapposizione:</strong><br>` + conflicts.map(c => c.reason).join('<br>');
                    } else {
                        alertEl.style.display = 'none';
                        alertEl.innerHTML = '';
                    }
                    return conflicts;
                } catch (e) {
                    return [];
                }
            }

            ['#ds-app-data', '#ds-app-ora', '#ds-app-durata', '#ds-app-medico-id', '#ds-app-poltrona'].forEach(sel => {
                const f = mEl.querySelector(sel);
                if (f) f.addEventListener('change', checkConflicts);
            });

            mEl.querySelector('#ds-save-app-btn').addEventListener('click', async () => {
                try {
                    const pazienteId = patientPicker.getSelectedPazienteId();
                    if (!pazienteId) {
                        alert('Seleziona un paziente.');
                        return;
                    }

                    const form = mEl.querySelector('#ds-form-appuntamento');
                    const dataV = form.querySelector('#ds-app-data').value;
                    const oraV = form.querySelector('#ds-app-ora').value;
                    if (!dataV || !oraV) {
                        alert('Inserisci data e ora.');
                        return;
                    }

                    const startTimestamp = new Date(`${dataV}T${oraV}:00`).getTime();
                    const conflicts = checkConflicts();
                    if (conflicts.length > 0) {
                        if (!confirm('Rilevata collisione di orario o poltrona. Vuoi forzare comunque il salvataggio?')) return;
                    }

                    const payload = {
                        paziente_id: pazienteId,
                        medico_id: form.querySelector('[name=medico_id]').value,
                        data_ora_inizio: startTimestamp,
                        durata_minuti: Number(form.querySelector('[name=durata_minuti]').value) || 30,
                        poltrona: form.querySelector('[name=poltrona]').value,
                        motivo_visita: form.querySelector('[name=motivo_visita]').value,
                        note: form.querySelector('[name=note]').value,
                        stato: appointment ? appointment.stato : 'programmato'
                    };

                    if (isEdit) payload.id = appointment.id;
                    const action = isEdit ? 'agenda:updateAppuntamento' : 'agenda:createAppuntamento';
                    const res = await callApi(action, payload);

                    if (res && res.success) {
                        close();
                        if (typeof onSaved === 'function') onSaved();
                    } else {
                        alert(res.error || 'Errore');
                    }
                } catch (err) {
                    alert(err.message);
                }
            });
        }
    } catch (e) {}
}
