import { toast } from '../js/utils.js';
import { heroHtml, campoHtml, leggiCampo } from '../shared/ui_kit.js';
import { euro, riepilogoEconomicoHtml } from '../shared/calc_display.js';
import { callApi } from '../shared/api.js';

const STATO_LABELS = { bozza: 'Bozza', inviato: 'Inviato', accettato: 'Accettato', rifiutato: 'Rifiutato', pagato: 'Pagato' };
const STATO_TONE = { bozza: '#64748b', inviato: '#2563eb', accettato: '#059669', rifiutato: '#dc2626', pagato: '#7c3aed' };

const HEADER_FIELDS = [
    { key: 'cliente_ragione_sociale', label: 'Cliente (Ragione Sociale/Nome)', icon: 'business', required: true, full: true },
    { key: 'cliente_piva', label: 'Partita IVA', icon: 'tag' },
    { key: 'cliente_codice_fiscale', label: 'Codice Fiscale', icon: 'badge' },
    { key: 'cliente_email', label: 'Email', icon: 'mail' },
    { key: 'cliente_indirizzo', label: 'Indirizzo', icon: 'location_on', full: true },
    { key: 'cliente_citta', label: 'Città', icon: 'location_city' },
    { key: 'cliente_cap', label: 'CAP', icon: 'markunread_mailbox' },
    { key: 'cliente_provincia', label: 'Provincia', icon: 'map' },
    { key: 'titolo', label: 'Titolo Preventivo', icon: 'title', full: true },
    { key: 'data_emissione', label: 'Data Emissione', icon: 'event', type: 'date' },
    { key: 'data_scadenza', label: 'Valido fino al', icon: 'event_busy', type: 'date' },
    { key: 'aliquota_iva', label: 'Aliquota IVA (%)', icon: 'percent', type: 'number' },
    { key: 'arrotonda', label: 'Arrotonda il totale all\'euro', type: 'checkbox' },
    { key: 'condizioni_pagamento', label: 'Condizioni di Pagamento', icon: 'schedule', full: true },
    { key: 'note', label: 'Note', icon: 'notes', type: 'textarea', full: true }
];

