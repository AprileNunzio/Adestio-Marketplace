import { callApi } from '../shared/api.js';
import { renderHero, renderModal, formatCurrency, formatDate, showNotification } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Personale & Collaboratori...</p></div>';

            let activeTab = 'collaboratori';
            const DENTAL_PERMS = [
                { id: 'adestio_dental_suite:pazienti', label: 'Pazienti & Cartelle', icon: 'person_search' },
                { id: 'adestio_dental_suite:agenda', label: 'Agenda & Poltrone', icon: 'calendar_month' },
                { id: 'adestio_dental_suite:prestazioni', label: 'Listino Prestazioni', icon: 'list_alt' },
                { id: 'adestio_dental_suite:staff', label: 'Staff & Collaboratori', icon: 'badge' },
                { id: 'adestio_dental_suite:contabilita', label: 'Contabilità & Incassi', icon: 'account_balance_wallet' },
                { id: 'adestio_dental_suite:statistiche', label: 'Statistiche & Margini', icon: 'monitoring' }
            ];

            async function loadAndRender() {
                try {
                    const [staffRes, liqRes] = await Promise.all([
                        callApi('staff:getAll'),
                        callApi('staff:getLiquidazioni')
                    ]);

                    let adestioUsers = [];
                    let userPermsMap = {};

                    if (window.electronAPI && window.electronAPI.rbac) {
                        try {
                            const uRes = await window.electronAPI.rbac.getAllUsers();
                            if (uRes && uRes.success && Array.isArray(uRes.data)) {
                                adestioUsers = uRes.data;
                                for (const u of adestioUsers) {
                                    try {
                                        const pRes = await window.electronAPI.rbac.getEffectiveUserPermissions(u.id);
                                        userPermsMap[u.id] = (pRes && pRes.success && Array.isArray(pRes.data)) ? pRes.data : [];
                                    } catch (e) {
                                        userPermsMap[u.id] = [];
                                    }
                                }
                            }
                        } catch (e) {}
                    }

                    const staffList = (staffRes && staffRes.success) ? staffRes.data : [];
                    const liquidazioni = (liqRes && liqRes.success) ? liqRes.data : [];

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: 'Staff, Collaboratori & Controllo Accessi RBAC',
                                subtitle: 'Medici specialisti, assistenti ASO, segreteria, liquidazioni provvigionali e configurazione permessi sincronizzata.',
                                icon: 'group',
                                actionsHtml: `
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-new-staff"><span class="material-symbols-rounded">person_add</span>Nuovo Collaboratore</button>
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-new-liq"><span class="material-symbols-rounded">receipt_long</span>Registra Liquidazione</button>
                                `
                            })}

                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:1rem;">
                                <div class="ds-nav">
                                    <button class="ds-nav-btn ${activeTab === 'collaboratori' ? 'active' : ''}" data-tab="collaboratori"><span class="material-symbols-rounded">badge</span>Equipe & Collaboratori (${staffList.length})</button>
                                    <button class="ds-nav-btn ${activeTab === 'rbac' ? 'active' : ''}" data-tab="rbac"><span class="material-symbols-rounded">security</span>Matrice Permessi RBAC Studio</button>
                                    <button class="ds-nav-btn ${activeTab === 'liquidazioni' ? 'active' : ''}" data-tab="liquidazioni"><span class="material-symbols-rounded">payments</span>Liquidazioni Staff (${liquidazioni.length})</button>
                                </div>
                            </div>

                            <div id="ds-staff-tab-outlet"></div>
                        </div>
                    `;

                    el.querySelector('#ds-btn-new-staff')?.addEventListener('click', () => {
                        if (onNavigate) onNavigate('staff_editor');
                    });
                    el.querySelector('#ds-btn-new-liq')?.addEventListener('click', () => openLiqModal(staffList, loadAndRender));

                    el.querySelectorAll('.ds-nav-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            el.querySelectorAll('.ds-nav-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            activeTab = btn.dataset.tab;
                            renderTabOutlet();
                        });
                    });

                    function renderTabOutlet() {
                        const outlet = el.querySelector('#ds-staff-tab-outlet');
                        if (!outlet) return;

                        if (activeTab === 'collaboratori') {
                            outlet.innerHTML = `
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
                                                    <th>Stato Servizio</th>
                                                    <th style="text-align:right;">Azioni</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${staffList.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:1.8rem;">Nessun collaboratore registrato.</td></tr>' : staffList.map(s => `
                                                    <tr>
                                                        <td>
                                                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                                                <span class="material-symbols-rounded" style="color:${s.colore_calendario || '#0d9488'}; font-size:1.4rem;">account_circle</span>
                                                                <strong>${s.cognome} ${s.nome}${s.secondo_nome ? ' ' + s.secondo_nome : ''}</strong>
                                                            </div>
                                                        </td>
                                                        <td><span class="ds-badge ds-badge-teal">${(s.ruolo || '').replace(/_/g, ' ').toUpperCase()}</span><br><small style="color:var(--md-on-surface-variant);">${s.specializzazione || '-'}</small></td>
                                                        <td>${s.albo_numero ? 'Albo: ' + s.albo_numero : (s.codice_fiscale || '-')}</td>
                                                        <td><span class="ds-badge ds-badge-blue">${s.tipo_compenso_default === 'percentuale' ? s.valore_compenso_default + '%' : formatCurrency(s.valore_compenso_default)}</span></td>
                                                        <td><span class="ds-badge ds-badge-${s.attivo !== 0 ? 'green' : 'rose'}">${s.attivo !== 0 ? 'Attivo' : 'Sospeso'}</span></td>
                                                        <td style="text-align:right;">
                                                            <button class="ds-btn ds-btn-ghost ds-edit-staff" data-id="${s.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">edit</span> Modifica</button>
                                                            <button class="ds-btn ds-btn-danger ds-del-staff" data-id="${s.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `;

                            outlet.querySelectorAll('.ds-edit-staff').forEach(b => {
                                b.addEventListener('click', () => {
                                    if (onNavigate) onNavigate('staff_editor', { staffId: b.dataset.id });
                                });
                            });

                            outlet.querySelectorAll('.ds-del-staff').forEach(b => {
                                b.addEventListener('click', async () => {
                                    if (!confirm('Rimuovere questo collaboratore?')) return;
                                    const res = await callApi('staff:remove', { id: b.dataset.id });
                                    if (res && res.success) {
                                        showNotification('Collaboratore rimosso', 'info');
                                        loadAndRender();
                                    }
                                });
                            });

                        } else if (activeTab === 'rbac') {
                            outlet.innerHTML = `
                                <div class="ds-panel">
                                    <div class="ds-panel-header">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">security</span>Pannello Gestore: Configurazione Permessi RBAC Utenti</div>
                                        <span class="ds-badge ds-badge-teal">Sincronizzazione Live Adestio</span>
                                    </div>

                                    <p style="color:var(--md-on-surface-variant); font-size:0.9rem; margin-bottom:1.2rem;">
                                        Attiva o disattiva istantaneamente le aree di DentalSuite per ciascun utente. Le modifiche sono applicate in tempo reale senza dover accedere alle impostazioni di sistema.
                                    </p>

                                    <div class="ds-table-wrap">
                                        <table class="ds-table">
                                            <thead>
                                                <tr>
                                                    <th>Utente / Operatore</th>
                                                    <th>Account Adestio</th>
                                                    ${DENTAL_PERMS.map(p => `<th style="text-align:center;"><span class="material-symbols-rounded" style="font-size:1.1rem; vertical-align:middle;">${p.icon}</span><br><small>${p.label}</small></th>`).join('')}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${adestioUsers.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:1.8rem;">Nessun utente Adestio trovato nel database locale.</td></tr>' : adestioUsers.map(u => {
                                                    const perms = userPermsMap[u.id] || [];
                                                    const isSuper = perms.includes('*') || perms.includes('adestio_dental_suite:*');
                                                    return `
                                                        <tr>
                                                            <td>
                                                                <strong>${u.fullname || u.username}</strong>
                                                                ${isSuper ? '<br><span class="ds-badge ds-badge-purple" style="font-size:0.68rem;">AMMINISTRATORE</span>' : ''}
                                                            </td>
                                                            <td><code>${u.username}</code><br><small style="color:var(--md-on-surface-variant);">${u.email || '-'}</small></td>
                                                            ${DENTAL_PERMS.map(dp => {
                                                                const hasP = isSuper || perms.includes(dp.id);
                                                                return `
                                                                    <td style="text-align:center;">
                                                                        <label style="cursor:pointer; display:inline-flex; align-items:center;">
                                                                            <input type="checkbox" class="ds-rbac-toggle" data-userid="${u.id}" data-perm="${dp.id}" ${hasP ? 'checked' : ''} ${isSuper ? 'disabled' : ''} style="width:18px; height:18px; cursor:pointer; accent-color:var(--ds-teal);">
                                                                        </label>
                                                                    </td>
                                                                `;
                                                            }).join('')}
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `;

                            outlet.querySelectorAll('.ds-rbac-toggle').forEach(chk => {
                                chk.addEventListener('change', async (e) => {
                                    try {
                                        const userId = chk.dataset.userid;
                                        const permId = chk.dataset.perm;
                                        const isChecked = chk.checked;

                                        if (window.electronAPI && window.electronAPI.rbac) {
                                            const res = await window.electronAPI.rbac.setUserPermission(userId, permId, isChecked);
                                            if (res && res.success) {
                                                showNotification(`Permesso ${permId} ${isChecked ? 'attivato' : 'disattivato'} per l'utente`, 'success');
                                            } else {
                                                showNotification(res?.error || 'Errore salvataggio permesso', 'danger');
                                                chk.checked = !isChecked;
                                            }
                                        }
                                    } catch (err) {
                                        showNotification(err.message, 'danger');
                                    }
                                });
                            });

                        } else if (activeTab === 'liquidazioni') {
                            outlet.innerHTML = `
                                <div class="ds-panel">
                                    <div class="ds-panel-header">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">payments</span>Storico Completo Liquidazioni Staff</div>
                                    </div>
                                    <div class="ds-table-wrap">
                                        <table class="ds-table">
                                            <thead>
                                                <tr>
                                                    <th>Collaboratore</th>
                                                    <th>Periodo di Riferimento</th>
                                                    <th>Totale Competenze Saldate</th>
                                                    <th>Data Pagamento</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${liquidazioni.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:1.8rem;">Nessuna liquidazione registrata.</td></tr>' : liquidazioni.map(l => `
                                                    <tr>
                                                        <td><strong>${l.staff_cognome || ''} ${l.staff_nome || ''}</strong></td>
                                                        <td>${l.periodo_riferimento}</td>
                                                        <td><span class="ds-badge ds-badge-green">${formatCurrency(l.totale_competenze)}</span></td>
                                                        <td>${formatDate(l.data_liquidazione)}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `;
                        }
                    }

                    renderTabOutlet();

                } catch (e) {
                    el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
                }
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
