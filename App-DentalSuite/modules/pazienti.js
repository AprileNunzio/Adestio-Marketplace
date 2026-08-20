import { callApi } from '../shared/api.js';
import { renderHero, formatCurrency, formatDate } from '../shared/ui_kit.js';
import { openNotificationModal } from '../components/notification_modal.js';
import { openPazienteFormModal } from '../components/paziente_form_modal.js';
import { renderOdontogramTab } from '../components/odontogram_tab.js';
import { renderAnamnesiTab } from '../components/anamnesi_tab.js';
import { renderTrattamentiTab } from '../components/trattamenti_tab.js';
import { renderPrescrizioniTab } from '../components/prescrizioni_tab.js';
import { renderAllegatiTab } from '../components/allegati_tab.js';
import { renderRateTab } from '../components/rate_tab.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Anagrafica Pazienti...</p></div>';

            let selectedPazienteId = params.pazienteId || null;
            let currentTab = 'anagrafica';
            let allPrestazioni = [];
            let allStaff = [];

            try {
                const [prestRes, staffRes] = await Promise.all([
                    callApi('prestazioni:getAll'),
                    callApi('staff:getAll')
                ]);
                if (prestRes && prestRes.success) allPrestazioni = prestRes.data || [];
                if (staffRes && staffRes.success) allStaff = staffRes.data || [];
            } catch (e) {}

            async function renderList() {
                try {
                    const res = await callApi('pazienti:getAll');
                    const pazienti = (res && res.success) ? res.data : [];

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: 'Cartelle Cliniche & Pazienti',
                                subtitle: 'Anamnesi, odontogramma interattivo FDI, trattamenti, piani rateali e notifiche.',
                                icon: 'person_search',
                                actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-paziente"><span class="material-symbols-rounded">person_add</span>Nuovo Paziente</button>`
                            })}

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div style="position:relative; flex:1; max-width:400px;">
                                        <input type="text" id="ds-search-pazienti" class="ds-input" style="width:100%; padding-left:2.4rem;" placeholder="Cerca per nome, CF o telefono...">
                                        <span class="material-symbols-rounded" style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--md-on-surface-variant); font-size:1.2rem;">search</span>
                                    </div>
                                    <span class="ds-badge ds-badge-teal">${pazienti.length} Pazienti in Archivio</span>
                                </div>

                                <div class="ds-table-wrap">
                                    <table class="ds-table">
                                        <thead>
                                            <tr>
                                                <th>Cognome e Nome</th>
                                                <th>Codice Fiscale</th>
                                                <th>Recapiti</th>
                                                <th>Città</th>
                                                <th>Fondo Sanitario</th>
                                                <th style="text-align:right;">Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody id="ds-pazienti-tbody">
                                            ${renderTableRows(pazienti)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;

                    const searchInput = el.querySelector('#ds-search-pazienti');
                    if (searchInput) {
                        searchInput.addEventListener('input', async (e) => {
                            const q = e.target.value;
                            const sRes = await callApi('pazienti:getAll', { query: q });
                            const tbody = el.querySelector('#ds-pazienti-tbody');
                            if (tbody && sRes && sRes.success) {
                                tbody.innerHTML = renderTableRows(sRes.data);
                                attachRowEvents();
                            }
                        });
                    }

                    const btnNew = el.querySelector('#ds-btn-new-paziente');
                    if (btnNew) btnNew.addEventListener('click', () => openPazienteFormModal({ onSaved: (id) => renderDetail(id) }));

                    attachRowEvents();

                    if (params.openNew) {
                        openPazienteFormModal({ onSaved: (id) => renderDetail(id) });
                    }
                } catch (e) {
                    el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
                }
            }

            function renderTableRows(list) {
                if (!list || list.length === 0) {
                    return '<tr><td colspan="6" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessun paziente trovato.</td></tr>';
                }
                return list.map(p => `
                    <tr style="cursor:pointer;" class="ds-paziente-row" data-id="${p.id}">
                        <td><strong>${p.cognome} ${p.nome}</strong></td>
                        <td><code style="font-family:monospace; font-weight:700;">${p.codice_fiscale || '-'}</code></td>
                        <td>${p.telefono || p.email || '-'}</td>
                        <td>${p.citta ? p.citta + (p.provincia ? ' (' + p.provincia + ')' : '') : '-'}</td>
                        <td>${p.assicurazione ? `<span class="ds-badge ds-badge-blue">${p.assicurazione}</span>` : '-'}</td>
                        <td style="text-align:right;">
                            <button class="ds-btn ds-btn-primary ds-btn-apri-scheda" data-id="${p.id}" style="padding:0.4rem 0.8rem; font-size:0.8rem;"><span class="material-symbols-rounded" style="font-size:1rem;">folder_open</span> Cartella</button>
                        </td>
                    </tr>
                `).join('');
            }

            function attachRowEvents() {
                try {
                    el.querySelectorAll('.ds-paziente-row').forEach(row => {
                        row.addEventListener('click', (e) => {
                            if (e.target.closest('.ds-btn-apri-scheda')) return;
                            const id = row.dataset.id;
                            if (id) renderDetail(id);
                        });
                    });
                    el.querySelectorAll('.ds-btn-apri-scheda').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const id = btn.dataset.id;
                            if (id) renderDetail(id);
                        });
                    });
                } catch (e) {}
            }

            async function renderDetail(pazienteId) {
                try {
                    selectedPazienteId = pazienteId;
                    el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Cartella Clinica...</p></div>';

                    const [res, rateRes, notifRes] = await Promise.all([
                        callApi('pazienti:getById', { id: pazienteId }),
                        callApi('rate:getPianiByPaziente', { paziente_id: pazienteId }),
                        callApi('notifiche:getByPaziente', { paziente_id: pazienteId })
                    ]);

                    if (!res || !res.success || !res.data) {
                        alert('Impossibile caricare la cartella');
                        renderList();
                        return;
                    }

                    const data = res.data;
                    const p = data.paziente;
                    const anamnesi = data.anamnesi || {};
                    const odontogramma = data.odontogramma || [];
                    const trattamenti = data.trattamenti || [];
                    const prescrizioni = data.prescrizioni || [];
                    const allegati = data.allegati || [];
                    const pagamenti = data.pagamenti || [];

                    const pianiRateali = (rateRes && rateRes.success && rateRes.data) ? rateRes.data.piani || [] : [];
                    const rateList = (rateRes && rateRes.success && rateRes.data) ? rateRes.data.rate || [] : [];
                    const notificheLog = (notifRes && notifRes.success) ? notifRes.data || [] : [];

                    const totTrattamenti = trattamenti.reduce((acc, t) => acc + (Number(t.importo) || 0), 0);
                    const totPagato = pagamenti.reduce((acc, pg) => acc + (Number(pg.importo) || 0), 0);
                    const saldoResiduo = totTrattamenti - totPagato;

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: `${p.cognome} ${p.nome}`,
                                subtitle: `CF: ${p.codice_fiscale || '-'} • Nato/a: ${formatDate(p.data_nascita)} • Tel: ${p.telefono || '-'}`,
                                icon: 'folder_shared',
                                actionsHtml: `
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-back"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-notify-paz"><span class="material-symbols-rounded">chat</span>Notifica</button>
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-edit-paziente"><span class="material-symbols-rounded">edit</span>Modifica</button>
                                    <button class="ds-btn ds-btn-danger" id="ds-btn-del-paziente"><span class="material-symbols-rounded">delete</span></button>
                                `
                            })}

                            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                                <div class="ds-nav">
                                    <button class="ds-nav-btn ${currentTab === 'anagrafica' ? 'active' : ''}" data-tab="anagrafica"><span class="material-symbols-rounded">badge</span>Anagrafica</button>
                                    <button class="ds-nav-btn ${currentTab === 'anamnesi' ? 'active' : ''}" data-tab="anamnesi"><span class="material-symbols-rounded">medical_information</span>Anamnesi</button>
                                    <button class="ds-nav-btn ${currentTab === 'odontogramma' ? 'active' : ''}" data-tab="odontogramma"><span class="material-symbols-rounded">dentistry</span>Odontogramma FDI</button>
                                    <button class="ds-nav-btn ${currentTab === 'trattamenti' ? 'active' : ''}" data-tab="trattamenti"><span class="material-symbols-rounded">healing</span>Diario Clinico (${trattamenti.length})</button>
                                    <button class="ds-nav-btn ${currentTab === 'rate' ? 'active' : ''}" data-tab="rate"><span class="material-symbols-rounded">credit_card</span>Piani Rateali (${pianiRateali.length})</button>
                                    <button class="ds-nav-btn ${currentTab === 'prescrizioni' ? 'active' : ''}" data-tab="prescrizioni"><span class="material-symbols-rounded">prescriptions</span>Ricette (${prescrizioni.length})</button>
                                    <button class="ds-nav-btn ${currentTab === 'allegati' ? 'active' : ''}" data-tab="allegati"><span class="material-symbols-rounded">perm_media</span>TAC / RMN / Rx (${allegati.length})</button>
                                </div>
                                <div style="display:flex; gap:0.6rem; align-items:center;">
                                    <span class="ds-badge ds-badge-teal">Lavori: ${formatCurrency(totTrattamenti)}</span>
                                    <span class="ds-badge ds-badge-green">Pagato: ${formatCurrency(totPagato)}</span>
                                    <span class="ds-badge ${saldoResiduo > 0 ? 'ds-badge-rose' : 'ds-badge-blue'}">Saldo: ${formatCurrency(saldoResiduo)}</span>
                                </div>
                            </div>

                            <div id="ds-tab-content"></div>
                        </div>
                    `;

                    el.querySelector('#ds-btn-back').addEventListener('click', () => renderList());
                    el.querySelector('#ds-btn-notify-paz').addEventListener('click', () => openNotificationModal({ paziente: p, onSent: () => renderDetail(p.id) }));
                    el.querySelector('#ds-btn-edit-paziente').addEventListener('click', () => openPazienteFormModal({ paziente: p, onSaved: () => renderDetail(p.id) }));
                    el.querySelector('#ds-btn-del-paziente').addEventListener('click', async () => {
                        if (!confirm('Eliminare definitivamente questo paziente?')) return;
                        await callApi('pazienti:remove', { id: p.id });
                        renderList();
                    });

                    el.querySelectorAll('.ds-nav-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            el.querySelectorAll('.ds-nav-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            currentTab = btn.dataset.tab;
                            renderTabContent();
                        });
                    });

                    function renderTabContent() {
                        const contentEl = el.querySelector('#ds-tab-content');
                        if (!contentEl) return;

                        if (currentTab === 'anagrafica') {
                            contentEl.innerHTML = `
                                <div class="ds-panel">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">badge</span>Dati Anagrafici e Previdenziali</div>
                                    <div class="ds-form-grid">
                                        <div><strong>Nome e Cognome:</strong> ${p.nome} ${p.cognome}</div>
                                        <div><strong>Codice Fiscale:</strong> ${p.codice_fiscale || '-'}</div>
                                        <div><strong>Data di Nascita:</strong> ${formatDate(p.data_nascita)}</div>
                                        <div><strong>Luogo di Nascita:</strong> ${p.luogo_nascita || '-'}</div>
                                        <div><strong>Sesso:</strong> ${p.sesso || '-'}</div>
                                        <div><strong>Gruppo Sanguigno:</strong> ${p.gruppo_sanguigno || 'Non specificato'}</div>
                                        <div><strong>Telefono:</strong> ${p.telefono || '-'}</div>
                                        <div><strong>Email:</strong> ${p.email || '-'}</div>
                                        <div><strong>Indirizzo:</strong> ${p.indirizzo ? p.indirizzo + ', ' + (p.cap || '') + ' ' + (p.citta || '') + ' (' + (p.provincia || '') + ')' : '-'}</div>
                                        <div><strong>Esenzioni Sanitarie:</strong> ${p.esenzioni || 'Nessuna'}</div>
                                        <div><strong>Fondo Sanitario:</strong> ${p.assicurazione || 'Nessuna'}</div>
                                    </div>
                                    ${p.note ? `<div style="margin-top:1rem; padding:0.8rem; background:var(--md-surface-container-low); border-radius:12px;"><strong>Note:</strong><br>${p.note}</div>` : ''}
                                </div>
                            `;
                        } else if (currentTab === 'anamnesi') {
                            renderAnamnesiTab(contentEl, { pazienteId: p.id, anamnesi });
                        } else if (currentTab === 'odontogramma') {
                            renderOdontogramTab(contentEl, { pazienteId: p.id, odontogramma, onUpdated: () => renderDetail(p.id) });
                        } else if (currentTab === 'trattamenti') {
                            renderTrattamentiTab(contentEl, { pazienteId: p.id, trattamenti, allStaff, allPrestazioni, onUpdated: () => renderDetail(p.id) });
                        } else if (currentTab === 'rate') {
                            renderRateTab(contentEl, { paziente: p, rateList, onUpdated: () => renderDetail(p.id) });
                        } else if (currentTab === 'prescrizioni') {
                            renderPrescrizioniTab(contentEl, { pazienteId: p.id, prescrizioni, allStaff, onUpdated: () => renderDetail(p.id) });
                        } else if (currentTab === 'allegati') {
                            renderAllegatiTab(contentEl, { pazienteId: p.id, allegati, onUpdated: () => renderDetail(p.id) });
                        }
                    }

                    renderTabContent();
                } catch (e) {
                    renderList();
                }
            }

            if (selectedPazienteId) {
                renderDetail(selectedPazienteId);
            } else {
                renderList();
            }

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
