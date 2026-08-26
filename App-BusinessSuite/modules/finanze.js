import { toast } from '../js/utils.js';
import { heroHtml, campoHtml, leggiCampo } from '../shared/ui_kit.js';
import { euro } from '../shared/calc_display.js';
import { monthlyBarChartSvg, categoryBreakdownHtml } from '../shared/charts.js';
import { callApi } from '../shared/api.js';

const FIELDS = [
    { key: 'tipo', label: 'Tipo', icon: 'swap_vert', type: 'select', required: true, default: 'entrata',
      options: [{ value: 'entrata', label: 'Entrata' }, { value: 'uscita', label: 'Uscita' }] },
    { key: 'importo', label: 'Importo (€)', icon: 'euro', type: 'number', required: true },
    { key: 'data', label: 'Data', icon: 'event', type: 'date', required: true },
    { key: 'categoria', label: 'Categoria', icon: 'category' },
    { key: 'descrizione', label: 'Descrizione', icon: 'notes', full: true },
    { key: 'note', label: 'Note', icon: 'sticky_note_2', type: 'textarea', full: true }
];

export async function render(el) {
    const anno = new Date().getFullYear();

    el.innerHTML = `
        <div class="fade-in-up ak-root">
            ${heroHtml({
                title: 'Finanze', subtitle: `Prima Nota — anno ${anno}`, icon: 'account_balance', tone: 'green',
                actionsHtml: `<button id="fin-btn-new" class="ak-hero-btn"><span class="material-symbols-rounded">add</span>Nuovo Movimento</button>`
            })}
            <div class="ak-kpi-grid" id="fin-kpis"></div>
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1rem;">
                <section class="ak-panel"><div class="ak-toolbar"><h3>Andamento Mensile</h3></div><div class="ak-panel-body" id="fin-chart"></div></section>
                <section class="ak-panel"><div class="ak-toolbar"><h3>Uscite per Categoria</h3></div><div class="ak-panel-body" id="fin-categorie"></div></section>
            </div>
            <section class="ak-panel">
                <div class="ak-toolbar"><h3>Movimenti <span class="ak-count" id="fin-count">0</span></h3></div>
                <div class="ak-panel-body" id="fin-list"></div>
            </section>
        </div>
        <div id="fin-modal" class="ak-modal" role="dialog" aria-modal="true">
            <div class="ak-modal-card">
                <div class="ak-modal-head">
                    <h3><span class="material-symbols-rounded">account_balance</span><span id="fin-modal-title">Nuovo Movimento</span></h3>
                    <button id="fin-modal-close" class="ak-iconbtn"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="ak-modal-body">
                    <form id="fin-form" class="ak-form">
                        <input type="hidden" id="crud-field-id">
                        <div class="ak-form-grid" id="fin-form-fields"></div>
                        <div class="ak-error" id="fin-modal-error" role="alert"></div>
                        <div class="ak-actions">
                            <button type="button" id="fin-btn-cancel" class="ak-btn ak-btn-ghost">Annulla</button>
                            <button type="submit" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">save</span>Salva</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = el.querySelector('#fin-modal');
    const formFieldsBox = el.querySelector('#fin-form-fields');
    formFieldsBox.innerHTML = FIELDS.map(f => campoHtml(f, '')).join('');

    function openModal(record = null) {
        el.querySelector('#fin-modal-title').textContent = record ? 'Modifica Movimento' : 'Nuovo Movimento';
        el.querySelector('#crud-field-id').value = record ? record.id : '';
        FIELDS.forEach(f => {
            const input = el.querySelector(`#crud-field-${f.key}`);
            if (!input) return;
            const value = record ? record[f.key] : (f.default !== undefined ? f.default : (f.key === 'data' ? new Date().toISOString().slice(0, 10) : ''));
            if (f.type === 'checkbox') input.checked = !!value; else input.value = value ?? '';
        });
        modal.style.display = 'flex';
        requestAnimationFrame(() => { modal.style.opacity = '1'; modal.querySelector('.ak-modal-card').style.transform = 'scale(1) translateY(0)'; });
    }
    function closeModal() {
        modal.style.opacity = '0';
        modal.querySelector('.ak-modal-card').style.transform = 'scale(0.95) translateY(10px)';
        setTimeout(() => { modal.style.display = 'none'; }, 250);
    }
    el.querySelector('#fin-btn-new').addEventListener('click', () => openModal());
    el.querySelector('#fin-modal-close').addEventListener('click', closeModal);
    el.querySelector('#fin-btn-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    el.querySelector('#fin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = el.querySelector('#fin-modal-error');
        errorBox.style.display = 'none';
        try {
            const id = el.querySelector('#crud-field-id').value;
            const data = {};
            FIELDS.forEach(f => { data[f.key] = leggiCampo(el, f); });
            const res = id ? await callApi('finanze:update', { ...data, id }) : await callApi('finanze:create', data);
            if (!res.success) throw new Error(res.error || 'Salvataggio fallito');
            toast('Movimento salvato', 'success');
            closeModal();
            await refresh();
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.style.display = 'block';
        }
    });

    async function loadKpisAndCharts() {
        const res = await callApi('finanze:getStats', { anno });
        if (!res.success) return;
        const d = res.data;
        el.querySelector('#fin-kpis').innerHTML = `
            <div class="ak-kpi-card"><span class="ak-kpi-label">Entrate</span><span class="ak-kpi-value positive">${euro(d.totale_entrate)}</span></div>
            <div class="ak-kpi-card"><span class="ak-kpi-label">Uscite</span><span class="ak-kpi-value negative">${euro(d.totale_uscite)}</span></div>
            <div class="ak-kpi-card"><span class="ak-kpi-label">Profitto</span><span class="ak-kpi-value ${d.profitto >= 0 ? 'positive' : 'negative'}">${euro(d.profitto)}</span></div>
        `;
        el.querySelector('#fin-chart').innerHTML = monthlyBarChartSvg(d.monthly);
        el.querySelector('#fin-categorie').innerHTML = categoryBreakdownHtml(d.categorie_uscite);
    }

    async function loadList() {
        const list = el.querySelector('#fin-list');
        const countEl = el.querySelector('#fin-count');
        const res = await callApi('finanze:getAll');
        const rows = (res && res.success) ? res.data : [];
        countEl.textContent = rows.length;
        if (rows.length === 0) {
            list.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">account_balance</span><p>Nessun movimento registrato.</p></div>`;
            return;
        }
        list.innerHTML = rows.map(r => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.7rem 0; border-bottom:1px solid var(--md-outline-variant);" data-id="${r.id}">
                <div>
                    <div style="font-weight:600;">${r.descrizione || r.categoria || '(senza descrizione)'}</div>
                    <div style="font-size:0.8rem; color:var(--md-on-surface-variant);">${r.data} ${r.categoria ? '— ' + r.categoria : ''}</div>
                </div>
                <div style="display:flex; align-items:center; gap:0.7rem;">
                    <strong style="color:${r.tipo === 'entrata' ? '#059669' : '#dc2626'};">${r.tipo === 'entrata' ? '+' : '-'}${euro(r.importo)}</strong>
                    <button class="ak-iconbtn fin-btn-edit" data-id="${r.id}"><span class="material-symbols-rounded">edit</span></button>
                    <button class="ak-iconbtn danger fin-btn-delete" data-id="${r.id}"><span class="material-symbols-rounded">delete</span></button>
                </div>
            </div>
        `).join('');
        list.querySelectorAll('.fin-btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openModal(rows.find(r => r.id === btn.getAttribute('data-id'))));
        });
        list.querySelectorAll('.fin-btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Eliminare questo movimento?')) return;
                await callApi('finanze:remove', { id: btn.getAttribute('data-id') });
                toast('Movimento eliminato', 'success');
                await refresh();
            });
        });
    }

    async function refresh() {
        await loadKpisAndCharts();
        await loadList();
    }
    await refresh();
}
