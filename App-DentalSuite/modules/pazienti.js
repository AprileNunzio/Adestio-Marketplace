import { callApi } from '../shared/api.js';
import { renderHero, renderModal, formatCurrency, formatDate, formatDateTime } from '../shared/ui_kit.js';

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
                                subtitle: 'Anamnesi, odontogramma interattivo FDI, trattamenti, prescrizioni e archivio TAC/RMN.',
                                icon: 'person_search',
                                actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-paziente"><span class="material-symbols-rounded">person_add</span>Nuovo Paziente</button>`
                            })}

                            <div class="ds-panel">
                                <div class="ds-panel-header">
                                    <div style="position:relative; flex:1; max-width:400px;">
                                        <input type="text" id="ds-search-pazienti" class="ds-input" style="width:100%; padding-left:2.4rem;" placeholder="Cerca paziente per nome, CF o telefono...">
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
                                                <th>Fondo / Assicurazione</th>
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
                            try {
                                const q = e.target.value;
                                const sRes = await callApi('pazienti:getAll', { query: q });
                                const tbody = el.querySelector('#ds-pazienti-tbody');
                                if (tbody && sRes && sRes.success) {
                                    tbody.innerHTML = renderTableRows(sRes.data);
                                    attachRowEvents();
                                }
                            } catch (err) {}
                        });
                    }

                    const btnNew = el.querySelector('#ds-btn-new-paziente');
                    if (btnNew) btnNew.addEventListener('click', () => openPazienteModal(null));

                    attachRowEvents();

                    if (params.openNew) {
                        openPazienteModal(null);
                    }
                } catch (e) {
                    el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore nel caricamento pazienti: ${e.message}</p></div>`;
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
                        <td>${p.assicurazione ? `<span class="ds-badge ds-badge-blue">${p.assicurazione}</span>` : '<span style="color:var(--md-on-surface-variant);">-</span>'}</td>
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
                    el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Cartella Clinica Paziente...</p></div>';

                    const res = await callApi('pazienti:getById', { id: pazienteId });
                    if (!res || !res.success || !res.data) {
                        alert('Impossibile caricare i dati del paziente');
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

                    const totTrattamenti = trattamenti.reduce((acc, t) => acc + (Number(t.importo) || 0), 0);
                    const totPagato = pagamenti.reduce((acc, pg) => acc + (Number(pg.importo) || 0), 0);
                    const saldoResiduo = totTrattamenti - totPagato;

                    const teethMap = {};
                    odontogramma.forEach(t => { teethMap[t.numero_dente] = t; });

                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: `${p.cognome} ${p.nome}`,
                                subtitle: `CF: ${p.codice_fiscale || '-'} • Nato/a il: ${formatDate(p.data_nascita)} • Tel: ${p.telefono || '-'}`,
                                icon: 'folder_shared',
                                actionsHtml: `
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-back"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-edit-paziente"><span class="material-symbols-rounded">edit</span>Modifica</button>
                                    <button class="ds-btn ds-btn-danger" id="ds-btn-del-paziente"><span class="material-symbols-rounded">delete</span></button>
                                `
                            })}

                            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                                <div class="ds-nav">
                                    <button class="ds-nav-btn ${currentTab === 'anagrafica' ? 'active' : ''}" data-tab="anagrafica"><span class="material-symbols-rounded">badge</span>Anagrafica & Contatti</button>
                                    <button class="ds-nav-btn ${currentTab === 'anamnesi' ? 'active' : ''}" data-tab="anamnesi"><span class="material-symbols-rounded">medical_information</span>Anamnesi Sanitaria</button>
                                    <button class="ds-nav-btn ${currentTab === 'odontogramma' ? 'active' : ''}" data-tab="odontogramma"><span class="material-symbols-rounded">dentistry</span>Odontogramma FDI</button>
                                    <button class="ds-nav-btn ${currentTab === 'trattamenti' ? 'active' : ''}" data-tab="trattamenti"><span class="material-symbols-rounded">healing</span>Diario Clinico (${trattamenti.length})</button>
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
                    el.querySelector('#ds-btn-edit-paziente').addEventListener('click', () => openPazienteModal(p));
                    el.querySelector('#ds-btn-del-paziente').addEventListener('click', async () => {
                        if (!confirm('Eliminare definitivamente questo paziente e la sua cartella clinica?')) return;
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
                                        <div><strong>Fondo Integrativo / Assicurazione:</strong> ${p.assicurazione || 'Nessuna'}</div>
                                    </div>
                                    ${p.note ? `<div style="margin-top:1rem; padding:0.8rem; background:var(--md-surface-container-low); border-radius:12px;"><strong>Note Generali:</strong><br>${p.note}</div>` : ''}
                                </div>
                            `;
                        } else if (currentTab === 'anamnesi') {
                            contentEl.innerHTML = `
                                <div class="ds-panel">
                                    <div class="ds-panel-header">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">health_and_safety</span>Scheda Anamnesi e Rischio Clinico</div>
                                        <button class="ds-btn ds-btn-primary" id="ds-save-anamnesi"><span class="material-symbols-rounded">save</span>Salva Anamnesi</button>
                                    </div>
                                    <form id="ds-anamnesi-form">
                                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:1.2rem;">
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="patologie_cardiovascolari" ${anamnesi.patologie_cardiovascolari ? 'checked' : ''}>
                                                <strong>Patologie Cardiovascolari</strong>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="terapia_anticoagulanti" ${anamnesi.terapia_anticoagulanti ? 'checked' : ''}>
                                                <strong style="color:var(--ds-rose);">Terapia Anticoagulanti (Cardioaspirina/Coumadin)</strong>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="diabete" ${anamnesi.diabete ? 'checked' : ''}>
                                                <strong>Diabete Mellito</strong>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="ipertensione" ${anamnesi.ipertensione ? 'checked' : ''}>
                                                <strong>Ipertensione Arteriosa</strong>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="epatiti_hiv" ${anamnesi.epatiti_hiv ? 'checked' : ''}>
                                                <strong>Malattie Infettive (Epatiti/HIV)</strong>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="fumatore" ${anamnesi.fumatore ? 'checked' : ''}>
                                                <strong>Fumatore Abituale</strong>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="gravidanza" ${anamnesi.gravidanza ? 'checked' : ''}>
                                                <strong>Stato di Gravidanza</strong>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                                                <input type="checkbox" name="ansia_odontoiatrica" ${anamnesi.ansia_odontoiatrica ? 'checked' : ''}>
                                                <strong>Odontofobia / Ansia</strong>
                                            </label>
                                        </div>
                                        <div class="ds-form-grid">
                                            <div class="ds-form-field" style="grid-column: 1/-1;">
                                                <label style="color:var(--ds-rose);">Allergie a Farmaci, Lattice o Anestetici</label>
                                                <input type="text" name="allergie_farmaci" class="ds-input" placeholder="Es. Penicillina, Cefalosporine, Lattice..." value="${anamnesi.allergie_farmaci || ''}">
                                            </div>
                                            <div class="ds-form-field" style="grid-column: 1/-1;">
                                                <label>Terapie Farmacologiche in Corso</label>
                                                <input type="text" name="terapie_in_corso" class="ds-input" placeholder="Elenco farmaci assunti regolarmente..." value="${anamnesi.terapie_in_corso || ''}">
                                            </div>
                                            <div class="ds-form-field" style="grid-column: 1/-1;">
                                                <label>Altre Patologie e Note Cliniche</label>
                                                <textarea name="note_mediche" class="ds-textarea" rows="3" placeholder="Informazioni mediche rilevanti...">${anamnesi.note_mediche || ''}</textarea>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            `;

                            el.querySelector('#ds-save-anamnesi').addEventListener('click', async () => {
                                try {
                                    const form = el.querySelector('#ds-anamnesi-form');
                                    const formData = new FormData(form);
                                    const payload = {
                                        paziente_id: p.id,
                                        patologie_cardiovascolari: form.querySelector('[name=patologie_cardiovascolari]').checked,
                                        terapia_anticoagulanti: form.querySelector('[name=terapia_anticoagulanti]').checked,
                                        diabete: form.querySelector('[name=diabete]').checked,
                                        ipertensione: form.querySelector('[name=ipertensione]').checked,
                                        epatiti_hiv: form.querySelector('[name=epatiti_hiv]').checked,
                                        fumatore: form.querySelector('[name=fumatore]').checked,
                                        gravidanza: form.querySelector('[name=gravidanza]').checked,
                                        ansia_odontoiatrica: form.querySelector('[name=ansia_odontoiatrica]').checked,
                                        allergie_farmaci: form.querySelector('[name=allergie_farmaci]').value,
                                        terapie_in_corso: form.querySelector('[name=terapie_in_corso]').value,
                                        note_mediche: form.querySelector('[name=note_mediche]').value
                                    };
                                    await callApi('pazienti:saveAnamnesi', payload);
                                    alert('Anamnesi aggiornata con successo');
                                } catch (err) {
                                    alert('Errore: ' + err.message);
                                }
                            });
                        } else if (currentTab === 'odontogramma') {
                            const upperAdultRight = [18, 17, 16, 15, 14, 13, 12, 11];
                            const upperAdultLeft = [21, 22, 23, 24, 25, 26, 27, 28];
                            const lowerAdultRight = [48, 47, 46, 45, 44, 43, 42, 41];
                            const lowerAdultLeft = [31, 32, 33, 34, 35, 36, 37, 38];

                            const renderTooth = (num) => {
                                const t = teethMap[num] || { stato: 'sano', superfici: '[]' };
                                const stateLabels = {
                                    sano: 'Sano',
                                    carie: 'Carie',
                                    otturazione: 'Otturato',
                                    devitalizzato: 'Devitalizzato',
                                    corona: 'Corona/Capsula',
                                    impianto: 'Impianto',
                                    estrazione_programmata: 'Da Estrarre',
                                    mancante: 'Mancante'
                                };
                                return `
                                    <div class="ds-tooth-card" data-num="${num}" data-state="${t.stato || 'sano'}" title="Dente ${num}: ${stateLabels[t.stato] || t.stato}">
                                        <div class="ds-tooth-num">${num}</div>
                                        <span class="material-symbols-rounded ds-tooth-icon">dentistry</span>
                                        <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase;">${stateLabels[t.stato] || t.stato}</div>
                                    </div>
                                `;
                            };

                            contentEl.innerHTML = `
                                <div class="ds-odontogram-wrap">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">dentistry</span>Odontogramma Dentale (Notazione Internazionale FDI)</div>
                                        <div style="display:flex; gap:0.6rem; align-items:center; font-size:0.75rem; font-weight:700;">
                                            <span class="ds-badge ds-badge-teal">Sano</span>
                                            <span class="ds-badge ds-badge-rose">Carie</span>
                                            <span class="ds-badge ds-badge-blue">Otturazione</span>
                                            <span class="ds-badge ds-badge-purple">Endodonzia</span>
                                            <span class="ds-badge ds-badge-amber">Corona</span>
                                        </div>
                                    </div>

                                    <div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--md-on-surface-variant); text-transform:uppercase; letter-spacing:0.05em;">Arcata Superiore (Mascella)</div>
                                    <div class="ds-odontogram-arch">
                                        ${upperAdultRight.map(renderTooth).join('')}
                                        <div style="width:16px; border-right:2px dashed var(--md-outline-variant); margin:0 4px;"></div>
                                        ${upperAdultLeft.map(renderTooth).join('')}
                                    </div>

                                    <div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--md-on-surface-variant); text-transform:uppercase; letter-spacing:0.05em; margin-top:1rem;">Arcata Inferiore (Mandibola)</div>
                                    <div class="ds-odontogram-arch">
                                        ${lowerAdultRight.map(renderTooth).join('')}
                                        <div style="width:16px; border-right:2px dashed var(--md-outline-variant); margin:0 4px;"></div>
                                        ${lowerAdultLeft.map(renderTooth).join('')}
                                    </div>
                                </div>
                            `;

                            contentEl.querySelectorAll('.ds-tooth-card').forEach(card => {
                                card.addEventListener('click', () => {
                                    const num = card.dataset.num;
                                    openToothModal(p.id, num, teethMap[num] || {});
                                });
                            });
                        } else if (currentTab === 'trattamenti') {
                            contentEl.innerHTML = `
                                <div class="ds-panel">
                                    <div class="ds-panel-header">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">healing</span>Diario Clinico e Prestazioni Eseguite</div>
                                        <button class="ds-btn ds-btn-primary" id="ds-add-trattamento"><span class="material-symbols-rounded">add</span>Registra Trattamento</button>
                                    </div>

                                    <div class="ds-table-wrap">
                                        <table class="ds-table">
                                            <thead>
                                                <tr>
                                                    <th>Data</th>
                                                    <th>Prestazione / Descrizione</th>
                                                    <th>Dente</th>
                                                    <th>Medico Operatore</th>
                                                    <th>Importo</th>
                                                    <th>Quota Medico</th>
                                                    <th>Quota Segreteria</th>
                                                    <th style="text-align:right;">Azioni</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${trattamenti.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun trattamento registrato per questo paziente.</td></tr>' : trattamenti.map(t => {
                                                    const med = allStaff.find(s => s.id === t.medico_id);
                                                    return `
                                                        <tr>
                                                            <td><strong>${formatDate(t.data_trattamento)}</strong></td>
                                                            <td><strong>${t.descrizione}</strong>${t.note ? '<br><small style="color:var(--md-on-surface-variant);">' + t.note + '</small>' : ''}</td>
                                                            <td>${t.dente ? `<span class="ds-badge ds-badge-teal">Dente ${t.dente}</span>` : '-'}</td>
                                                            <td>${med ? 'Dr. ' + med.cognome : '-'}</td>
                                                            <td style="font-weight:700; color:var(--md-on-surface);">${formatCurrency(t.importo)}</td>
                                                            <td style="color:var(--ds-blue); font-weight:700;">${formatCurrency(t.quota_medico)}</td>
                                                            <td style="color:var(--ds-purple); font-weight:700;">${formatCurrency(t.quota_segretaria)}</td>
                                                            <td style="text-align:right;">
                                                                <button class="ds-btn ds-btn-danger ds-del-tratt" data-id="${t.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                            </td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `;

                            contentEl.querySelector('#ds-add-trattamento').addEventListener('click', () => openTrattamentoModal(p.id));
                            contentEl.querySelectorAll('.ds-del-tratt').forEach(b => {
                                b.addEventListener('click', async () => {
                                    if (!confirm('Rimuovere questo trattamento?')) return;
                                    await callApi('pazienti:deleteTrattamento', { id: b.dataset.id });
                                    renderDetail(p.id);
                                });
                            });
                        } else if (currentTab === 'prescrizioni') {
                            contentEl.innerHTML = `
                                <div class="ds-panel">
                                    <div class="ds-panel-header">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">prescriptions</span>Ricettario e Terapie Farmacologiche</div>
                                        <button class="ds-btn ds-btn-primary" id="ds-add-prescrizione"><span class="material-symbols-rounded">add</span>Nuova Prescrizione</button>
                                    </div>

                                    <div class="ds-table-wrap">
                                        <table class="ds-table">
                                            <thead>
                                                <tr>
                                                    <th>Data</th>
                                                    <th>Farmaco & Dosaggio</th>
                                                    <th>Posologia & Istruzioni</th>
                                                    <th>Durata</th>
                                                    <th>Medico Prescrittore</th>
                                                    <th style="text-align:right;">Azioni</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${prescrizioni.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessuna prescrizione farmacologica registrata.</td></tr>' : prescrizioni.map(pr => {
                                                    const med = allStaff.find(s => s.id === pr.medico_id);
                                                    return `
                                                        <tr>
                                                            <td><strong>${formatDate(pr.data_prescrizione)}</strong></td>
                                                            <td><strong>${pr.farmaco}</strong> ${pr.dosaggio ? `(${pr.dosaggio})` : ''}${pr.principio_attivo ? `<br><small style="color:var(--md-on-surface-variant);">Principio: ${pr.principio_attivo}</small>` : ''}</td>
                                                            <td>${pr.posologia}</td>
                                                            <td>${pr.durata_giorni} giorni</td>
                                                            <td>${med ? 'Dr. ' + med.cognome : '-'}</td>
                                                            <td style="text-align:right;">
                                                                <button class="ds-btn ds-btn-danger ds-del-prescr" data-id="${pr.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                            </td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `;

                            contentEl.querySelector('#ds-add-prescrizione').addEventListener('click', () => openPrescrizioneModal(p.id));
                            contentEl.querySelectorAll('.ds-del-prescr').forEach(b => {
                                b.addEventListener('click', async () => {
                                    if (!confirm('Rimuovere questa prescrizione?')) return;
                                    await callApi('pazienti:deletePrescrizione', { id: b.dataset.id });
                                    renderDetail(p.id);
                                });
                            });
                        } else if (currentTab === 'allegati') {
                            contentEl.innerHTML = `
                                <div class="ds-panel">
                                    <div class="ds-panel-header">
                                        <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">perm_media</span>Archivio Radiografico e Documentale</div>
                                        <button class="ds-btn ds-btn-primary" id="ds-upload-allegato"><span class="material-symbols-rounded">cloud_upload</span>Carica TAC / RMN / Radiografia</button>
                                    </div>

                                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1rem;">
                                        ${allegati.length === 0 ? '<p style="grid-column:1/-1; color:var(--md-on-surface-variant); text-align:center; padding:1.5rem;">Nessun allegato presente per questo paziente.</p>' : allegati.map(al => `
                                            <div style="background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:14px; padding:1rem; display:flex; flex-direction:column; gap:0.6rem;">
                                                <div style="display:flex; align-items:center; gap:0.6rem;">
                                                    <span class="material-symbols-rounded" style="font-size:1.8rem; color:var(--ds-teal);">${al.tipo.includes('tac') ? 'biotech' : (al.tipo.includes('rmn') ? 'radiology' : 'image')}</span>
                                                    <div style="flex:1; min-width:0;">
                                                        <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${al.titolo}</div>
                                                        <div style="font-size:0.75rem; color:var(--md-on-surface-variant);">${formatDate(al.data_esame)} • ${(al.file_size / 1024).toFixed(0)} KB</div>
                                                    </div>
                                                </div>
                                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem;">
                                                    <span class="ds-badge ds-badge-teal">${al.tipo.toUpperCase()}</span>
                                                    <div style="display:flex; gap:0.4rem;">
                                                        <button class="ds-btn ds-btn-ghost ds-open-allegato" data-id="${al.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">visibility</span> Apri</button>
                                                        <button class="ds-btn ds-btn-danger ds-del-allegato" data-id="${al.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;

                            contentEl.querySelector('#ds-upload-allegato').addEventListener('click', async () => {
                                try {
                                    const tipo = prompt('Tipo di esame (es: rx_endorale, opt, tac_cbct, rmn, referto_pdf):', 'tac_cbct') || 'rx';
                                    const titolo = prompt('Titolo / Descrizione Esame:', 'TAC Cone Beam 3D') || 'Esame Diagnostico';
                                    const upRes = await callApi('allegati:upload', { paziente_id: p.id, tipo, titolo });
                                    if (upRes && upRes.success) {
                                        renderDetail(p.id);
                                    }
                                } catch (err) {}
                            });

                            contentEl.querySelectorAll('.ds-open-allegato').forEach(b => {
                                b.addEventListener('click', () => callApi('allegati:open', { id: b.dataset.id }));
                            });

                            contentEl.querySelectorAll('.ds-del-allegato').forEach(b => {
                                b.addEventListener('click', async () => {
                                    if (!confirm('Rimuovere questo allegato?')) return;
                                    await callApi('allegati:delete', { id: b.dataset.id });
                                    renderDetail(p.id);
                                });
                            });
                        }
                    }

                    renderTabContent();
                } catch (e) {
                    renderList();
                }
            }

            function openPazienteModal(paziente = null) {
                const isEdit = !!paziente;
                const modalHtml = renderModal({
                    id: 'ds-modal-paziente',
                    title: isEdit ? 'Modifica Dati Paziente' : 'Nuovo Paziente Odontoiatrico',
                    icon: isEdit ? 'edit' : 'person_add',
                    bodyHtml: `
                        <form id="ds-form-paziente">
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Cognome *</label>
                                    <input type="text" name="cognome" class="ds-input" required value="${paziente ? paziente.cognome : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Nome *</label>
                                    <input type="text" name="nome" class="ds-input" required value="${paziente ? paziente.nome : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Codice Fiscale *</label>
                                    <input type="text" name="codice_fiscale" class="ds-input" required maxlength="16" style="text-transform:uppercase;" value="${paziente ? paziente.codice_fiscale : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Data di Nascita</label>
                                    <input type="date" name="data_nascita" class="ds-input" value="${paziente ? paziente.data_nascita : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Telefono / Cellulare</label>
                                    <input type="text" name="telefono" class="ds-input" value="${paziente ? paziente.telefono : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Email</label>
                                    <input type="email" name="email" class="ds-input" value="${paziente ? paziente.email : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Città</label>
                                    <input type="text" name="citta" class="ds-input" value="${paziente ? paziente.citta : ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Fondo Sanitario / Assicurazione</label>
                                    <input type="text" name="assicurazione" class="ds-input" placeholder="Es. Unisalute, Metasalute, Fasi..." value="${paziente ? paziente.assicurazione : ''}">
                                </div>
                                <div class="ds-form-field" style="grid-column: 1/-1;">
                                    <label>Indirizzo di Residenza</label>
                                    <input type="text" name="indirizzo" class="ds-input" value="${paziente ? paziente.indirizzo : ''}">
                                </div>
                                <div class="ds-form-field" style="grid-column: 1/-1;">
                                    <label>Note Generali</label>
                                    <textarea name="note" class="ds-textarea" rows="2">${paziente ? paziente.note : ''}</textarea>
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-modal-save-paziente"><span class="material-symbols-rounded">save</span>Salva Paziente</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-paziente');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-modal-save-paziente').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-paziente');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        if (isEdit) payload.id = paziente.id;

                        const action = isEdit ? 'pazienti:update' : 'pazienti:create';
                        const res = await callApi(action, payload);
                        if (res && res.success) {
                            close();
                            if (isEdit) renderDetail(paziente.id);
                            else if (res.data && res.data.id) renderDetail(res.data.id);
                            else renderList();
                        } else {
                            alert(res.error || 'Errore durante il salvataggio');
                        }
                    } catch (err) {
                        alert(err.message);
                    }
                });
            }

            function openToothModal(pazienteId, numeroDente, currentData = {}) {
                const modalHtml = renderModal({
                    id: 'ds-modal-tooth',
                    title: `Stato Clinico Dente ${numeroDente}`,
                    icon: 'dentistry',
                    bodyHtml: `
                        <form id="ds-form-tooth">
                            <div class="ds-form-grid">
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Diagnosi / Stato del Dente</label>
                                    <select name="stato" class="ds-select">
                                        <option value="sano" ${currentData.stato === 'sano' ? 'selected' : ''}>Sano</option>
                                        <option value="carie" ${currentData.stato === 'carie' ? 'selected' : ''}>Carie Attiva</option>
                                        <option value="otturazione" ${currentData.stato === 'otturazione' ? 'selected' : ''}>Otturazione Esistente</option>
                                        <option value="devitalizzato" ${currentData.stato === 'devitalizzato' ? 'selected' : ''}>Trattamento Endodontico (Devitalizzato)</option>
                                        <option value="corona" ${currentData.stato === 'corona' ? 'selected' : ''}>Corona / Capsula Protesica</option>
                                        <option value="impianto" ${currentData.stato === 'impianto' ? 'selected' : ''}>Impianto Osteointegrato</option>
                                        <option value="estrazione_programmata" ${currentData.stato === 'estrazione_programmata' ? 'selected' : ''}>Estrazione Programmata</option>
                                        <option value="mancante" ${currentData.stato === 'mancante' ? 'selected' : ''}>Elemento Mancante / Agenesia</option>
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Superfici Coinvolte</label>
                                    <input type="text" name="superfici" class="ds-input" placeholder="Es. Occlusale, Mesiale, Distale..." value="${currentData.superfici || ''}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Materiale di Ricostruzione</label>
                                    <input type="text" name="materiale" class="ds-input" placeholder="Es. Composito, Ceramica, Zirconio..." value="${currentData.materiale || ''}">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Note e Osservazioni</label>
                                    <textarea name="note" class="ds-textarea" rows="2">${currentData.note || ''}</textarea>
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-tooth"><span class="material-symbols-rounded">save</span>Salva Dente</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-tooth');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-tooth').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-tooth');
                        const payload = {
                            paziente_id: pazienteId,
                            numero_dente: numeroDente,
                            stato: form.querySelector('[name=stato]').value,
                            superfici: form.querySelector('[name=superfici]').value,
                            materiale: form.querySelector('[name=materiale]').value,
                            note: form.querySelector('[name=note]').value
                        };
                        await callApi('pazienti:saveOdontogrammaDente', payload);
                        close();
                        renderDetail(pazienteId);
                    } catch (err) {}
                });
            }

            function openTrattamentoModal(pazienteId) {
                const prestOptions = allPrestazioni.map(pr => `<option value="${pr.id}" data-prezzo="${pr.prezzo_paziente}" data-qmed-tipo="${pr.tipo_quota_medico}" data-qmed-val="${pr.valore_quota_medico}" data-qseg-tipo="${pr.tipo_quota_segretaria}" data-qseg-val="${pr.valore_quota_segretaria}" data-cmat="${pr.costo_materiale_stimato}">${pr.nome} (${formatCurrency(pr.prezzo_paziente)})</option>`).join('');
                const staffOptions = allStaff.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('igienista') || s.ruolo.includes('direttore')).map(s => `<option value="${s.id}">Dr. ${s.cognome} ${s.nome} (${s.specializzazione || s.ruolo})</option>`).join('');
                const segretariaOptions = allStaff.filter(s => s.ruolo.includes('segretaria') || s.ruolo.includes('aso')).map(s => `<option value="${s.id}">${s.cognome} ${s.nome}</option>`).join('');

                const modalHtml = renderModal({
                    id: 'ds-modal-trattamento',
                    title: 'Registrazione Trattamento Odontoiatrico',
                    icon: 'healing',
                    bodyHtml: `
                        <form id="ds-form-trattamento">
                            <div class="ds-form-grid">
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Prestazione dal Listino</label>
                                    <select name="prestazione_id" id="ds-sel-prestazione" class="ds-select">
                                        <option value="">-- Seleziona Prestazione --</option>
                                        ${prestOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Descrizione Trattamento *</label>
                                    <input type="text" name="descrizione" id="ds-tratt-desc" class="ds-input" required placeholder="Es. Otturazione molare 16...">
                                </div>
                                <div class="ds-form-field">
                                    <label>Dente (FDI)</label>
                                    <input type="number" name="dente" class="ds-input" placeholder="Es. 16, 21, 46...">
                                </div>
                                <div class="ds-form-field">
                                    <label>Data Esecuzione</label>
                                    <input type="date" name="data_trattamento" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="ds-form-field">
                                    <label>Medico Operatore *</label>
                                    <select name="medico_id" class="ds-select" required>
                                        <option value="">-- Seleziona Medico --</option>
                                        ${staffOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Assistente / Segretaria</label>
                                    <select name="segretaria_id" class="ds-select">
                                        <option value="">-- Nessuna --</option>
                                        ${segretariaOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Importo Paziente (€) *</label>
                                    <input type="number" step="0.01" name="importo" id="ds-tratt-importo" class="ds-input" required value="0.00">
                                </div>
                                <div class="ds-form-field">
                                    <label>Quota Medico (€)</label>
                                    <input type="number" step="0.01" name="quota_medico" id="ds-tratt-qmed" class="ds-input" value="0.00">
                                </div>
                                <div class="ds-form-field">
                                    <label>Quota Segretaria/ASO (€)</label>
                                    <input type="number" step="0.01" name="quota_segretaria" id="ds-tratt-qseg" class="ds-input" value="0.00">
                                </div>
                                <div class="ds-form-field">
                                    <label>Costo Materiale / Laboratorio (€)</label>
                                    <input type="number" step="0.01" name="costo_materiali" id="ds-tratt-cmat" class="ds-input" value="0.00">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Note Cliniche Operative</label>
                                    <textarea name="note" class="ds-textarea" rows="2"></textarea>
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-tratt"><span class="material-symbols-rounded">save</span>Salva Trattamento</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-trattamento');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                const selPrest = mEl.querySelector('#ds-sel-prestazione');
                if (selPrest) {
                    selPrest.addEventListener('change', () => {
                        const opt = selPrest.selectedOptions[0];
                        if (opt && opt.value) {
                            const prezzo = Number(opt.dataset.prezzo) || 0;
                            const qMedTipo = opt.dataset.qmedTipo;
                            const qMedVal = Number(opt.dataset.qmedVal) || 0;
                            const qSegTipo = opt.dataset.qsegTipo;
                            const qSegVal = Number(opt.dataset.qsegVal) || 0;
                            const cmat = Number(opt.dataset.cmat) || 0;

                            const qMedComputed = qMedTipo === 'percentuale' ? (prezzo * qMedVal / 100) : qMedVal;
                            const qSegComputed = qSegTipo === 'percentuale' ? (prezzo * qSegVal / 100) : qSegVal;

                            mEl.querySelector('#ds-tratt-desc').value = opt.textContent.split(' (')[0];
                            mEl.querySelector('#ds-tratt-importo').value = prezzo.toFixed(2);
                            mEl.querySelector('#ds-tratt-qmed').value = qMedComputed.toFixed(2);
                            mEl.querySelector('#ds-tratt-qseg').value = qSegComputed.toFixed(2);
                            mEl.querySelector('#ds-tratt-cmat').value = cmat.toFixed(2);
                        }
                    });
                }

                mEl.querySelector('#ds-save-tratt').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-trattamento');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        payload.paziente_id = pazienteId;
                        const res = await callApi('pazienti:addTrattamento', payload);
                        if (res && res.success) {
                            close();
                            renderDetail(pazienteId);
                        } else {
                            alert(res.error || 'Errore durante il salvataggio');
                        }
                    } catch (err) {
                        alert(err.message);
                    }
                });
            }

            function openPrescrizioneModal(pazienteId) {
                const staffOptions = allStaff.filter(s => s.ruolo.includes('medico') || s.ruolo.includes('direttore')).map(s => `<option value="${s.id}">Dr. ${s.cognome} ${s.nome}</option>`).join('');

                const modalHtml = renderModal({
                    id: 'ds-modal-prescrizione',
                    title: 'Nuova Prescrizione Farmaceutica',
                    icon: 'prescriptions',
                    bodyHtml: `
                        <form id="ds-form-prescrizione">
                            <div class="ds-form-grid">
                                <div class="ds-form-field">
                                    <label>Farmaco Commerciale *</label>
                                    <input type="text" name="farmaco" class="ds-input" required placeholder="Es. Augmentin, Oki, Brufen, Curasept...">
                                </div>
                                <div class="ds-form-field">
                                    <label>Principio Attivo</label>
                                    <input type="text" name="principio_attivo" class="ds-input" placeholder="Es. Amoxicillina + Acido Clavulanico">
                                </div>
                                <div class="ds-form-field">
                                    <label>Dosaggio</label>
                                    <input type="text" name="dosaggio" class="ds-input" placeholder="Es. 1g, 80mg, 0.20%...">
                                </div>
                                <div class="ds-form-field">
                                    <label>Durata Terapia (Giorni)</label>
                                    <input type="number" name="durata_giorni" class="ds-input" value="6">
                                </div>
                                <div class="ds-form-field" style="grid-column:1/-1;">
                                    <label>Posologia e Modalità d'Assunzione *</label>
                                    <input type="text" name="posologia" class="ds-input" required placeholder="Es. 1 compressa ogni 12 ore a stomaco pieno per 6 giorni">
                                </div>
                                <div class="ds-form-field">
                                    <label>Medico Prescrittore</label>
                                    <select name="medico_id" class="ds-select">
                                        <option value="">-- Seleziona --</option>
                                        ${staffOptions}
                                    </select>
                                </div>
                                <div class="ds-form-field">
                                    <label>Data Prescrizione</label>
                                    <input type="date" name="data_prescrizione" class="ds-input" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                            </div>
                        </form>
                    `,
                    footerHtml: `
                        <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                        <button type="button" class="ds-btn ds-btn-primary" id="ds-save-prescr"><span class="material-symbols-rounded">save</span>Salva Prescrizione</button>
                    `
                });

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHtml;
                document.body.appendChild(modalContainer);
                const mEl = modalContainer.querySelector('#ds-modal-prescrizione');
                mEl.style.display = 'flex';

                const close = () => { modalContainer.remove(); };
                mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

                mEl.querySelector('#ds-save-prescr').addEventListener('click', async () => {
                    try {
                        const form = mEl.querySelector('#ds-form-prescrizione');
                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        payload.paziente_id = pazienteId;
                        const res = await callApi('pazienti:addPrescrizione', payload);
                        if (res && res.success) {
                            close();
                            renderDetail(pazienteId);
                        } else {
                            alert(res.error || 'Errore');
                        }
                    } catch (err) {
                        alert(err.message);
                    }
                });
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
