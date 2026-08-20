import { callApi } from '../shared/api.js';
import { renderHero, renderModal, formatCurrency, formatDate , showNotification } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Personale & Collaboratori...</p></div>';

            const [staffRes, liqRes] = await Promise.all([
                callApi('staff:getAll'),
                callApi('staff:getLiquidazioni')
            ]);

            const staffList = (staffRes && staffRes.success) ? staffRes.data : [];
            const liquidazioni = (liqRes && liqRes.success) ? liqRes.data : [];

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'Gestione Staff & Collaboratori',
                        subtitle: 'Medici specialisti, igienisti, assistenti alla poltrona ASO, segreteria e liquidazioni provvigionali.',
                        icon: 'group',
                        actionsHtml: `
                            <button class="ds-btn ds-btn-hero" id="ds-btn-new-staff"><span class="material-symbols-rounded">person_add</span>Nuovo Membro</button>
                            <button class="ds-btn ds-btn-hero" id="ds-btn-new-liq"><span class="material-symbols-rounded">receipt_long</span>Registra Liquidazione</button>
                        `
                    })}

                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1.2rem;">
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">badge</span>Elenco Collaboratori dello Studio</div>
                                <span class="ds-badge ds-badge-teal">${staffList.length} Membri</span>
                            </div>

                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Nome e Cognome</th>
                                            <th>Ruolo & Specializzazione</th>
                                            <th>Albo / CF</th>
                                            <th>Compenso Predefinito</th>
                                            <th style="text-align:right;">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${staffList.map(s => `
                                            <tr>
                                                <td>
                                                    <div style="display:flex; align-items:center; gap:0.5rem;">
                                                        <span class="material-symbols-rounded" style="color:${s.colore_calendario || '#0d9488'}; font-size:1.4rem;">account_circle</span>
                                                        <strong>${s.cognome} ${s.nome}</strong>
                                                    </div>
                                                </td>
                                                <td><span class="ds-badge ds-badge-teal">${s.ruolo.replace(/_/g, ' ').toUpperCase()}</span><br><small style="color:var(--md-on-surface-variant);">${s.specializzazione || '-'}</small></td>
                                                <td>${s.albo_numero ? 'Albo: ' + s.albo_numero : (s.codice_fiscale || '-')}</td>
                                                <td><span class="ds-badge ds-badge-blue">${s.tipo_compenso_default === 'percentuale' ? s.valore_compenso_default + '%' : formatCurrency(s.valore_compenso_default)}</span></td>
                                                <td style="text-align:right;">
                                                    <button class="ds-btn ds-btn-ghost ds-edit-staff" data-id="${s.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">edit</span></button>
                                                    <button class="ds-btn ds-btn-danger ds-del-staff" data-id="${s.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">payments</span>Storico Liquidazioni Staff</div>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:0.7rem;">
                                ${liquidazioni.length === 0 ? '<p style="color:var(--md-on-surface-variant); text-align:center; padding:1rem;">Nessuna liquidazione registrata.</p>' : liquidazioni.slice(0, 6).map(l => `
                                    <div style="padding:0.8rem; background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:12px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <strong>${l.staff_cognome || ''} ${l.staff_nome || ''}</strong>
                                            <span class="ds-badge ds-badge-green">${formatCurrency(l.totale_competenze)}</span>
                                        </div>
                                        <div style="font-size:0.75rem; color:var(--md-on-surface-variant); margin-top:0.3rem;">Periodo: ${l.periodo_riferimento} • Data: ${formatDate(l.data_liquidazione)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            el.querySelector('#ds-btn-new-staff').addEventListener('click', () => openStaffModal());
            el.querySelector('#ds-btn-new-liq').addEventListener('click', () => openLiqModal());

            el.querySelectorAll('.ds-edit-staff').forEach(b => {
                b.addEventListener('click', () => {
                    const item = staffList.find(s => s.id === b.dataset.id);
                    if (item) openStaffModal(item);
                });
            });

            el.querySelectorAll('.ds-del-staff').forEach(b => {
                b.addEventListener('click', async () => {
                    if (!confirm('Rimuovere questo membro dello staff?')) return;
                    await callApi('staff:remove', { id: b.dataset.id });
                    this.render(el, onNavigate);
                });
            });

            function openStaffModal(member = null) {
                const isEdit = !!member;
                const modalHtml = renderModal({
                    id: 'ds-modal-staff',
                    title: isEdit ? 'Modifica Membro Staff' : 'Nuovo Membro Staff / Medico',
                    icon: isEdit ? 'edit' : 'person_add',
                    bodyHtml: `
                        <form id="ds-form-staff">
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Cognome *</label>
                                    <input type="text" name="cognome" class="ds-input" required value="${member ? member.cognome : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Nome *</label>
                                    <input type="text" name="nome" class="ds-input" required value="${member ? member.nome : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Ruolo *</label>
                                    <select name="ruolo" class="ds-select" required>
                                        <option value="medico_odontoiatra" ${member && member.ruolo === 'medico_odontoiatra' ? 'selected' : ''}>Medico Odontoiatra</option>
                                        <option value="direttore_sanitario" ${member && member.ruolo === 'direttore_sanitario' ? 'selected' : ''}>Direttore Sanitario</option>
                                        <option value="chirurgo_maxillofacciale" ${member && member.ruolo === 'chirurgo_maxillofacciale' ? 'selected' : ''}>Chirurgo Maxillo-Facciale</option>
                                        <option value="igienista_dentale" ${member && member.ruolo === 'igienista_dentale' ? 'selected' : ''}>Igienista Dentale</option>
                                        <option value="aso_assistente" ${member && member.ruolo === 'aso_assistente' ? 'selected' : ''}>Assistente di Studio Odontoiatrico (ASO)</option>
                                        <option value="segretaria_receptionist" ${member && member.ruolo === 'segretaria_receptionist' ? 'selected' : ''}>Segretaria / Receptionist</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Specializzazione / Mansione</label>
                                    <input type="text" name="specializzazione" class="ds-input" placeholder="Es. Ortodonzia, Implantologia, Segreteria..." value="${member ? member.specializzazione : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Numero Iscrizione Albo</label>
                                    <input type="text" name="albo_numero" class="ds-input" value="${member ? member.albo_numero : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Colore Calendario</label>
                                    <input type="color" name="colore_calendario" class="ds-input" style="height:42px; padding:2px;" value="${member ? member.colore_calendario : '#0d9488'}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Tipo Compenso Default</label>
                                    <select name="tipo_compenso_default" class="ds-select">
                                        <option value="percentuale" ${member && member.tipo_compenso_default === 'percentuale' ? 'selected' : ''}>Percentuale (%)</option>
                                        <option value="fisso" ${member && member.tipo_compenso_default === 'fisso' ? 'selected' : ''}>Fisso per prestazione (€)</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Valore Compenso Default</label>
                                    <input type="number" step="0.01" name="valore_compenso_default" class="ds-input" value="${member ? member.valore_compenso_default : '35.00'}">
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-staff-btn"><span class="material-symbols-rounded">save</span>Salva Collaboratore</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-staff');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-staff-btn').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-staff');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        if (isEdit) payload.id = member.id;

                        const action = isEdit ? 'staff:update' : 'staff:create';
                        const sRes = await callApi(action, payload);
                        if (sRes && sRes.success) {
                            close();
                            this.render(el, onNavigate);
                        } else {
                            showNotification(sRes.error || 'Errore', 'error');
                        }
                    } catch (err) {
                        showNotification(err.message, 'error');
                    }
                });
            }

            function openLiqModal() {
                const staffOptions = staffList.map(s => `<option value="${s.id}">${s.cognome} ${s.nome} (${s.ruolo.replace(/_/g, ' ')})</option>`).join('');

                const modalHtml = renderModal({
                    id: 'ds-modal-liq',
                    title: 'Registrazione Liquidazione Compensi Staff',
                    icon: 'receipt_long',
                    bodyHtml: `
                        <form id="ds-form-liq">
                            <div class="ds-form-grid">
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Collaboratore / Medico *</label>
                                    <select name="staff_id" class="ds-select" required>
                                        <option value="">-- Seleziona --</option>
                                        ${staffOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Periodo di Riferimento *</label>
                                    <input type="month" name="periodo_riferimento" class="ds-input" required value="${new Date().toISOString().slice(0, 7)}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Data Pagamento</label>
                                    <input type="date" name="data_liquidazione" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Importo Liquidato (€) *</label>
                                    <input type="number" step="0.01" name="totale_competenze" class="ds-input" required placeholder="0.00">
                                </div>
                                <div class="ds-form-field">
                                    <label>Metodo di Pagamento</label>
                                    <select name="metodo_pagamento" class="ds-select">
                                        <option value="bonifico">Bonifico Bancario</option>
                                        <option value="assegno">Assegno Circolare/Bancario</option>
                                        <option value="contanti">Contanti</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-liq-btn"><span class="material-symbols-rounded">save</span>Conferma Liquidazione</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-liq');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-liq-btn').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-liq');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        const res = await callApi('staff:creaLiquidazione', payload);
                        if (res && res.success) {
                            close();
                            this.render(el, onNavigate);
                        } else {
                            showNotification(res.error || 'Errore', 'error');
                        }
                    } catch (err) {
                        showNotification(err.message, 'error');
                    }
                });
            }

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
