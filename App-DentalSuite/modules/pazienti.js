import { callApi } from '../shared/api.js';
import { renderHero, formatDate , showNotification } from '../shared/ui_kit.js';
import { openNotificationModal } from '../components/notification_modal.js';
import { renderOdontogramTab } from '../components/odontogram_tab.js';
import { renderAnamnesiTab } from '../components/anamnesi_tab.js';
import { renderTrattamentiTab } from '../components/trattamenti_tab.js';
import { renderPrescrizioniTab } from '../components/prescrizioni_tab.js';
import { renderAllegatiTab } from '../components/allegati_tab.js';
import { renderRateTab } from '../components/rate_tab.js';
import { formatPatientDemographics } from '../shared/formatters.js';

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
                                subtitle: 'Anamnesi sanitaria, odontogramma interattivo FDI, diario interventi e prescrizioni.',
                                icon: 'person_search',
                                actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-paziente"><span class="material-symbols-rounded">person_add</span>Nuova Cartella Paziente</button>`
                            })}

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div style="position:relative; flex:1; max-width:400px;">
                                        <input type="text" id="ds-search-pazienti" class="ds-input" style="width:100%; padding-left:2.4rem;" placeholder="Cerca tra oltre 1.000 pazienti per cognome, nome, CF...">
                                        <span class="material-symbols-rounded" style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--md-on-surface-variant); font-size:1.2rem;">search</span>
                                    </div>
                                    <span class="ds-badge ds-badge-teal">${pazienti.length} Pazienti in Archivio</span>
                                </div>

                                <div class="ds-table-wrap">
                                    <table class="ds-table">
                                        <thead>
                                            <tr>
                                                <th>Cognome e Nome</th>
                                                <th>Dati Anagrafici & Età</th>
                                                <th>Codice Fiscale</th>
                                                <th>Recapiti</th>
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
                    if (btnNew) btnNew.addEventListener('click', () => onNavigate('paziente_editor'));

                    attachRowEvents();

                    if (params.openNew) {
                        onNavigate('paziente_editor');
                    }
                } catch (e) {
                    el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
                }
            }

            function renderTableRows(list) {
                if (!list || list.length === 0) {
                    return '<tr><td colspan="6" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessun paziente trovato.</td></tr>';
                }
                return list.map(p => {
                    const demo = formatPatientDemographics(p);
                    return `
                        <tr style="cursor:pointer;" class="ds-paziente-row" data-id="${p.id}">
                            <td><strong>${p.cognome} ${p.nome}</strong></td>
                            <td>${demo ? `<span class="ds-badge ds-badge-teal">${demo}</span>` : '-'}</td>
                            <td><code style="font-family:monospace; font-weight:700;">${p.codice_fiscale || '-'}</code></td>
                            <td>${p.telefono || p.email || '-'}</td>
                            <td>${p.assicurazione ? `<span class="ds-badge ds-badge-blue">${p.assicurazione}</span>` : '-'}</td>
                            <td style="text-align:right;">
                                <button class="ds-btn ds-btn-primary ds-btn-apri-scheda" data-id="${p.id}" style="padding:0.4rem 0.8rem; font-size:0.8rem;"><span class="material-symbols-rounded" style="font-size:1rem;">folder_open</span> Cartella</button>
                            </td>
                        </tr>
                    `;
                }).join('');
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
                        showNotification('Impossibile caricare la cartella', 'error');
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
                    const demo = formatPatientDemographics(p);

                    const rateList = (rateRes && rateRes.success && rateRes.data) ? rateRes.data.rate || [] : [];
                    const notificheLog = (notifRes && notifRes.success) ? notifRes.data || [] : [];

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: `${p.cognome} ${p.nome}`,
                                subtitle: `${demo ? demo + ' • ' : ''}CF: ${p.codice_fiscale || '-'} • Tel: ${p.telefono || '-'}`,
                                icon: 'folder_shared',
                                actionsHtml: `
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-back"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-notify-paz"><span class="material-symbols-rounded">chat</span>Notifica</button>
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-edit-paziente"><span class="material-symbols-rounded">edit_document</span>Modifica Scheda</button>
                                    <button class="ds-btn ds-btn-danger" id="ds-btn-del-paziente"><span class="material-symbols-rounded">delete</span></button>
                                `
                            })}

                            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                                <div class="ds-nav">
                                    <button class="ds-nav-btn ${currentTab === 'anagrafica' ? 'active' : ''}" data-tab="anagrafica"><span class="material-symbols-rounded">badge</span>Anagrafica & Info</button>
                                    <button class="ds-nav-btn ${currentTab === 'anamnesi' ? 'active' : ''}" data-tab="anamnesi"><span class="material-symbols-rounded">medical_information</span>Anamnesi</button>
                                    <button class="ds-nav-btn ${currentTab === 'odontogramma' ? 'active' : ''}" data-tab="odontogramma"><span class="material-symbols-rounded">dentistry</span>Odontogramma FDI</button>
                                    <button class="ds-nav-btn ${currentTab === 'trattamenti' ? 'active' : ''}" data-tab="trattamenti"><span class="material-symbols-rounded">healing</span>Diario Clinico (${trattamenti.length})</button>
                                    <button class="ds-nav-btn ${currentTab === 'rate' ? 'active' : ''}" data-tab="rate"><span class="material-symbols-rounded">credit_card</span>Piani Rateali (${rateList.length})</button>
                                    <button class="ds-nav-btn ${currentTab === 'prescrizioni' ? 'active' : ''}" data-tab="prescrizioni"><span class="material-symbols-rounded">prescriptions</span>Ricette (${prescrizioni.length})</button>
                                    <button class="ds-nav-btn ${currentTab === 'allegati' ? 'active' : ''}" data-tab="allegati"><span class="material-symbols-rounded">perm_media</span>TAC / RMN / Rx (${allegati.length})</button>
                                </div>
                            </div>

                            <div id="ds-tab-content"></div>
                        </div>
                    `;

                    el.querySelector('#ds-btn-back').addEventListener('click', () => renderList());
                    el.querySelector('#ds-btn-notify-paz').addEventListener('click', () => openNotificationModal({ paziente: p, onSent: () => renderDetail(p.id) }));
                    el.querySelector('#ds-btn-edit-paziente').addEventListener('click', () => onNavigate('paziente_editor', { pazienteId: p.id }));
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
                                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.2rem;">
                                    <div class="ds-panel">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">badge</span>Dati Anagrafici</div>
                                        <div class="ds-form-grid" style="grid-template-columns:1fr 1fr;">
                                            <div><strong>Nome e Cognome:</strong><br>${p.cognome} ${p.nome}</div>
                                            <div><strong>Dati Demografici:</strong><br>${demo ? `<span class="ds-badge ds-badge-teal">${demo}</span>` : '-'}</div>
                                            <div><strong>Codice Fiscale:</strong><br><code style="font-family:monospace; font-weight:700;">${p.codice_fiscale || '-'}</code></div>
                                            <div><strong>Data di Nascita:</strong><br>${formatDate(p.data_nascita)}</div>
                                            <div><strong>Luogo di Nascita:</strong><br>${p.luogo_nascita || '-'}</div>
                                            <div><strong>Professione:</strong><br>${p.professione || '-'}</div>
                                        </div>
                                    </div>

                                    <div class="ds-panel">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-blue);">contact_phone</span>Recapiti & Notifiche</div>
                                        <div class="ds-form-grid" style="grid-template-columns:1fr 1fr;">
                                            <div><strong>Cellulare:</strong><br>${p.telefono || '-'}</div>
                                            <div><strong>Email:</strong><br>${p.email || '-'}</div>
                                            <div><strong>Canale Preferito:</strong><br><span class="ds-badge ds-badge-teal">${(p.canale_preferito || 'whatsapp').toUpperCase()}</span></div>
                                            <div><strong>Consenso Promemoria:</strong><br>${p.consenso_promemoria !== 0 ? '<span class="ds-badge ds-badge-green">Attivo</span>' : '<span class="ds-badge ds-badge-rose">Disattivato</span>'}</div>
                                        </div>
                                    </div>

                                    <div class="ds-panel">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-green);">home_pin</span>Residenza & Fatturazione</div>
                                        <div class="ds-form-grid" style="grid-template-columns:1fr 1fr;">
                                            <div style="grid-column:1/-1;"><strong>Indirizzo:</strong><br>${p.indirizzo ? p.indirizzo + ', ' + (p.cap || '') + ' ' + (p.citta || '') + ' (' + (p.provincia || '') + ')' : '-'}</div>
                                            <div><strong>Codice SDI:</strong><br>${p.codice_sdi || '-'}</div>
                                            <div><strong>PEC:</strong><br>${p.pec || '-'}</div>
                                        </div>
                                    </div>

                                    <div class="ds-panel">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-purple);">medical_services</span>Fondo Sanitario & Assistenza</div>
                                        <div class="ds-form-grid" style="grid-template-columns:1fr 1fr;">
                                            <div><strong>Fondo Sanitario:</strong><br>${p.assicurazione ? `<span class="ds-badge ds-badge-blue">${p.assicurazione}</span>` : 'Nessuno'}</div>
                                            <div><strong>N° Polizza:</strong><br>${p.numero_polizza || '-'}</div>
                                            <div><strong>Medico di Base:</strong><br>${p.medico_curante || '-'} ${p.tel_medico_curante ? '(' + p.tel_medico_curante + ')' : ''}</div>
                                            <div><strong>Esenzioni:</strong><br>${p.esenzioni || 'Nessuna'}</div>
                                        </div>
                                    </div>
                                </div>
                                ${p.note ? `<div class="ds-panel" style="margin-top:1.2rem;"><strong>Note Cliniche e Gestionali:</strong><br>${p.note}</div>` : ''}
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
