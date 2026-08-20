import { callApi } from '../shared/api.js';
import { renderModal, formatCurrency } from '../shared/ui_kit.js';
import { detectAppointmentConflicts } from '../domain/appointment_validator.js';

export function openAppointmentModal({ appuntamento = null, existingAppointments = [], staffList = [], prestazioni = [], pazienti = [], onSaved }) {
    try {
        const isEdit = !!appuntamento;
        const pazOptions = pazienti.map(p => `<option value="${p.id}" ${appuntamento && appuntamento.paziente_id === p.id ? 'selected' : ''}>${p.cognome} ${p.nome} (${p.codice_fiscale || p.telefono || ''})</option>`).join('');
        const medOptions = staffList.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('igienista') || s.ruolo.includes('direttore')).map(s => `<option value="${s.id}" ${appuntamento && appuntamento.medico_id === s.id ? 'selected' : ''}>Dr. ${s.cognome} ${s.nome}</option>`).join('');
        const prestOptions = prestazioni.map(pr => `<option value="${pr.id}" data-durata="${pr.durata_minuti}" data-prezzo="${pr.prezzo_paziente}" ${appuntamento && appuntamento.prestazione_id === pr.id ? 'selected' : ''}>${pr.nome} (${pr.durata_minuti} min - ${formatCurrency(pr.prezzo_paziente)})</option>`).join('');

        let defaultIso = '';
        if (appuntamento && appuntamento.data_ora_inizio) {
            const ad = new Date(appuntamento.data_ora_inizio);
            defaultIso = new Date(ad.getTime() - ad.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        } else {
            const nowD = new Date();
            nowD.setMinutes(Math.ceil(nowD.getMinutes() / 15) * 15);
            defaultIso = new Date(nowD.getTime() - nowD.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }

        const modalHtml = renderModal({
            id: 'ds-modal-app-form',
            title: isEdit ? 'Modifica Appuntamento & Poltrona' : 'Nuovo Appuntamento Clinico',
            icon: 'calendar_add_on',
            bodyHtml: `
                <form id="ds-form-app-edit">
                    <div id="ds-app-conflict-alert" style="display:none; background:#fee2e2; color:#991b1b; padding:0.8rem 1rem; border-radius:12px; border:1px solid #f87171; margin-bottom:1rem; font-size:0.85rem; font-weight:700;"></div>

                    <div class="ds-form-grid">
                        <div class="ds-form-field" style="grid-column:1/-1;">
                            <label>Paziente *</label>
                            <select name="paziente_id" class="ds-select" required>
                                <option value="">-- Seleziona Paziente --</option>
                                ${pazOptions}
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Medico Referente *</label>
                            <select name="medico_id" class="ds-select" required>
                                <option value="">-- Seleziona Medico --</option>
                                ${medOptions}
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Poltrona / Riunito *</label>
                            <select name="poltrona" class="ds-select" required>
                                <option value="Unità 1" ${appuntamento && appuntamento.poltrona === 'Unità 1' ? 'selected' : ''}>Unità 1 (Principale)</option>
                                <option value="Unità 2" ${appuntamento && appuntamento.poltrona === 'Unità 2' ? 'selected' : ''}>Unità 2 (Conservativa)</option>
                                <option value="Sala Igiene" ${appuntamento && appuntamento.poltrona === 'Sala Igiene' ? 'selected' : ''}>Sala Igiene & Profilassi</option>
                                <option value="Sala Chirurgia" ${appuntamento && appuntamento.poltrona === 'Sala Chirurgia' ? 'selected' : ''}>Sala Chirurgia Orale</option>
                            </select>
                        </div>
                        <div class="ds-form-field" style="grid-column:1/-1;">
                            <label>Prestazione Programmata</label>
                            <select name="prestazione_id" id="ds-sel-app-prest" class="ds-select">
                                <option value="">-- Visita Generica / Controllo --</option>
                                ${prestOptions}
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Data e Ora Inizio *</label>
                            <input type="datetime-local" name="data_ora_inizio" class="ds-input" required value="${defaultIso}">
                        </div>
                        <div class="ds-form-field">
                            <label>Durata Stimata (Minuti) *</label>
                            <input type="number" name="durata_minuti" class="ds-input" required value="${appuntamento ? Math.round((appuntamento.data_ora_fine - appuntamento.data_ora_inizio)/60000) : 30}">
                        </div>
                        <div class="ds-form-field">
                            <label>Stato Visita</label>
                            <select name="stato" class="ds-select">
                                <option value="confermato" ${appuntamento && appuntamento.stato === 'confermato' ? 'selected' : ''}>Confermato</option>
                                <option value="in_attesa" ${appuntamento && appuntamento.stato === 'in_attesa' ? 'selected' : ''}>In Sala d'Attesa</option>
                                <option value="in_corso" ${appuntamento && appuntamento.stato === 'in_corso' ? 'selected' : ''}>Sulla Poltrona (In Corso)</option>
                                <option value="completato" ${appuntamento && appuntamento.stato === 'completato' ? 'selected' : ''}>Completato</option>
                                <option value="disdetto" ${appuntamento && appuntamento.stato === 'disdetto' ? 'selected' : ''}>Disdetto</option>
                                <option value="assente" ${appuntamento && appuntamento.stato === 'assente' ? 'selected' : ''}>Non Presentato</option>
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Motivo / Note Cliniche</label>
                            <input type="text" name="motivo" class="ds-input" placeholder="Es. Controllo, Igiene, Dolore..." value="${appuntamento ? appuntamento.motivo : ''}">
                        </div>
                    </div>
                </form>
            `,
            footerHtml: `
                <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                <button type="button" class="ds-btn ds-btn-primary" id="ds-btn-save-app"><span class="material-symbols-rounded">save</span>${isEdit ? 'Aggiorna Appuntamento' : 'Salva Appuntamento'}</button>
            `
        });

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const mEl = modalContainer.querySelector('#ds-modal-app-form');
        mEl.style.display = 'flex';

        const close = () => { modalContainer.remove(); };
        mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

        const prestSelect = mEl.querySelector('#ds-sel-app-prest');
        if (prestSelect) {
            prestSelect.addEventListener('change', () => {
                const opt = prestSelect.selectedOptions[0];
                if (opt && opt.dataset.durata) {
                    mEl.querySelector('[name=durata_minuti]').value = opt.dataset.durata;
                }
            });
        }

        mEl.querySelector('#ds-btn-save-app').addEventListener('click', async () => {
            try {
                const form = mEl.querySelector('#ds-form-app-edit');
                const startVal = form.querySelector('[name=data_ora_inizio]').value;
                if (!startVal) { alert('Seleziona data e ora'); return; }

                const startTs = new Date(startVal).getTime();
                const durataMin = Number(form.querySelector('[name=durata_minuti]').value) || 30;
                const endTs = startTs + (durataMin * 60 * 1000);

                const medicoId = form.querySelector('[name=medico_id]').value;
                const poltrona = form.querySelector('[name=poltrona]').value;
                const pazienteId = form.querySelector('[name=paziente_id]').value;

                const conflictCheck = detectAppointmentConflicts({
                    existingAppointments,
                    newAppointment: {
                        medico_id: medicoId,
                        poltrona,
                        data_ora_inizio: startTs,
                        data_ora_fine: endTs
                    },
                    excludeId: appuntamento ? appuntamento.id : null
                });

                if (conflictCheck.hasConflict) {
                    const alertBox = mEl.querySelector('#ds-app-conflict-alert');
                    alertBox.style.display = 'block';
                    alertBox.innerHTML = `<span class="material-symbols-rounded" style="vertical-align:middle; font-size:1.1rem;">warning</span> <strong>Rilevata sovrapposizione:</strong><br>` + conflictCheck.reasons.join('<br>');
                    if (!confirm('Attenzione: sono state rilevate sovrapposizioni orarie! Vuoi forzare comunque il salvataggio?')) {
                        return;
                    }
                }

                const payload = {
                    paziente_id: pazienteId,
                    medico_id: medicoId,
                    poltrona,
                    prestazione_id: form.querySelector('[name=prestazione_id]').value,
                    motivo: form.querySelector('[name=motivo]').value,
                    data_ora_inizio: startTs,
                    data_ora_fine: endTs,
                    stato: form.querySelector('[name=stato]').value
                };

                if (isEdit) payload.id = appuntamento.id;

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
    } catch (e) {}
}
