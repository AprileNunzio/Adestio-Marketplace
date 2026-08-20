import { callApi } from '../shared/api.js';
import { renderHero, formatDateTime } from '../shared/ui_kit.js';
import { openAppointmentModal } from '../components/appointment_modal.js';
import { openNotificationModal } from '../components/notification_modal.js';
import { formatPatientDemographics } from '../shared/formatters.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Agenda Riuniti...</p></div>';

            let selectedPoltrona = 'Tutte';
            let currentDateStr = new Date().toISOString().split('T')[0];

            async function renderCalendar() {
                try {
                    const startDay = new Date(currentDateStr + 'T00:00:00').getTime() - 7 * 86400000;
                    const endDay = new Date(currentDateStr + 'T23:59:59').getTime() + 14 * 86400000;

                    const [appRes, staffRes, pazRes] = await Promise.all([
                        callApi('agenda:getAppuntamenti', { dateFrom: startDay, dateTo: endDay }),
                        callApi('staff:getAll'),
                        callApi('pazienti:getAll')
                    ]);

                    const appuntamenti = (appRes && appRes.success) ? appRes.data : [];
                    const staffList = (staffRes && staffRes.success) ? staffRes.data : [];
                    const pazientiList = (pazRes && pazRes.success) ? pazRes.data : [];

                    const filtered = appuntamenti.filter(a => {
                        const matchP = selectedPoltrona === 'Tutte' || a.poltrona === selectedPoltrona;
                        const aDate = new Date(a.data_ora_inizio).toISOString().split('T')[0];
                        const matchD = aDate === currentDateStr;
                        return matchP && matchD;
                    }).sort((a, b) => a.data_ora_inizio - b.data_ora_inizio);

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: 'Agenda Poltrone & Riuniti Odontoiatrici',
                                subtitle: 'Pianificazione visite, rilevamento sovrapposizioni orarie in tempo reale e promemoria diretti.',
                                icon: 'calendar_month',
                                actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-app"><span class="material-symbols-rounded">calendar_add_on</span>Nuovo Appuntamento</button>`
                            })}

                            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                                <div class="ds-nav">
                                    <button class="ds-nav-btn ${selectedPoltrona === 'Tutte' ? 'active' : ''}" data-pol="Tutte"><span class="material-symbols-rounded">select_all</span>Tutte le Poltrone</button>
                                    <button class="ds-nav-btn ${selectedPoltrona === 'Unità 1' ? 'active' : ''}" data-pol="Unità 1"><span class="material-symbols-rounded">airline_seat_recline_extra</span>Unità 1</button>
                                    <button class="ds-nav-btn ${selectedPoltrona === 'Unità 2' ? 'active' : ''}" data-pol="Unità 2"><span class="material-symbols-rounded">airline_seat_recline_extra</span>Unità 2</button>
                                    <button class="ds-nav-btn ${selectedPoltrona === 'Sala Igiene' ? 'active' : ''}" data-pol="Sala Igiene"><span class="material-symbols-rounded">clean_hands</span>Sala Igiene</button>
                                    <button class="ds-nav-btn ${selectedPoltrona === 'Sala Chirurgia' ? 'active' : ''}" data-pol="Sala Chirurgia"><span class="material-symbols-rounded">medical_services</span>Sala Chirurgia</button>
                                </div>
                                <div style="display:flex; gap:0.6rem; align-items:center;">
                                    <input type="date" id="ds-agenda-date" class="ds-input" style="padding:0.45rem 0.8rem; font-weight:700;" value="${currentDateStr}">
                                    <button class="ds-btn ds-btn-ghost" id="ds-agenda-today" style="padding:0.5rem 0.8rem;">Oggi</button>
                                </div>
                            </div>

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title">
                                        <span class="material-symbols-rounded" style="color:var(--ds-teal);">event</span>
                                        Visite in Programma: ${new Date(currentDateStr).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                    <span class="ds-badge ds-badge-teal">${filtered.length} Visite</span>
                                </div>

                                <div class="ds-table-wrap">
                                    <table class="ds-table">
                                        <thead>
                                            <tr>
                                                <th>Orario & Durata</th>
                                                <th>Paziente & Anagrafica</th>
                                                <th>Poltrona</th>
                                                <th>Medico / Operatore</th>
                                                <th>Motivo Visita</th>
                                                <th>Stato</th>
                                                <th style="text-align:right;">Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${filtered.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--md-on-surface-variant);">Nessuna visita programmata per questa data e poltrona.</td></tr>' : filtered.map(a => {
                                                const dStart = new Date(a.data_ora_inizio);
                                                const timeStart = dStart.toTimeString().substring(0, 5);
                                                const dEnd = new Date(a.data_ora_inizio + a.durata_minuti * 60000);
                                                const timeEnd = dEnd.toTimeString().substring(0, 5);

                                                const pazObj = pazientiList.find(p => p.id === a.paziente_id);
                                                const demo = pazObj ? formatPatientDemographics(pazObj) : '';

                                                return `
                                                    <tr>
                                                        <td>
                                                            <strong style="font-size:0.95rem; color:var(--ds-teal);">${timeStart} - ${timeEnd}</strong>
                                                            <br><small style="color:var(--md-on-surface-variant);">(${a.durata_minuti} min)</small>
                                                        </td>
                                                        <td>
                                                            <strong>${a.paziente_cognome || ''} ${a.paziente_nome || ''}</strong>
                                                            ${demo ? `<br><span class="ds-badge ds-badge-teal" style="font-size:0.7rem; margin-top:0.2rem;">${demo}</span>` : ''}
                                                            ${a.paziente_telefono ? `<br><small style="color:var(--md-on-surface-variant);">Tel: ${a.paziente_telefono}</small>` : ''}
                                                        </td>
                                                        <td><span class="ds-badge ds-badge-teal">${a.poltrona}</span></td>
                                                        <td><span class="ds-badge" style="background:${a.colore_calendario || '#0d9488'}22; color:${a.colore_calendario || '#0d9488'}; font-weight:800;">Dr. ${a.medico_cognome || ''}</span></td>
                                                        <td><strong>${a.motivo_visita}</strong>${a.note ? `<br><small style="color:var(--md-on-surface-variant);">${a.note}</small>` : ''}</td>
                                                        <td>
                                                            <select class="ds-select ds-status-change" data-id="${a.id}" style="padding:0.3rem 0.6rem; font-size:0.8rem; font-weight:700;">
                                                                <option value="programmato" ${a.stato === 'programmato' ? 'selected' : ''}>Programmato</option>
                                                                <option value="confermato" ${a.stato === 'confermato' ? 'selected' : ''}>Confermato</option>
                                                                <option value="in_attesa" ${a.stato === 'in_attesa' ? 'selected' : ''}>In Sala d'Attesa</option>
                                                                <option value="in_poltrona" ${a.stato === 'in_poltrona' ? 'selected' : ''}>Sulla Poltrona</option>
                                                                <option value="completato" ${a.stato === 'completato' ? 'selected' : ''}>Completato</option>
                                                                <option value="annullato" ${a.stato === 'annullato' ? 'selected' : ''}>Annullato</option>
                                                                <option value="mancata_presenza" ${a.stato === 'mancata_presenza' ? 'selected' : ''}>Non Presentato</option>
                                                            </select>
                                                        </td>
                                                        <td style="text-align:right;">
                                                            <div style="display:inline-flex; gap:0.35rem;">
                                                                <button class="ds-btn ds-btn-ghost ds-notify-app" data-id="${a.id}" title="Invia Promemoria WhatsApp / Email" style="padding:0.35rem 0.6rem; color:var(--ds-green);"><span class="material-symbols-rounded" style="font-size:1.1rem;">chat</span></button>
                                                                <button class="ds-btn ds-btn-ghost ds-edit-app" data-id="${a.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">edit</span></button>
                                                                <button class="ds-btn ds-btn-danger ds-del-app" data-id="${a.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;

                    el.querySelector('#ds-btn-new-app').addEventListener('click', () => {
                        openAppointmentModal({
                            defaultDate: currentDateStr + 'T09:00:00',
                            defaultPoltrona: selectedPoltrona === 'Tutte' ? 'Unità 1' : selectedPoltrona,
                            onSaved: () => renderCalendar()
                        });
                    });

                    el.querySelectorAll('.ds-nav-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            selectedPoltrona = btn.dataset.pol;
                            renderCalendar();
                        });
                    });

                    const dateInput = el.querySelector('#ds-agenda-date');
                    if (dateInput) {
                        dateInput.addEventListener('change', (e) => {
                            currentDateStr = e.target.value;
                            renderCalendar();
                        });
                    }

                    const todayBtn = el.querySelector('#ds-agenda-today');
                    if (todayBtn) {
                        todayBtn.addEventListener('click', () => {
                            currentDateStr = new Date().toISOString().split('T')[0];
                            renderCalendar();
                        });
                    }

                    el.querySelectorAll('.ds-status-change').forEach(sel => {
                        sel.addEventListener('change', async () => {
                            await callApi('agenda:updateStato', { id: sel.dataset.id, stato: sel.value });
                        });
                    });

                    el.querySelectorAll('.ds-edit-app').forEach(b => {
                        b.addEventListener('click', () => {
                            const app = appuntamenti.find(item => item.id === b.dataset.id);
                            if (app) openAppointmentModal({ appointment: app, onSaved: () => renderCalendar() });
                        });
                    });

                    el.querySelectorAll('.ds-del-app').forEach(b => {
                        b.addEventListener('click', async () => {
                            if (!confirm('Eliminare questo appuntamento?')) return;
                            await callApi('agenda:deleteAppuntamento', { id: b.dataset.id });
                            renderCalendar();
                        });
                    });

                    el.querySelectorAll('.ds-notify-app').forEach(b => {
                        b.addEventListener('click', () => {
                            const app = appuntamenti.find(item => item.id === b.dataset.id);
                            if (app) {
                                const paz = pazientiList.find(p => p.id === app.paziente_id) || {
                                    id: app.paziente_id,
                                    nome: app.paziente_nome,
                                    cognome: app.paziente_cognome,
                                    telefono: app.paziente_telefono,
                                    email: app.paziente_email
                                };
                                const med = staffList.find(s => s.id === app.medico_id);
                                openNotificationModal({
                                    paziente: paz,
                                    appuntamento: app,
                                    medico: med
                                });
                            }
                        });
                    });

                    if (params.openNew) {
                        openAppointmentModal({
                            defaultDate: currentDateStr + 'T09:00:00',
                            defaultPoltrona: selectedPoltrona === 'Tutte' ? 'Unità 1' : selectedPoltrona,
                            onSaved: () => renderCalendar()
                        });
                    }
                } catch (e) {
                    el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
                }
            }

            renderCalendar();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