export function render(el) {
    let activeTab = 'tutti';

    function renderList() {
        el.innerHTML = `
            <div class="fade-in-up ak-root">
                ${heroHtml({
                    title: 'Preventivi', subtitle: 'Elenco dei preventivi commerciali', icon: 'request_quote', tone: 'blue',
                    actionsHtml: `<button id="prv-btn-new" class="ak-hero-btn"><span class="material-symbols-rounded">add</span>Nuovo Preventivo</button>`
                })}
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;" id="prv-tabs"></div>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Elenco <span class="ak-count" id="prv-count">0</span></h3></div>
                    <div class="ak-panel-body" id="prv-grid"></div>
                </section>
            </div>
        `;
        const tabsBox = el.querySelector('#prv-tabs');
        const tabs = [['tutti', 'Tutti'], ['bozza', 'Bozza'], ['inviato', 'Inviato'], ['accettato', 'Accettato'], ['rifiutato', 'Rifiutato'], ['pagato', 'Pagato']];
        tabsBox.innerHTML = tabs.map(([k, l]) => `<button class="ak-btn ${activeTab === k ? 'ak-btn-primary' : 'ak-btn-ghost'}" data-tab="${k}" style="border:1px solid var(--md-outline-variant);">${l}</button>`).join('');
        tabsBox.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-tab'); renderList(); });
        });
        el.querySelector('#prv-btn-new').addEventListener('click', createNewAndOpen);
        loadList();
    }

    async function loadList() {
        const grid = el.querySelector('#prv-grid');
        const countEl = el.querySelector('#prv-count');
        const res = await callApi('preventivi:getAll', activeTab === 'tutti' ? {} : { stato: activeTab });
        const rows = (res && res.success) ? res.data : [];
        countEl.textContent = rows.length;
        if (rows.length === 0) {
            grid.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">request_quote</span><h4>Nessun preventivo</h4><p>Crea il tuo primo preventivo per iniziare.</p></div>`;
            return;
        }
        grid.innerHTML = `<div class="ak-cards">${rows.map(r => `
            <div class="ak-card fade-in-up" style="--ak-accent:${STATO_TONE[r.stato] || '#2563eb'};" data-id="${r.id}">
                <span class="ak-card-badge" style="background:${STATO_TONE[r.stato] || '#2563eb'};">${STATO_LABELS[r.stato] || r.stato}</span>
                <div class="ak-card-title">${r.numero || '—'}</div>
                <div class="ak-card-sub">${r.cliente_ragione_sociale || 'Cliente non specificato'}</div>
                <div class="ak-card-meta"><span class="material-symbols-rounded" style="font-size:1rem;">payments</span>${euro(r.totale_ivato)} — ${r.data_emissione || ''}</div>
                <div class="ak-card-actions">
                    <button class="ak-iconbtn prv-btn-duplica" data-id="${r.id}" title="Duplica"><span class="material-symbols-rounded">content_copy</span></button>
                    <button class="ak-iconbtn danger prv-btn-delete" data-id="${r.id}" title="Elimina"><span class="material-symbols-rounded">delete</span></button>
                </div>
            </div>
        `).join('')}</div>`;
        grid.querySelectorAll('.ak-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.ak-iconbtn')) return;
                openEditor(card.getAttribute('data-id'));
            });
        });
        grid.querySelectorAll('.prv-btn-duplica').forEach(btn => {
            btn.addEventListener('click', async () => {
                const res2 = await callApi('preventivi:duplica', { id: btn.getAttribute('data-id') });
                if (res2.success) { toast('Preventivo duplicato', 'success'); openEditor(res2.data.id); }
                else toast(res2.error || 'Errore duplicazione', 'error');
            });
        });
        grid.querySelectorAll('.prv-btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Eliminare questo preventivo?')) return;
                await callApi('preventivi:remove', { id: btn.getAttribute('data-id') });
                toast('Preventivo eliminato', 'success');
                loadList();
            });
        });
    }

    async function createNewAndOpen() {
        const res = await callApi('preventivi:create', { aliquota_iva: 22, cliente_nazione: 'Italia' });
        if (res.success) openEditor(res.data.id);
        else toast(res.error || 'Errore creazione', 'error');
    }

    async function openEditor(id) {
        const res = await callApi('preventivi:getById', { id });
        if (!res.success) { toast(res.error || 'Preventivo non trovato', 'error'); return; }
        renderEditor(res.data);
    }

    function renderEditor(state) {
        let { preventivo, voci, assegnazioni } = state;
        el.innerHTML = `
            <div class="fade-in-up ak-root">
                ${heroHtml({
                    title: preventivo.numero || 'Nuovo Preventivo', subtitle: STATO_LABELS[preventivo.stato] || preventivo.stato, icon: 'request_quote', tone: 'blue',
                    actionsHtml: `
                        <select id="prv-stato-select" class="ak-hero-btn" style="cursor:pointer;">
                            ${Object.keys(STATO_LABELS).map(s => `<option value="${s}" ${s === preventivo.stato ? 'selected' : ''}>${STATO_LABELS[s]}</option>`).join('')}
                        </select>
                        <button id="prv-btn-back" class="ak-hero-btn"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>
                    `
                })}
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Dati Cliente e Testata</h3></div>
                    <div class="ak-panel-body">
                        <div class="ak-form-grid" id="prv-header-fields"></div>
                        <div style="margin-top:1rem;"><button id="prv-btn-save-header" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">save</span>Salva Testata</button></div>
                    </div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Righe Preventivo</h3><button id="prv-btn-add-voce" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">add</span>Aggiungi Riga</button></div>
                    <div class="ak-panel-body" id="prv-voci-list"></div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Collaboratori Assegnati</h3><button id="prv-btn-add-assegnazione" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">add</span>Assegna Collaboratore</button></div>
                    <div class="ak-panel-body" id="prv-assegnazioni-list"></div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Riepilogo Economico</h3></div>
                    <div class="ak-panel-body" id="prv-riepilogo"></div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Documenti e Azioni</h3></div>
                    <div class="ak-panel-body" style="display:flex; gap:0.7rem; flex-wrap:wrap;">
                        <button id="prv-btn-pdf" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">picture_as_pdf</span>Genera PDF</button>
                        <button id="prv-btn-excel" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">table_view</span>Genera Excel</button>
                        <button id="prv-btn-email" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">mail</span>Invia via Email</button>
                        <button id="prv-btn-fattura" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">receipt_long</span>Converti in Fattura</button>
                        <button id="prv-btn-delete" class="ak-btn ak-btn-danger"><span class="material-symbols-rounded">delete</span>Elimina Preventivo</button>
                    </div>
                </section>
            </div>
        `;

        el.querySelector('#prv-btn-back').addEventListener('click', renderList);
        el.querySelector('#prv-header-fields').innerHTML = HEADER_FIELDS.map(f => campoHtml(f, preventivo[f.key])).join('');

        el.querySelector('#prv-stato-select').addEventListener('change', async (e) => {
            await callApi('preventivi:setStato', { id: preventivo.id, stato: e.target.value });
            toast('Stato aggiornato', 'success');
        });

        el.querySelector('#prv-btn-save-header').addEventListener('click', async () => {
            const payload = { id: preventivo.id };
            HEADER_FIELDS.forEach(f => { payload[f.key] = leggiCampo(el, f, 'crud-field-'); });
            const res = await callApi('preventivi:update', payload);
            if (res.success) { toast('Testata salvata', 'success'); preventivo = { ...preventivo, ...payload }; renderRiepilogo(res.data); }
            else toast(res.error || 'Errore salvataggio', 'error');
        });

        function renderRiepilogo(totali) {
            el.querySelector('#prv-riepilogo').innerHTML = riepilogoEconomicoHtml(totali || preventivo, { documentLabel: 'Preventivo' });
        }
        renderRiepilogo(preventivo);

        function renderVoci() {
            const box = el.querySelector('#prv-voci-list');
            if (voci.length === 0) {
                box.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">list_alt</span><p>Nessuna riga aggiunta.</p></div>`;
                return;
            }
            box.innerHTML = voci.map(v => `
                <div class="ak-card fade-in-up" style="margin-bottom:0.7rem;" data-id="${v.id}">
                    <div class="ak-form-grid">
                        <div class="ak-field"><label class="ak-flabel">Descrizione</label><input class="ak-input voce-descrizione" value="${v.descrizione || ''}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Qtà</label><input type="number" class="ak-input voce-quantita" value="${v.quantita}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Prezzo Acquisto</label><input type="number" class="ak-input voce-prezzo-acquisto" value="${v.prezzo_acquisto}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Prezzo Vendita</label><input type="number" class="ak-input voce-prezzo-vendita" value="${v.prezzo_vendita}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Sconto %</label><input type="number" class="ak-input voce-sconto" value="${v.sconto_percentuale}" style="padding-left:0.85rem;"></div>
                    </div>
                    <div class="ak-card-meta" style="margin-top:0.6rem;">Totale riga: <strong>${euro(v.totale_voce)}</strong> — Margine: ${euro(v.margine_euro)} (${(v.margine_percentuale || 0).toFixed(1)}%)</div>
                    <div class="ak-card-actions">
                        <button class="ak-iconbtn voce-btn-save" title="Salva Riga"><span class="material-symbols-rounded">save</span></button>
                        <button class="ak-iconbtn danger voce-btn-delete" title="Elimina Riga"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                </div>
            `).join('');
            box.querySelectorAll('.voce-btn-save').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.ak-card');
                    const id = card.getAttribute('data-id');
                    const payload = {
                        id, preventivoId: preventivo.id,
                        descrizione: card.querySelector('.voce-descrizione').value,
                        quantita: card.querySelector('.voce-quantita').value,
                        prezzo_acquisto: card.querySelector('.voce-prezzo-acquisto').value,
                        prezzo_vendita: card.querySelector('.voce-prezzo-vendita').value,
                        sconto_percentuale: card.querySelector('.voce-sconto').value
                    };
                    const res = await callApi('preventivi:updateVoce', payload);
                    if (res.success) { toast('Riga aggiornata', 'success'); await reloadState(); }
                    else toast(res.error || 'Errore', 'error');
                });
            });
            box.querySelectorAll('.voce-btn-delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.ak-card');
                    const res = await callApi('preventivi:removeVoce', { id: card.getAttribute('data-id'), preventivoId: preventivo.id });
                    if (res.success) { toast('Riga eliminata', 'success'); await reloadState(); }
                });
            });
        }
        renderVoci();

        el.querySelector('#prv-btn-add-voce').addEventListener('click', async () => {
            const res = await callApi('preventivi:addVoce', { preventivoId: preventivo.id, descrizione: 'Nuova voce', quantita: 1, prezzo_vendita: 0 });
            if (res.success) await reloadState();
        });

        function renderAssegnazioni() {
            const box = el.querySelector('#prv-assegnazioni-list');
            if (assegnazioni.length === 0) {
                box.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">groups</span><p>Nessun collaboratore assegnato.</p></div>`;
                return;
            }
            box.innerHTML = assegnazioni.map(a => `
                <div class="ak-card fade-in-up" style="margin-bottom:0.7rem;" data-id="${a.id}">
                    <div class="ak-form-grid">
                        <div class="ak-field"><label class="ak-flabel">Titolo (visibile al cliente)</label><input class="ak-input asg-titolo" value="${a.titolo_voce || ''}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Tipo Compenso</label>
                            <select class="ak-input asg-tipo" style="padding-left:0.85rem;">
                                <option value="percentuale" ${a.tipo_compenso === 'percentuale' ? 'selected' : ''}>Percentuale</option>
                                <option value="fisso" ${a.tipo_compenso === 'fisso' ? 'selected' : ''}>Fisso</option>
                            </select>
                        </div>
                        <div class="ak-field"><label class="ak-flabel">Percentuale %</label><input type="number" class="ak-input asg-percentuale" value="${a.percentuale_applicata}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Compenso Fisso €</label><input type="number" class="ak-input asg-fisso" value="${a.compenso_fisso}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Prezzo al Cliente €</label><input type="number" class="ak-input asg-prezzo-cliente" value="${a.prezzo_al_cliente}" style="padding-left:0.85rem;"></div>
                    </div>
                    <div class="ak-card-meta" style="margin-top:0.6rem;">Compenso calcolato: <strong>${euro(a.compenso_calcolato)}</strong></div>
                    <div class="ak-card-actions">
                        <button class="ak-iconbtn asg-btn-save" title="Salva"><span class="material-symbols-rounded">save</span></button>
                        <button class="ak-iconbtn danger asg-btn-delete" title="Rimuovi"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                </div>
            `).join('');
            box.querySelectorAll('.asg-btn-save').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.ak-card');
                    const payload = {
                        id: card.getAttribute('data-id'), preventivoId: preventivo.id,
                        titolo_voce: card.querySelector('.asg-titolo').value,
                        tipo_compenso: card.querySelector('.asg-tipo').value,
                        percentuale_applicata: card.querySelector('.asg-percentuale').value,
                        compenso_fisso: card.querySelector('.asg-fisso').value,
                        prezzo_al_cliente: card.querySelector('.asg-prezzo-cliente').value
                    };
                    const res = await callApi('preventivi:updateAssegnazione', payload);
                    if (res.success) { toast('Assegnazione aggiornata', 'success'); await reloadState(); }
                });
            });
            box.querySelectorAll('.asg-btn-delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.ak-card');
                    const res = await callApi('preventivi:removeAssegnazione', { id: card.getAttribute('data-id'), preventivoId: preventivo.id });
                    if (res.success) { toast('Assegnazione rimossa', 'success'); await reloadState(); }
                });
            });
        }
        renderAssegnazioni();

        el.querySelector('#prv-btn-add-assegnazione').addEventListener('click', async () => {
            const collabRes = await callApi('collaboratori:getAll');
            const collaboratori = (collabRes && collabRes.success) ? collabRes.data : [];
            if (collaboratori.length === 0) { toast('Registra prima un collaboratore nell\'apposita sezione', 'info'); return; }
            const collaboratoreId = collaboratori[0].id;
            const res = await callApi('preventivi:addAssegnazione', { preventivoId: preventivo.id, collaboratoreId, titolo_voce: 'Servizio', tipo_compenso: 'percentuale', percentuale_applicata: collaboratori[0].percentuale_commissione_default || 0 });
            if (res.success) await reloadState();
        });

        async function reloadState() {
            const res = await callApi('preventivi:getById', { id: preventivo.id });
            if (!res.success) return;
            preventivo = res.data.preventivo;
            voci = res.data.voci;
            assegnazioni = res.data.assegnazioni;
            renderVoci();
            renderAssegnazioni();
            renderRiepilogo(preventivo);
        }

        async function downloadDocumento(kind) {
            const action = kind === 'pdf' ? 'documenti:generatePreventivoPdf' : 'documenti:generatePreventivoExcel';
            const res = await callApi(action, { id: preventivo.id });
            if (!res.success) { toast(res.error || 'Errore generazione documento', 'error'); return null; }
            const filters = kind === 'pdf' ? [{ name: 'PDF', extensions: ['pdf'] }] : [{ name: 'Excel', extensions: ['xlsx'] }];
            const saveRes = await callApi('documenti:salvaFile', { base64: res.data.base64, fileName: res.data.fileName, filters });
            if (saveRes.success) toast('Documento salvato con successo', 'success');
            return res.data;
        }

        el.querySelector('#prv-btn-pdf').addEventListener('click', () => downloadDocumento('pdf'));
        el.querySelector('#prv-btn-excel').addEventListener('click', () => downloadDocumento('excel'));

        el.querySelector('#prv-btn-email').addEventListener('click', async () => {
            if (!preventivo.cliente_email) { toast('Il cliente non ha un indirizzo email registrato', 'error'); return; }
            const res = await callApi('documenti:generatePreventivoPdf', { id: preventivo.id });
            if (!res.success) { toast(res.error || 'Errore generazione PDF', 'error'); return; }
            try {
                const mailRes = await window.electronAPI.sendMail({
                    to: preventivo.cliente_email,
                    subject: `Preventivo ${preventivo.numero}`,
                    html: `<p>Gentile ${preventivo.cliente_ragione_sociale},</p><p>in allegato il preventivo ${preventivo.numero}.</p>`,
                    attachments: [{ filename: res.data.fileName, contentBase64: res.data.base64 }]
                });
                if (mailRes && mailRes.success !== false) toast('Email inviata con successo', 'success');
                else toast((mailRes && mailRes.error) || 'Invio email fallito', 'error');
            } catch (e) {
                toast(e.message || 'Invio email fallito', 'error');
            }
        });

        el.querySelector('#prv-btn-fattura').addEventListener('click', async () => {
            const res = await callApi('fatture:createFromPreventivo', { preventivoId: preventivo.id });
            if (res.success) {
                toast('Fattura creata con successo', 'success');
                await callApi('preventivi:setStato', { id: preventivo.id, stato: 'accettato' });
                const { Router } = await import('../js/utils.js');
                Router.navigate('app_container', { appId: 'adestio_business_suite', moduleId: 'invoices' });
            } else {
                toast(res.error || 'Errore conversione in fattura', 'error');
            }
        });

        el.querySelector('#prv-btn-delete').addEventListener('click', async () => {
            if (!confirm('Eliminare definitivamente questo preventivo?')) return;
            await callApi('preventivi:remove', { id: preventivo.id });
            toast('Preventivo eliminato', 'success');
            renderList();
        });
    }

    renderList();
}
