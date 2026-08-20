import { callApi } from '../shared/api.js';
import { renderHero, formatDate, formatDateTime, formatCurrency } from '../shared/ui_kit.js';
import { openAppointmentModal } from '../components/appointment_modal.js';
import { openNotificationModal } from '../components/notification_modal.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Agenda Odontoiatrica...</p></div>';

            const [appRes, staffRes, prestRes, pazRes] = await Promise.all([
                callApi('agenda:getAppuntamenti'),
                callApi('staff:getAll'),
                callApi('prestazioni:getAll'),
                callApi('pazienti:getAll')
            ]);

            const appuntamenti = (appRes && appRes.success) ? appRes.data : [];
            const staffList = (staffRes && staffRes.success) ? staffRes.data : [];
            const prestazioni = (prestRes && prestRes.success) ? prestRes.data : [];
            const pazienti = (pazRes && pazRes.success) ? pazRes.data : [];

            let selectedPoltrona = 'all';
            let selectedDateFilter = '';

            function renderAgenda() {
                try {
                    let filtered = appuntamenti;
                    if (selectedPoltrona !== 'all') {
                        filtered = filtered.filter(a => a.poltrona === selectedPoltrona);
                    }
                    if (selectedDateFilter) {
                        filtered = filtered.filter(a => {
                            const d = new Date(a.data_ora_inizio).toISOString().split('T')[0];
                            return d === selectedDateFilter;
                        });
                    }

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: 'Agenda & Gestione Poltrone',
                                subtitle: 'Pianificazione visite, assegnazione riuniti, invio manuale notifiche WhatsApp/Email e rilevamento conflitti orari.',
                                icon: 'calendar_month',
                                actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-app"><span class="material-symbols-rounded">calendar_add_on</span>Nuovo Appuntamento</button>`
                            })}

                            <div class="ds-panel">
                                <div class="ds-panel-header" style="flex-wrap:wrap; gap:0.8rem;">
                                    <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap;">
                                        <select id="ds-filter-poltrona" class="ds-select" style="padding:0.4rem 0.8rem; font-size:0.85rem; font-weight:700;">
                                            <option value="all" ${selectedPoltrona === 'all' ? 'selected' : ''}>Tutte le Poltrone</option>
                                            <option value="Unità 1" ${selectedPoltrona === 'Unità 1' ? 'selected' : ''}>Unità 1 (Principale)</option>
                                            <option value="Unità 2" ${selectedPoltrona === 'Unità 2' ? 'selected' : ''}>Unità 2 (Conservativa)</option>
                                            <option value="Sala Igiene" ${selectedPoltrona === 'Sala Igiene' ? 'selected' : ''}>Sala Igiene & Profilassi</option>
                                            <option value="Sala Chirurgia" ${selectedPoltrona === 'Sala Chirurgia' ? 'selected' : ''}>Sala Chirurgia Orale</option>
                                        </select>
                                        <input type="date" id="ds-filter-date" class="ds-input" style="padding:0.4rem 0.8rem; font-size:0.85rem;" value="${selectedDateFilter}">
                                        ${selectedDateFilter ? '<button class="ds-btn ds-btn-ghost" id="ds-clear-date" style="padding:0.4rem 0.6rem; font-size:0.8rem;">Tutti i Giorni</button>' : ''}
                                    </div>
                                    <span class="ds-badge ds-badge-teal">${filtered.length} Appuntamenti Visualizzati</span>
                                </div>

                                <div class="ds-table-wrap">
                                    <table class="ds-table">
                                        <thead>
                                            <tr>
                                                <th>Data e Ora</th>
                                                <th>Paziente & Contatti</th>
                                                <th>Medico</th>
                                                <th>Prestazione / Motivo</th>
                                                <th>Poltrona</th>
                                                <th>Stato</th>
                                                <th style="text-align:right;">Comunicazione & Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${filtered.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessun appuntamento per i filtri selezionati.</td></tr>' : filtered.map(a => {
                                                const paz = pazienti.find(p => p.id === a.paziente_id) || { nome: a.paziente_nome, cognome: a.paziente_cognome, telefono: a.paziente_telefono, id: a.paziente_id };
                                                return `
                                                    <tr>
                                                        <td style="font-weight:700;">${formatDateTime(a.data_ora_inizio)}</td>
                                                        <td><strong>${a.paziente_cognome || ''} ${a.paziente_nome || ''}</strong><br><small style="color:var(--md-on-surface-variant);">Tel: ${a.paziente_telefono || '-'}</small></td>
                                                        <td><span class="ds-badge" style="background:${a.colore_calendario || '#0d9488'}22; color:${a.colore_calendario || '#0d9488'}; font-weight:800;">Dr. ${a.medico_cognome || ''}</span></td>
                                                        <td>${a.prestazione_nome || a.motivo || 'Visita di Controllo'}</td>
                                                        <td><span class="ds-badge ds-badge-teal">${a.poltrona || 'Unità 1'}</span></td>
                                                        <td>
                                                            <select class="ds-select ds-change-stato" data-id="${a.id}" style="padding:0.25rem 0.5rem; font-size:0.8rem; font-weight:700;">
                                                                <option value="confermato" ${a.stato === 'confermato' ? 'selected' : ''}>Confermato</option>
                                                                <option value="in_attesa" ${a.stato === 'in_attesa' ? 'selected' : ''}>In Sala d'Attesa</option>
                                                                <option value="in_corso" ${a.stato === 'in_corso' ? 'selected' : ''}>In Corso (Poltrona)</option>
                                                                <option value="completato" ${a.stato === 'completato' ? 'selected' : ''}>Completato</option>
                                                                <option value="disdetto" ${a.stato === 'disdetto' ? 'selected' : ''}>Disdetto</option>
                                                                <option value="assente" ${a.stato === 'assente' ? 'selected' : ''}>Non Presentato</option>
                                                            </select>
                                                        </td>
                                                        <td style="text-align:right;">
                                                            <div style="display:inline-flex; gap:0.35rem; align-items:center;">
                                                                <button class="ds-btn ds-btn-ghost ds-notify-app" data-id="${a.id}" title="Invia Promemoria WhatsApp / Email" style="padding:0.35rem 0.6rem; color:var(--ds-green);"><span class="material-symbols-rounded" style="font-size:1.1rem;">chat</span></button>
                                                                <button class="ds-btn ds-btn-ghost ds-edit-app" data-id="${a.id}" title="Modifica" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1.1rem;">edit</span></button>
                                                                <button class="ds-btn ds-btn-danger ds-del-app" data-id="${a.id}" title="Elimina" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1.1rem;">delete</span></button>
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

                    el.querySelector('#ds-filter-poltrona').addEventListener('change', (e) => {
                        selectedPoltrona = e.target.value;
                        renderAgenda();
                    });

                    el.querySelector('#ds-filter-date').addEventListener('change', (e) => {
                        selectedDateFilter = e.target.value;
                        renderAgenda();
                    });

                    const clearDateBtn = el.querySelector('#ds-clear-date');
                    if (clearDateBtn) {
                        clearDateBtn.addEventListener('click', () => {
                            selectedDateFilter = '';
                            renderAgenda();
                        });
                    }

                    el.querySelectorAll('.ds-change-stato').forEach(sel => {
                        sel.addEventListener('change', async (e) => {
                            await callApi('agenda:updateStato', { id: sel.dataset.id, stato: e.target.value });
                        });
                    });

                    el.querySelectorAll('.ds-notify-app').forEach(b => {
                        b.addEventListener('click', () => {
                            const app = appuntamenti.find(a => a.id === b.dataset.id);
                            if (app) {
                                const paz = pazienti.find(p => p.id === app.paziente_id) || { nome: app.paziente_nome, cognome: app.paziente_cognome, telefono: app.paziente_telefono, id: app.paziente_id };
                                openNotificationModal({ paziente: paz, appuntamento: app });
                            }
                        });
                    });

                    el.querySelectorAll('.ds-edit-app').forEach(b => {
                        b.addEventListener('click', () => {
                            const app = appuntamenti.find(a => a.id === b.dataset.id);
                            if (app) {
                                openAppointmentModal({
                                    appuntamento: app,
                                    existingAppointments: appuntamenti,
                                    staffList, prestazioni, pazienti,
                                    onSaved: () => this.render(el, onNavigate)
                                });
                            }
                        });
                    });

                    el.querySelectorAll('.ds-del-app').forEach(b => {
                        b.addEventListener('click', async () => {
                            if (!confirm('Eliminare questo appuntamento?')) return;
                            await callApi('agenda:deleteAppuntamento', { id: b.dataset.id });
                            this.render(el, onNavigate);
                        });
                    });

                    el.querySelector('#ds-btn-new-app').addEventListener('click', () => {
                        openAppointmentModal({
                            appuntamento: null,
                            existingAppointments: appuntamenti,
                            staffList, prestazioni, pazienti,
                            onSaved: () => this.render(el, onNavigate)
                        });
                    });

                } catch (err) {}
            }

            renderAgenda();

            if (params.openNew) {
                openAppointmentModal({
                    appuntamento: null,
                    existingAppointments: appuntamenti,
                    staffList, prestazioni, pazienti,
                    onSaved: () => this.render(el, onNavigate)
                });
            }

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
