import { renderCrudSubapp } from '../shared/crud_kit.js';
import { callApi } from '../shared/api.js';
import { toast } from '../js/utils.js';

const api = {
    getAll: (args) => callApi('prodotti:getAll', args),
    create: (args) => callApi('prodotti:create', args),
    update: (args) => callApi('prodotti:update', args),
    remove: (args) => callApi('prodotti:remove', args)
};

export async function render(el) {
    const catRes = await callApi('prodotti:getAllCategorie');
    const categorie = (catRes && catRes.success) ? catRes.data : [];

    const FIELDS = [
        { key: 'descrizione', label: 'Descrizione', icon: 'inventory_2', required: true, full: true },
        { key: 'codice', label: 'Codice/SKU', icon: 'qr_code' },
        { key: 'categoria_id', label: 'Categoria', icon: 'category', type: 'select',
          options: categorie.map(c => ({ value: c.id, label: c.nome })) },
        { key: 'unita_misura', label: 'Unità di Misura', icon: 'straighten', default: 'pz' },
        { key: 'prezzo_acquisto', label: 'Prezzo di Acquisto (€)', icon: 'shopping_cart', type: 'number' },
        { key: 'prezzo_vendita', label: 'Prezzo di Vendita (€)', icon: 'sell', type: 'number', required: true },
        { key: 'aliquota_iva', label: 'Aliquota IVA (%)', icon: 'percent', type: 'number', default: 22 },
        { key: 'attivo', label: 'Prodotto/servizio attivo (visibile nei preventivi)', type: 'checkbox', default: 1 },
        { key: 'descrizione_estesa', label: 'Descrizione Estesa', icon: 'notes', type: 'textarea', full: true }
    ];

    renderCrudSubapp(el, {
        title: 'Catalogo Prodotti & Servizi',
        subtitle: 'Anagrafica prodotti/servizi usati nelle righe di preventivi e fatture',
        icon: 'inventory_2',
        tone: 'teal',
        api,
        fields: FIELDS,
        newLabel: 'Nuovo Prodotto',
        emptyLabel: 'Nessun prodotto o servizio in catalogo.',
        cardTitle: (r) => r.descrizione,
        cardSubtitle: (r) => {
            const cat = categorie.find(c => c.id === r.categoria_id);
            return cat ? cat.nome : '';
        },
        cardMeta: (r) => `Vendita: € ${(Number(r.prezzo_vendita) || 0).toFixed(2)} / ${r.unita_misura || 'pz'}`,
        cardBadge: (r) => (r.attivo === 0) ? 'Disattivo' : null,
        extraActionsHtml: `<button id="cat-btn-manage-categorie" class="ak-hero-btn"><span class="material-symbols-rounded">category</span>Categorie</button>`,
        instructions: {
            intro: 'Il catalogo alimenta il selettore rapido delle righe preventivo/fattura.',
            steps: [
                'Imposta prezzo di acquisto e di vendita per calcolare automaticamente il margine.',
                'Disattiva un prodotto per nasconderlo dalla ricerca senza eliminarlo dallo storico.'
            ]
        }
    });

    el.querySelector('#cat-btn-manage-categorie')?.addEventListener('click', () => openCategorieModal());

    function openCategorieModal() {
        const existing = document.getElementById('cat-categorie-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'cat-categorie-modal';
        modal.className = 'ak-modal';
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.innerHTML = `
            <div class="ak-modal-card">
                <div class="ak-modal-head">
                    <h3><span class="material-symbols-rounded">category</span>Categorie Prodotti</h3>
                    <button id="cat-cat-close" class="ak-iconbtn" aria-label="Chiudi"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="ak-modal-body">
                    <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
                        <input type="text" id="cat-cat-new-name" class="ak-input" placeholder="Nome nuova categoria" style="flex:1;">
                        <button id="cat-cat-add" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">add</span></button>
                    </div>
                    <div id="cat-cat-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#cat-cat-close').addEventListener('click', () => modal.remove());

        async function renderList() {
            const res = await callApi('prodotti:getAllCategorie');
            const cats = (res && res.success) ? res.data : [];
            const list = modal.querySelector('#cat-cat-list');
            if (cats.length === 0) {
                list.innerHTML = '<p style="color:var(--md-on-surface-variant);">Nessuna categoria creata.</p>';
                return;
            }
            list.innerHTML = cats.map(c => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--md-outline-variant);">
                    <span>${c.nome}</span>
                    <button class="ak-iconbtn danger cat-cat-del" data-id="${c.id}"><span class="material-symbols-rounded">delete</span></button>
                </div>
            `).join('');
            list.querySelectorAll('.cat-cat-del').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const res2 = await callApi('prodotti:removeCategoria', { id: btn.getAttribute('data-id') });
                    if (!res2.success) { toast(res2.error || 'Impossibile eliminare', 'error'); return; }
                    await renderList();
                });
            });
        }
        modal.querySelector('#cat-cat-add').addEventListener('click', async () => {
            const input = modal.querySelector('#cat-cat-new-name');
            const nome = input.value.trim();
            if (!nome) return;
            await callApi('prodotti:createCategoria', { nome });
            input.value = '';
            await renderList();
        });
        renderList();
    }
}
