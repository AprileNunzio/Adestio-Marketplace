import { toast } from '../js/utils.js';
import { heroHtml, campoHtml, leggiCampo } from '../shared/ui_kit.js';
import { euro, riepilogoEconomicoHtml } from '../shared/calc_display.js';
import { callApi } from '../shared/api.js';

const STATO_LABELS = { bozza: 'Bozza', inviata: 'Inviata', pagata: 'Pagata' };
const STATO_TONE = { bozza: '#64748b', inviata: '#2563eb', pagata: '#059669' };
const TIPO_DOC_LABELS = { TD01: 'Fattura', TD04: 'Nota di Credito', TD05: 'Nota di Debito', TD24: 'Parcella' };

const HEADER_FIELDS = [
    { key: 'cliente_ragione_sociale', label: 'Cliente', icon: 'business', required: true, full: true },
    { key: 'cliente_piva', label: 'Partita IVA', icon: 'tag' },
    { key: 'cliente_codice_fiscale', label: 'Codice Fiscale', icon: 'badge' },
    { key: 'cliente_pec', label: 'PEC', icon: 'forward_to_inbox' },
    { key: 'cliente_codice_destinatario', label: 'Codice Destinatario SDI', icon: 'alternate_email' },
    { key: 'cliente_indirizzo', label: 'Indirizzo', icon: 'location_on', full: true },
    { key: 'cliente_citta', label: 'Città', icon: 'location_city' },
    { key: 'cliente_cap', label: 'CAP', icon: 'markunread_mailbox' },
    { key: 'cliente_provincia', label: 'Provincia', icon: 'map' },
    { key: 'data_emissione', label: 'Data Emissione', icon: 'event', type: 'date' },
    { key: 'regime_fiscale', label: 'Regime Fiscale', icon: 'gavel', type: 'select', options: [
        { value: 'RF01', label: 'RF01 — Ordinario' }, { value: 'RF19', label: 'RF19 — Forfettario' }
    ]},
    { key: 'modalita_pagamento', label: 'Modalità Pagamento', icon: 'payments', type: 'select', options: [
        { value: 'MP05', label: 'MP05 — Bonifico' }, { value: 'MP08', label: 'MP08 — Carta di Pagamento' }, { value: 'MP01', label: 'MP01 — Contanti' }
    ]},
    { key: 'ritenuta_acconto_attiva', label: 'Applica Ritenuta d\'Acconto', type: 'checkbox' },
    { key: 'ritenuta_acconto_percentuale', label: 'Ritenuta (%)', icon: 'percent', type: 'number' },
    { key: 'cassa_previdenziale_attiva', label: 'Applica Cassa Previdenziale', type: 'checkbox' },
    { key: 'cassa_previdenziale_percentuale', label: 'Cassa Previdenziale (%)', icon: 'percent', type: 'number' },
    { key: 'split_payment', label: 'Split Payment (PA)', type: 'checkbox' },
    { key: 'bollo_virtuale', label: 'Applica Bollo Virtuale', type: 'checkbox' },
    { key: 'importo_bollo', label: 'Importo Bollo (€)', icon: 'stamp', type: 'number' },
    { key: 'codice_cig', label: 'Codice CIG', icon: 'confirmation_number' },
    { key: 'codice_cup', label: 'Codice CUP', icon: 'confirmation_number' },
    { key: 'note', label: 'Note', icon: 'notes', type: 'textarea', full: true }
];

