import { toast } from '../js/utils.js';
import { heroHtml, campoHtml, leggiCampo } from '../shared/ui_kit.js';
import { callApi } from '../shared/api.js';

const HEADER_FIELDS = [
    { key: 'cliente_ragione_sociale', label: 'Cliente', icon: 'business', required: true, full: true },
    { key: 'cliente_indirizzo', label: 'Indirizzo', icon: 'location_on', full: true },
    { key: 'cliente_citta', label: 'Città', icon: 'location_city' },
    { key: 'cliente_cap', label: 'CAP', icon: 'markunread_mailbox' },
    { key: 'cliente_provincia', label: 'Provincia', icon: 'map' },
    { key: 'data', label: 'Data Trasporto', icon: 'event', type: 'date' },
    { key: 'causale_trasporto', label: 'Causale Trasporto', icon: 'description', default: 'Vendita' },
    { key: 'porto', label: 'Porto', icon: 'local_shipping', type: 'select', options: [{ value: 'Franco', label: 'Franco' }, { value: 'Assegnato', label: 'Assegnato' }] },
    { key: 'vettore', label: 'Vettore', icon: 'directions_car' },
    { key: 'colli', label: 'Numero Colli', icon: 'inventory_2', type: 'number', default: 1 },
    { key: 'peso', label: 'Peso (kg)', icon: 'scale', type: 'number' },
    { key: 'note', label: 'Note', icon: 'notes', type: 'textarea', full: true }
];

export function render(el) {
    function renderList() {
        el.innerHTML = `
            <div class="fade-in-up ak-root">
                ${heroHtml({
                    title: 'DDT', subtitle: 'Documenti di trasporto', icon: 'local_shipping', tone: 'orange',
                    actionsHtml: `<button id="ddt-btn-new" class="ak-hero-btn"><span class="material-symbols-rounded">add</span>Nuovo DDT</button>`
                })}
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Elenco <span class="ak-count" id="ddt-count">0</span></h3></div>
                    <div class="ak-panel-body" id="ddt-grid"></div>
                </section>
            </div>
        `;
        el.querySelector('#ddt-btn-new').addEventListener('click', async () => {
            const res = await callApi('ddt:create', { data: new Date().toISOString().slice(0, 10) });
            if (res.success) openEditor(res.data.id);
            else toast(res.error || 'Errore creazione', 'error');
        });
        loadList();
    }

    async function loadList() {
        const grid = el.querySelector('#ddt-grid');
        const countEl = el.querySelector('#ddt-count');
        const res = await callApi('ddt:getAll');
        const rows = (res && res.success) ? res.data : [];
        countEl.textContent = rows.length;
        if (rows.length === 0) {
            grid.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">local_shipping</span><h4>Nessun DDT</h4><p>Crea un documento di trasporto per una consegna.</p></div>`;
            return;
        }
        grid.innerHTML = `<div class="ak-cards">${rows.map(r => `
            <div class="ak-card fade-in-up" style="--ak-accent:#c2410c;" data-id="${r.id}">
                <div class="ak-card-title">${r.numero || '—'}</div>
                <div class="ak-card-sub">${r.cliente_ragione_sociale || 'Cliente non specificato'}</div>
                <div class="ak-card-meta"><span class="material-symbols-rounded" style="font-size:1rem;">event</span>${r.data || ''} — ${r.colli || 1} colli</div>
                <div class="ak-card-actions">
                    <button class="ak-iconbtn danger ddt-btn-delete" data-id="${r.id}" title="Elimina"><span class="material-symbols-rounded">delete</span></button>
                </div>
            </div>
        `).join('')}</div>`;
        grid.querySelectorAll('.ak-card').forEach(card => {
            card.addEventListener('click', (e) => { if (!e.target.closest('.ak-iconbtn')) openEditor(card.getAttribute('data-id')); });
        });
        grid.querySelectorAll('.ddt-btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Eliminare questo DDT?')) return;
                await callApi('ddt:remove', { id: btn.getAttribute('data-id') });
                toast('DDT eliminato', 'success');
                loadList();
            });
        });
    }

    async function openEditor(id) {
        const res = await callApi('ddt:getById', { id });
        if (!res.success) { toast(res.error || 'DDT non trovato', 'error'); return; }
        renderEditor(res.data);
    }

    function renderEditor(state) {
        let { ddt, voci } = state;
        el.innerHTML = `
            <div class="fade-in-up ak-root">
                ${heroHtml({
                    title: ddt.numero || 'Nuovo DDT', subtitle: 'Documento di trasporto', icon: 'local_shipping', tone: 'orange',
                    actionsHtml: `<button id="ddt-btn-back" class="ak-hero-btn"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>`
                })}
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Dati Trasporto</h3></div>
                    <div class="ak-panel-body">
                        <div class="ak-form-grid" id="ddt-header-fields"></div>
                        <div style="margin-top:1rem;"><button id="ddt-btn-save" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">save</span>Salva</button></div>
                    </div>
                </section>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Colli/Voci</h3><button id="ddt-btn-add-voce" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">add</span>Aggiungi Riga</button></div>
                    <div class="ak-panel-body" id="ddt-voci-list"></div>
                </section>
            </div>
        `;
        el.querySelector('#ddt-btn-back').addEventListener('click', renderList);
        el.querySelector('#ddt-header-fields').innerHTML = HEADER_FIELDS.map(f => campoHtml(f, ddt[f.key])).join('');
        el.querySelector('#ddt-btn-save').addEventListener('click', async () => {
            const payload = { id: ddt.id };
            HEADER_FIELDS.forEach(f => { payload[f.key] = leggiCampo(el, f, 'crud-field-'); });
            const res = await callApi('ddt:update', payload);
            if (res.success) toast('DDT aggiornato', 'success'); else toast(res.error || 'Errore', 'error');
        });

        function renderVoci() {
            const box = el.querySelector('#ddt-voci-list');
            if (voci.length === 0) {
                box.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">list_alt</span><p>Nessuna riga aggiunta.</p></div>`;
                return;
            }
            box.innerHTML = voci.map(v => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--md-outline-variant);">
                    <span>${v.descrizione} — ${v.quantita} ${v.unita_misura}</span>
                    <button class="ak-iconbtn danger ddt-v-del" data-id="${v.id}"><span class="material-symbols-rounded">delete</span></button>
                </div>
            `).join('');
            box.querySelectorAll('.ddt-v-del').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await callApi('ddt:removeVoce', { id: btn.getAttribute('data-id') });
                    await reload();
                });
            });
        }
        renderVoci();

        el.querySelector('#ddt-btn-add-voce').addEventListener('click', async () => {
            const descrizione = prompt('Descrizione riga:');
            if (!descrizione) return;
            const quantita = prompt('Quantità:', '1');
            await callApi('ddt:addVoce', { ddtId: ddt.id, descrizione, quantita: Number(quantita) || 1 });
            await reload();
        });

        async function reload() {
            const res = await callApi('ddt:getById', { id: ddt.id });
            if (!res.success) return;
            ddt = res.data.ddt;
            voci = res.data.voci;
            renderVoci();
        }
    }

    renderList();
}
