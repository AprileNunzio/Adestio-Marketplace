import { toast } from '../js/utils.js';
import { heroHtml } from '../shared/ui_kit.js';
import { euro } from '../shared/calc_display.js';
import { callApi } from '../shared/api.js';

const STATO_LABELS = { pending: 'Da incassare', parziale: 'Parziale', pagata: 'Incassata' };
const STATO_TONE = { pending: '#dc2626', parziale: '#c2410c', pagata: '#059669' };

export function render(el) {
    let activeTab = 'pending';

    function renderList() {
        el.innerHTML = `
            <div class="fade-in-up ak-root">
                ${heroHtml({ title: 'Scadenzario', subtitle: 'Rate e scadenze di pagamento delle fatture', icon: 'event_available', tone: 'blue' })}
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;" id="sc-tabs"></div>
                <section class="ak-panel">
                    <div class="ak-toolbar"><h3>Elenco <span class="ak-count" id="sc-count">0</span></h3></div>
                    <div class="ak-panel-body" id="sc-list"></div>
                </section>
            </div>
        `;
        const tabsBox = el.querySelector('#sc-tabs');
        const tabs = [['pending', 'Da Incassare'], ['parziale', 'Parziali'], ['pagata', 'Incassate'], ['tutte', 'Tutte']];
        tabsBox.innerHTML = tabs.map(([k, l]) => `<button class="ak-btn ${activeTab === k ? 'ak-btn-primary' : 'ak-btn-ghost'}" data-tab="${k}" style="border:1px solid var(--md-outline-variant);">${l}</button>`).join('');
        tabsBox.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-tab'); renderList(); }));
        loadList();
    }

    async function loadList() {
        const list = el.querySelector('#sc-list');
        const countEl = el.querySelector('#sc-count');
        const res = await callApi('fatture:getScadenze', activeTab === 'tutte' ? {} : { stato: activeTab });
        const rows = (res && res.success) ? res.data : [];
        countEl.textContent = rows.length;
        if (rows.length === 0) {
            list.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">event_available</span><h4>Nessuna scadenza</h4><p>Le scadenze vengono generate automaticamente convertendo un preventivo in fattura.</p></div>`;
            return;
        }
        const today = new Date().toISOString().slice(0, 10);
        list.innerHTML = rows.map(r => `
            <div class="ak-card fade-in-up" style="--ak-accent:${STATO_TONE[r.stato] || '#2563eb'}; margin-bottom:0.7rem;" data-id="${r.id}">
                <span class="ak-card-badge" style="background:${STATO_TONE[r.stato] || '#2563eb'};">${STATO_LABELS[r.stato] || r.stato}</span>
                <div class="ak-card-title">${r.fattura_numero} — ${r.cliente_ragione_sociale || ''}</div>
                <div class="ak-card-sub">Rata ${r.numero_rata}/${r.totale_rate} — scadenza ${r.data_scadenza}${r.data_scadenza < today && r.stato !== 'pagata' ? ' <strong style="color:#dc2626;">(scaduta)</strong>' : ''}</div>
                <div class="ak-card-meta">${euro(r.importo_pagato)} incassati su ${euro(r.importo_rata)}</div>
                ${r.stato !== 'pagata' ? `
                <div class="ak-card-actions">
                    <input type="number" class="ak-input sc-importo" placeholder="Importo €" step="0.01" style="max-width:130px; height:2.3rem; padding-left:0.7rem;">
                    <button class="ak-btn ak-btn-primary sc-btn-incassa" data-id="${r.id}" style="padding:0.5rem 1rem;"><span class="material-symbols-rounded">payments</span>Incassa</button>
                </div>` : ''}
            </div>
        `).join('');
        list.querySelectorAll('.sc-btn-incassa').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.ak-card');
                const importo = Number(card.querySelector('.sc-importo').value);
                if (!(importo > 0)) { toast('Inserisci un importo valido', 'error'); return; }
                const res = await callApi('fatture:registraIncasso', { id: btn.getAttribute('data-id'), importo, dataPagamento: new Date().toISOString().slice(0, 10) });
                if (res.success) { toast('Incasso registrato', 'success'); loadList(); }
                else toast(res.error || 'Errore', 'error');
            });
        });
    }

    renderList();
}