export function render(el) {
    let activeTab = 'tutte';

    function renderList() {
        el.innerHTML = `
            <div class="fade-in-up ak-root">
                ${heroHtml({
                    title: 'Fatture', subtitle: 'Fatturazione elettronica e export FatturaPA', icon: 'receipt_long', tone: 'green',
                    actionsHtml: `<button id="ft-btn-new" class="ak-hero-btn"><span class="material-symbols-rounded">add</span>Nuova Fattura</button>`
                })}
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;" id="ft-tabs"></div>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Elenco <span class="ak-count" id="ft-count">0</span></h3></div>
                    <div class="ak-panel-body" id="ft-grid"></div>
                </section>
            </div>
        `;
        const tabsBox = el.querySelector('#ft-tabs');
        const tabs = [['tutte', 'Tutte'], ['bozza', 'Bozza'], ['inviata', 'Inviata'], ['pagata', 'Pagata']];
        tabsBox.innerHTML = tabs.map(([k, l]) => `<button class="ak-btn ${activeTab === k ? 'ak-btn-primary' : 'ak-btn-ghost'}" data-tab="${k}" style="border:1px solid var(--md-outline-variant);">${l}</button>`).join('');
        tabsBox.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-tab'); renderList(); }));
        el.querySelector('#ft-btn-new').addEventListener('click', async () => {
            const res = await callApi('fatture:create', {});
            if (res.success) openEditor(res.data.id);
            else toast(res.error || 'Errore creazione', 'error');
        });
        loadList();
    }

    async function loadList() {
        const grid = el.querySelector('#ft-grid');
        const countEl = el.querySelector('#ft-count');
        const res = await callApi('fatture:getAll', activeTab === 'tutte' ? {} : { stato: activeTab });
        const rows = (res && res.success) ? res.data : [];
        countEl.textContent = rows.length;
        if (rows.length === 0) {
            grid.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">receipt_long</span><h4>Nessuna fattura</h4><p>Crea una fattura manualmente o convertine una da un preventivo accettato.</p></div>`;
            return;
        }
        grid.innerHTML = `<div class="ak-cards">${rows.map(r => `
            <div class="ak-card fade-in-up" style="--ak-accent:${STATO_TONE[r.stato] || '#059669'};" data-id="${r.id}">
                <span class="ak-card-badge" style="background:${STATO_TONE[r.stato] || '#059669'};">${STATO_LABELS[r.stato] || r.stato}</span>
                <div class="ak-card-title">${r.numero || '—'}</div>
                <div class="ak-card-sub">${r.cliente_ragione_sociale || 'Cliente non specificato'} — ${TIPO_DOC_LABELS[r.tipo_documento] || r.tipo_documento}</div>
                <div class="ak-card-meta"><span class="material-symbols-rounded" style="font-size:1rem;">payments</span>${euro(r.totale_documento)} — ${r.data_emissione || ''}</div>
            </div>
        `).join('')}</div>`;
        grid.querySelectorAll('.ak-card').forEach(card => card.addEventListener('click', () => openEditor(card.getAttribute('data-id'))));
    }

    async function openEditor(id) {
        const res = await callApi('fatture:getById', { id });
        if (!res.success) { toast(res.error || 'Fattura non trovata', 'error'); return; }
        renderEditor(res.data);
    }

    function renderEditor(state) {
        let { fattura, voci, scadenze } = state;
        el.innerHTML = `
            <div class="fade-in-up ak-root">
                ${heroHtml({
                    title: fattura.numero || 'Nuova Fattura', subtitle: STATO_LABELS[fattura.stato] || fattura.stato, icon: 'receipt_long', tone: 'green',
                    actionsHtml: `<button id="ft-btn-back" class="ak-hero-btn"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>`
                })}
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Dati Fattura</h3></div>
                    <div class="ak-panel-body">
                        <div class="ak-form-grid" id="ft-header-fields"></div>
                        <div style="margin-top:1rem;"><button id="ft-btn-save-header" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">save</span>Salva e Ricalcola</button></div>
                    </div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Righe Fattura</h3><button id="ft-btn-add-voce" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">add</span>Aggiungi Riga</button></div>
                    <div class="ak-panel-body" id="ft-voci-list"></div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Riepilogo Economico</h3></div>
                    <div class="ak-panel-body" id="ft-riepilogo"></div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Scadenze di Pagamento</h3></div>
                    <div class="ak-panel-body" id="ft-scadenze"></div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Documenti e Azioni</h3></div>
                    <div class="ak-panel-body" style="display:flex; gap:0.7rem; flex-wrap:wrap;">
                        <button id="ft-btn-pdf" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">picture_as_pdf</span>Genera PDF</button>
                        <button id="ft-btn-excel" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">table_view</span>Genera Excel</button>
                        <button id="ft-btn-xml" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">code</span>Esporta XML FatturaPA</button>
                        <button id="ft-btn-invia" class="ak-btn ak-btn-ghost" style="border:1px solid var(--md-outline-variant);"><span class="material-symbols-rounded">send</span>Segna come Inviata</button>
                        <button id="ft-btn-delete" class="ak-btn ak-btn-danger"><span class="material-symbols-rounded">delete</span>Elimina Fattura</button>
                    </div>
                </section>
            </div>
        `;

        el.querySelector('#ft-btn-back').addEventListener('click', renderList);
        el.querySelector('#ft-header-fields').innerHTML = HEADER_FIELDS.map(f => campoHtml(f, fattura[f.key])).join('');

        function renderRiepilogo(totali) {
            el.querySelector('#ft-riepilogo').innerHTML = riepilogoEconomicoHtml(totali || fattura, { documentLabel: 'Fattura' });
        }
        renderRiepilogo(fattura);

        el.querySelector('#ft-btn-save-header').addEventListener('click', async () => {
            const payload = { id: fattura.id };
            HEADER_FIELDS.forEach(f => { payload[f.key] = leggiCampo(el, f, 'crud-field-'); });
            const res = await callApi('fatture:update', payload);
            if (res.success) { toast('Fattura aggiornata', 'success'); fattura = { ...fattura, ...payload, ...res.data }; renderRiepilogo(fattura); }
            else toast(res.error || 'Errore salvataggio', 'error');
        });

        function renderVoci() {
            const box = el.querySelector('#ft-voci-list');
            if (voci.length === 0) {
                box.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">list_alt</span><p>Nessuna riga aggiunta.</p></div>`;
                return;
            }
            box.innerHTML = voci.map(v => `
                <div class="ak-card fade-in-up" style="margin-bottom:0.7rem;" data-id="${v.id}">
                    <div class="ak-form-grid">
                        <div class="ak-field"><label class="ak-flabel">Descrizione</label><input class="ak-input v-descrizione" value="${v.descrizione || ''}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Qtà</label><input type="number" class="ak-input v-quantita" value="${v.quantita}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Prezzo Unitario</label><input type="number" class="ak-input v-prezzo" value="${v.prezzo_unitario}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Sconto %</label><input type="number" class="ak-input v-sconto" value="${v.sconto_percentuale}" style="padding-left:0.85rem;"></div>
                        <div class="ak-field"><label class="ak-flabel">Aliquota IVA %</label><input type="number" class="ak-input v-iva" value="${v.aliquota_iva}" style="padding-left:0.85rem;"></div>
                    </div>
                    <div class="ak-card-meta" style="margin-top:0.6rem;">Totale riga: <strong>${euro(v.totale_riga)}</strong>${v.natura_iva ? ` — Natura IVA: ${v.natura_iva}` : ''}</div>
                    <div class="ak-card-actions">
                        <button class="ak-iconbtn v-btn-save" title="Salva"><span class="material-symbols-rounded">save</span></button>
                        <button class="ak-iconbtn danger v-btn-delete" title="Elimina"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                </div>
            `).join('');
            box.querySelectorAll('.v-btn-save').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.ak-card');
                    const payload = {
                        id: card.getAttribute('data-id'), fatturaId: fattura.id,
                        descrizione: card.querySelector('.v-descrizione').value,
                        quantita: card.querySelector('.v-quantita').value,
                        prezzo_unitario: card.querySelector('.v-prezzo').value,
                        sconto_percentuale: card.querySelector('.v-sconto').value,
                        aliquota_iva: card.querySelector('.v-iva').value
                    };
                    const res = await callApi('fatture:updateVoce', payload);
                    if (res.success) { toast('Riga aggiornata', 'success'); await reloadState(); }
                });
            });
            box.querySelectorAll('.v-btn-delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('.ak-card');
                    const res = await callApi('fatture:removeVoce', { id: card.getAttribute('data-id'), fatturaId: fattura.id });
                    if (res.success) { toast('Riga eliminata', 'success'); await reloadState(); }
                });
            });
        }
        renderVoci();

        el.querySelector('#ft-btn-add-voce').addEventListener('click', async () => {
            const res = await callApi('fatture:addVoce', { fatturaId: fattura.id, descrizione: 'Nuova voce', quantita: 1, prezzo_unitario: 0, aliquota_iva: 22 });
            if (res.success) await reloadState();
        });

        function renderScadenze() {
            const box = el.querySelector('#ft-scadenze');
            if (!scadenze || scadenze.length === 0) {
                box.innerHTML = `<p style="color:var(--md-on-surface-variant);">Nessuna scadenza generata (viene creata automaticamente convertendo un preventivo in fattura).</p>`;
                return;
            }
            box.innerHTML = scadenze.map(s => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--md-outline-variant);">
                    <span>Rata ${s.numero_rata}/${s.totale_rate} — scadenza ${s.data_scadenza}</span>
                    <span>${euro(s.importo_pagato)} / ${euro(s.importo_rata)} — <strong>${s.stato}</strong></span>
                </div>
            `).join('');
        }
        renderScadenze();

        async function reloadState() {
            const res = await callApi('fatture:getById', { id: fattura.id });
            if (!res.success) return;
            fattura = res.data.fattura;
            voci = res.data.voci;
            scadenze = res.data.scadenze;
            renderVoci();
            renderScadenze();
            renderRiepilogo(fattura);
        }

        async function downloadDocumento(kind) {
            const action = kind === 'pdf' ? 'documenti:generateFatturaPdf' : 'documenti:generateFatturaExcel';
            const res = await callApi(action, { id: fattura.id });
            if (!res.success) { toast(res.error || 'Errore generazione documento', 'error'); return; }
            const filters = kind === 'pdf' ? [{ name: 'PDF', extensions: ['pdf'] }] : [{ name: 'Excel', extensions: ['xlsx'] }];
            const saveRes = await callApi('documenti:salvaFile', { base64: res.data.base64, fileName: res.data.fileName, filters });
            if (saveRes.success) toast('Documento salvato con successo', 'success');
        }
        el.querySelector('#ft-btn-pdf').addEventListener('click', () => downloadDocumento('pdf'));
        el.querySelector('#ft-btn-excel').addEventListener('click', () => downloadDocumento('excel'));

        el.querySelector('#ft-btn-xml').addEventListener('click', async () => {
            const res = await callApi('fatture:exportFatturaPA', { id: fattura.id });
            if (!res.success) { toast(res.error || 'Errore generazione XML', 'error'); return; }
            const base64 = btoa(unescape(encodeURIComponent(res.data.xml)));
            const saveRes = await callApi('documenti:salvaFile', { base64, fileName: res.data.fileName, filters: [{ name: 'XML', extensions: ['xml'] }] });
            if (saveRes.success) toast('XML FatturaPA salvato con successo', 'success');
        });

        el.querySelector('#ft-btn-invia').addEventListener('click', async () => {
            await callApi('fatture:setStato', { id: fattura.id, stato: 'inviata' });
            toast('Fattura segnata come inviata', 'success');
            await reloadState();
        });

        el.querySelector('#ft-btn-delete').addEventListener('click', async () => {
            if (!confirm('Eliminare questa fattura in bozza?')) return;
            const res = await callApi('fatture:remove', { id: fattura.id });
            if (res.success) { toast('Fattura eliminata', 'success'); renderList(); }
            else toast(res.error || 'Impossibile eliminare', 'error');
        });
    }

    renderList();
}
