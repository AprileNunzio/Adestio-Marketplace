import { callApi } from '../shared/api.js';
import { renderHero, renderModal, formatCurrency, formatDate, showNotification } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Personale & Collaboratori...</p></div>';

            async function loadAndRender() {
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
                                <button class="ds-btn ds-btn-hero" id="ds-btn-new-staff"><span class="material-symbols-rounded">person_add</span>Nuovo Membro Staff</button>
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
                                                    <td><span class="ds-badge ds-badge-teal">${(s.ruolo || '').replace(/_/g, ' ').toUpperCase()}</span><br><small style="color:var(--md-on-surface-variant);">${s.specializzazione || '-'}</small></td>
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

                el.querySelector('#ds-btn-new-staff')?.addEventListener('click', () => {
                    if (onNavigate) onNavigate('staff_editor');
                });

                el.querySelectorAll('.ds-edit-staff').forEach(b => {
                    b.addEventListener('click', () => {
                        if (onNavigate) onNavigate('staff_editor', { staffId: b.dataset.id });
                    });
                });

                el.querySelectorAll('.ds-del-staff').forEach(b => {
                    b.addEventListener('click', async () => {
                        const res = await callApi('staff:remove', { id: b.dataset.id });
                        if (res && res.success) {
                            showNotification('Collaboratore rimosso dallo staff', 'info');
                            loadAndRender();
                        }
                    });
                });

                el.querySelector('#ds-btn-new-liq')?.addEventListener('click', () => openLiqModal(staffList, loadAndRender));
            }

            function openLiqModal(staffList, onSaved) {
                const modalHtml = renderModal({
                    id: 'ds-modal-liq',
                    title: 'Nuova Liquidazione Compensi Staff',
                    icon: 'receipt_long',
                    bodyHtml: `
                        <form id="ds-form-liq">
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Collaboratore *</label>
                                    <select name="staff_id" class="ds-select" required>
                                        ${staffList.map(s => `<option value="${s.id}">${s.cognome} ${s.nome} (${s.ruolo})</option>`).join('')}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Periodo di Riferimento</label>
                                    <input type="text" name="periodo_riferimento" class="ds-input" placeholder="Es. Agosto 2026" required value="Mese Corrente">
                                </div>
                                <div class="ds-form-field">
                                    <label>Totale Competenze (€) *</label>
                                    <input type="number" step="0.01" name="totale_competenze" class="ds-input" required placeholder="0.00">
                                </div>
                                <div class="ds-form-field">
                                    <label>Data Pagamento</label>
                                    <input type="date" name="data_liquidazione" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-liq-btn"><span class="material-symbols-rounded">save</span>Registra Liquidazione</button>
                    `
                });

                const container = document.createElement('div');
                container.innerHTML = modalHtml;
                document.body.appendChild(container);
                const mEl = container.querySelector('#ds-modal-liq');
                mEl.style.display = 'flex';

                const close = () => container.remove();
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-liq-btn').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-liq');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        const res = await callApi('staff:registraLiquidazione', payload);
                        if (res && res.success) {
                            showNotification('Liquidazione registrata con successo!', 'success');
                            close();
                            onSaved();
                        } else {
                            showNotification(res.error || 'Errore', 'error');
                        }
                    } catch (err) {
                        showNotification(err.message, 'error');
                    }
                });
            }

            await loadAndRender();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
