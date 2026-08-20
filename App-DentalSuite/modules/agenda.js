import { callApi } from '../shared/api.js';
import { renderHero, formatDate } from '../shared/ui_kit.js';
import { openAppointmentModal } from '../components/appointment_modal.js';
import { openNotificationModal } from '../components/notification_modal.js';
import { formatPatientDemographics } from '../shared/formatters.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Agenda Poltrone...</p></div>';

            let selectedDate = new Date();
            let allAppointments = [];
            let allStaff = [];
            let allPazienti = [];
            let allSedi = [];
            let allPoltrone = [];
            let selectedSedeId = 'tutte';

            async function loadData() {
                try {
                    const dateFrom = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0).getTime();
                    const dateTo = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59).getTime();

                    const [appRes, staffRes, pazRes, struttRes] = await Promise.all([
                        callApi('agenda:getAppuntamenti', { dateFrom, dateTo }),
                        callApi('staff:getAll'),
                        callApi('pazienti:getAll'),
                        callApi('struttura:getAll')
                    ]);

                    if (appRes && appRes.success) allAppointments = appRes.data || [];
                    if (staffRes && staffRes.success) allStaff = staffRes.data || [];
                    if (pazRes && pazRes.success) allPazienti = pazRes.data || [];
                    if (struttRes && struttRes.success && struttRes.data) {
                        allSedi = struttRes.data.sedi || [];
                        allPoltrone = struttRes.data.poltrone || [];
                    }
                } catch (e) {}
            }

            await loadData();

            function renderCalendar() {
                try {
                    const dateStr = selectedDate.toISOString().split('T')[0];
                    const dateDisplay = selectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

                    const filteredPoltrone = selectedSedeId === 'tutte'
                        ? allPoltrone
                        : allPoltrone.filter(p => p.sede_id === selectedSedeId);

                    const poltroneHeaders = filteredPoltrone.length > 0
                        ? filteredPoltrone.map(p => p.nome)
                        : ['Unità 1', 'Unità 2', 'Sala Igiene', 'Sala Chirurgia'];

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: 'Agenda Poltrone & Sale Operative',
                                subtitle: 'Planning giornaliero appuntamenti, assegnazione automatica medici e promemoria multicanale.',
                                icon: 'calendar_month',
                                actionsHtml: `
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-new-app"><span class="material-symbols-rounded">add</span>Nuovo Appuntamento</button>
                                `
                            })}

                            <div class="ds-panel">
                                <div class="ds-panel-header" style="flex-wrap:wrap; gap:1rem;">
                                    <div style="display:flex; align-items:center; gap:0.6rem;">
                                        <button class="ds-btn ds-btn-ghost" id="ds-btn-prev-day"><span class="material-symbols-rounded">chevron_left</span></button>
                                        <input type="date" id="ds-date-picker" class="ds-input" style="font-weight:700; width:auto;" value="${dateStr}">
                                        <button class="ds-btn ds-btn-ghost" id="ds-btn-next-day"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button class="ds-btn ds-btn-ghost" id="ds-btn-today" style="font-size:0.82rem; font-weight:700;">Oggi</button>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:0.6rem;">
                                        <label style="font-size:0.8rem; font-weight:700; color:var(--md-on-surface-variant);">Sede:</label>
                                        <select id="ds-filter-sede" class="ds-select" style="width:auto; font-size:0.85rem;">
                                            <option value="tutte" ${selectedSedeId === 'tutte' ? 'selected' : ''}>Tutte le Sedi</option>
                                            ${allSedi.map(s => `<option value="${s.id}" ${selectedSedeId === s.id ? 'selected' : ''}>${s.nome}</option>`).join('')}
                                        </select>
                                        <span class="ds-badge ds-badge-teal">${allAppointments.length} Visite in Giornata</span>
                                    </div>
                                </div>

                                <div class="ds-table-wrap">
                                    <table class="ds-table">
                                        <thead>
                                            <tr>
                                                <th style="width:90px;">Orario</th>
                                                <th>Paziente & Dati Anagrafici</th>
                                                <th>Poltrona / Sala</th>
                                                <th>Medico / Specialista</th>
                                                <th>Motivo della Visita</th>
                                                <th>Stato</th>
                                                <th style="text-align:right;">Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${allAppointments.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--md-on-surface-variant);">Nessun appuntamento programmato per ' + dateDisplay + '.</td></tr>' : allAppointments.map(app => {
                                                const paz = allPazienti.find(p => p.id === app.paziente_id);
                                                const med = allStaff.find(s => s.id === app.medico_id);
                                                const d = new Date(app.data_ora_inizio);
                                                const timeFmt = d.toTimeString().substring(0, 5);
                                                const demo = paz ? formatPatientDemographics(paz) : '';

                                                return `
                                                    <tr>
                                                        <td><strong style="font-size:1rem; color:var(--ds-teal);">${timeFmt}</strong><br><small style="color:var(--md-on-surface-variant);">${app.durata_minuti} min</small></td>
                                                        <td>
                                                            <strong>${paz ? paz.cognome + ' ' + paz.nome : 'Paziente'}</strong>
                                                            ${demo ? `<br><span class="ds-badge ds-badge-teal" style="font-size:0.7rem; margin-top:2px;">${demo}</span>` : ''}
                                                        </td>
                                                        <td><span class="ds-badge ds-badge-blue">${app.poltrona}</span></td>
                                                        <td>${med ? 'Dr. ' + med.cognome + ' ' + med.nome : '-'}</td>
                                                        <td>${app.motivo_visita}</td>
                                                        <td><span class="ds-badge ds-badge-green">${app.stato.toUpperCase()}</span></td>
                                                        <td style="text-align:right;">
                                                            <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
                                                                ${paz ? `<button class="ds-btn ds-btn-ghost ds-notify-btn" data-id="${app.id}" title="Invia Notifica / WhatsApp"><span class="material-symbols-rounded" style="font-size:1.1rem; color:var(--ds-green);">chat</span></button>` : ''}
                                                                <button class="ds-btn ds-btn-ghost ds-edit-app-btn" data-id="${app.id}"><span class="material-symbols-rounded" style="font-size:1.1rem;">edit</span></button>
                                                                <button class="ds-btn ds-btn-danger ds-del-app-btn" data-id="${app.id}"><span class="material-symbols-rounded" style="font-size:1.1rem;">delete</span></button>
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
                        openAppointmentModal({ defaultDate: selectedDate, onSaved: async () => { await loadData(); renderCalendar(); } });
                    });

                    el.querySelector('#ds-filter-sede').addEventListener('change', (e) => {
                        selectedSedeId = e.target.value;
                        renderCalendar();
                    });

                    el.querySelector('#ds-date-picker').addEventListener('change', async (e) => {
                        selectedDate = new Date(e.target.value);
                        await loadData();
                        renderCalendar();
                    });

                    el.querySelector('#ds-btn-prev-day').addEventListener('click', async () => {
                        selectedDate.setDate(selectedDate.getDate() - 1);
                        await loadData();
                        renderCalendar();
                    });

                    el.querySelector('#ds-btn-next-day').addEventListener('click', async () => {
                        selectedDate.setDate(selectedDate.getDate() + 1);
                        await loadData();
                        renderCalendar();
                    });

                    el.querySelector('#ds-btn-today').addEventListener('click', async () => {
                        selectedDate = new Date();
                        await loadData();
                        renderCalendar();
                    });

                    el.querySelectorAll('.ds-notify-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const app = allAppointments.find(a => a.id === btn.dataset.id);
                            if (app) {
                                const paz = allPazienti.find(p => p.id === app.paziente_id);
                                if (paz) openNotificationModal({ paziente: paz, appointment: app });
                            }
                        });
                    });

                    el.querySelectorAll('.ds-edit-app-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const app = allAppointments.find(a => a.id === btn.dataset.id);
                            if (app) {
                                openAppointmentModal({ appointment: app, onSaved: async () => { await loadData(); renderCalendar(); } });
                            }
                        });
                    });

                    el.querySelectorAll('.ds-del-app-btn').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            if (!confirm('Eliminare questo appuntamento?')) return;
                            await callApi('agenda:deleteAppuntamento', { id: btn.dataset.id });
                            await loadData();
                            renderCalendar();
                        });
                    });

                } catch (e) {}
            }

            renderCalendar();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
