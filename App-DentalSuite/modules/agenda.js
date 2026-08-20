import { callApi } from '../shared/api.js';
import { renderHero, renderModal, formatDate, formatDateTime, formatCurrency } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Agenda Poltrone...</p></div>';

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

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'Agenda & Gestione Poltrone',
                        subtitle: 'Pianificazione visite, assegnazione riuniti e monitoraggio stato appuntamenti.',
                        icon: 'calendar_month',
                        actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-app"><span class="material-symbols-rounded">calendar_add_on</span>Nuovo Appuntamento</button>`
                    })}

                    <div class="ds-panel">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">event_note</span>Elenco Appuntamenti Pianificati</div>
                            <span class="ds-badge ds-badge-teal">${appuntamenti.length} Appuntamenti Totali</span>
                        </div>

                        <div class="ds-table-wrap">
                            <table class="ds-table">
                                <thead>
                                    <tr>
                                        <th>Data e Ora</th>
                                        <th>Paziente</th>
                                        <th>Medico</th>
                                        <th>Prestazione / Motivo</th>
                                        <th>Poltrona</th>
                                        <th>Stato</th>
                                        <th style="text-align:right;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${appuntamenti.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessun appuntamento in agenda.</td></tr>' : appuntamenti.map(a => `
                                        <tr>
                                            <td style="font-weight:700;">${formatDateTime(a.data_ora_inizio)}</td>
                                            <td><strong>${a.paziente_cognome || ''} ${a.paziente_nome || ''}</strong><br><small style="color:var(--md-on-surface-variant);">${a.paziente_telefono || a.paziente_cf || ''}</small></td>
                                            <td><span class="ds-badge" style="background:${a.colore_calendario || '#0d9488'}22; color:${a.colore_calendario || '#0d9488'}; font-weight:800;">Dr. ${a.medico_cognome || ''}</span></td>
                                            <td>${a.prestazione_nome || a.motivo || 'Visita di Controllo'}</td>
                                            <td>${a.poltrona || 'Unità 1'}</td>
                                            <td>
                                                <select class="ds-select ds-change-stato" data-id="${a.id}" style="padding:0.25rem 0.5rem; font-size:0.8rem; font-weight:700;">
                                                    <option value="confermato" ${a.stato === 'confermato' ? 'selected' : ''}>Confermato</option>
                                                    <option value="in_attesa" ${a.stato === 'in_attesa' ? 'selected' : ''}>In Attesa Sala</option>
                                                    <option value="in_corso" ${a.stato === 'in_corso' ? 'selected' : ''}>In Corso (Poltrona)</option>
                                                    <option value="completato" ${a.stato === 'completato' ? 'selected' : ''}>Completato</option>
                                                    <option value="disdetto" ${a.stato === 'disdetto' ? 'selected' : ''}>Disdetto</option>
                                                    <option value="assente" ${a.stato === 'assente' ? 'selected' : ''}>Non Presentato</option>
                                                </select>
                                            </td>
                                            <td style="text-align:right;">
                                                <button class="ds-btn ds-btn-danger ds-del-app" data-id="${a.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            el.querySelectorAll('.ds-change-stato').forEach(sel => {
                sel.addEventListener('change', async (e) => {
                    await callApi('agenda:updateStato', { id: sel.dataset.id, stato: e.target.value });
                });
            });

            el.querySelectorAll('.ds-del-app').forEach(b => {
                b.addEventListener('click', async () => {
                    if (!confirm('Eliminare questo appuntamento?')) return;
                    await callApi('agenda:deleteAppuntamento', { id: b.dataset.id });
                    this.render(el, onNavigate, params);
                });
            });

            const btnNew = el.querySelector('#ds-btn-new-app');
            if (btnNew) btnNew.addEventListener('click', () => openAppModal());

            if (params.openNew) {
                openAppModal();
            }

            function openAppModal() {
                const pazOptions = pazienti.map(p => `<option value="${p.id}">${p.cognome} ${p.nome} (${p.codice_fiscale || p.telefono || ''})</option>`).join('');
                const medOptions = staffList.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('igienista') || s.ruolo.includes('direttore')).map(s => `<option value="${s.id}">Dr. ${s.cognome} ${s.nome}</option>`).join('');
                const prestOptions = prestazioni.map(pr => `<option value="${pr.id}">${pr.nome} (${pr.durata_minuti} min - ${formatCurrency(pr.prezzo_paziente)})</option>`).join('');

                const nowD = new Date();
                nowD.setMinutes(Math.ceil(nowD.getMinutes() / 15) * 15);
                const isoStart = new Date(nowD.getTime() - nowD.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

                const modalHtml = renderModal({
                    id: 'ds-modal-agenda',
                    title: 'Pianificazione Nuovo Appuntamento',
                    icon: 'calendar_add_on',
                    bodyHtml: `
                        <form id="ds-form-agenda">
                            <div class="ds-form-grid">
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Paziente *</label>
                                    <select name="paziente_id" class="ds-select" required>
                                        <option value="">-- Seleziona Paziente --</option>
                                        ${pazOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Medico / Operatore *</label>
                                    <select name="medico_id" class="ds-select" required>
                                        <option value="">-- Seleziona Medico --</option>
                                        ${medOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Poltrona / Riunito</label>
                                    <select name="poltrona" class="ds-select">
                                        <option value="Unità 1">Unità 1 (Principale)</option>
                                        <option value="Unità 2">Unità 2 (Conservativa)</option>
                                        <option value="Sala Igiene">Sala Igiene & Profilassi</option>
                                        <option value="Sala Chirurgia">Sala Chirurgia Orale</option>
                                    </select>
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Prestazione dal Listino</label>
                                    <select name="prestazione_id" class="ds-select">
                                        <option value="">-- Nessuna / Controllo Generico --</option>
                                        ${prestOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Data e Ora Inizio *</label>
                                    <input type="datetime-local" name="data_ora_inizio" class="ds-input" required value="${isoStart}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Durata (Minuti)</label>
                                    <input type="number" name="durata_minuti" class="ds-input" value="30">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Motivo della Visita / Note</label>
                                    <input type="text" name="motivo" class="ds-input" placeholder="Es. Controllo semestrale, Dolore molare, Prima visita...">
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-agenda"><span class="material-symbols-rounded">save</span>Fissa Appuntamento</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-agenda');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-agenda').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-agenda');
                        const startVal = form.querySelector('[name=data_ora_inizio]').value;
                        if (!startVal) { alert('Inserisci data e ora di inizio'); return; }
                        const startTs = new Date(startVal).getTime();
                        const durataMin = Number(form.querySelector('[name=durata_minuti]').value) || 30;
                        const endTs = startTs + (durataMin * 60 * 1000);

                        const payload = {
                            paziente_id: form.querySelector('[name=paziente_id]').value,
                            medico_id: form.querySelector('[name=medico_id]').value,
                            poltrona: form.querySelector('[name=poltrona]').value,
                            prestazione_id: form.querySelector('[name=prestazione_id]').value,
                            motivo: form.querySelector('[name=motivo]').value,
                            data_ora_inizio: startTs,
                            data_ora_fine: endTs,
                            stato: 'confermato'
                        };
                        const res = await callApi('agenda:createAppuntamento', payload);
                        if (res && res.success) {
                            close();
                            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Aggiornamento...</p></div>';
                            this.render(el, onNavigate);
                        } else {
                            alert(res.error || 'Errore');
                        }
                    } catch (err) {
                        alert(err.message);
                    }
                });
            }

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
