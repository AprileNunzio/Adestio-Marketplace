import { renderCrudSubapp } from '../shared/crud_kit.js';
import { euro } from '../shared/calc_display.js';
import { callApi } from '../shared/api.js';
import { toast } from '../js/utils.js';

const FIELDS = [
    { key: 'nome', label: 'Nome', icon: 'person', required: true },
    { key: 'cognome', label: 'Cognome', icon: 'person', required: true },
    { key: 'ruolo', label: 'Ruolo', icon: 'work' },
    { key: 'piva', label: 'Partita IVA', icon: 'tag' },
    { key: 'codice_fiscale', label: 'Codice Fiscale', icon: 'badge' },
    { key: 'iban', label: 'IBAN', icon: 'account_balance' },
    { key: 'percentuale_commissione_default', label: 'Provvigione di Default (%)', icon: 'percent', type: 'number' },
    { key: 'attivo', label: 'Collaboratore attivo', type: 'checkbox', default: 1 },
    { key: 'note', label: 'Note', icon: 'notes', type: 'textarea', full: true }
];

const api = {
    getAll: (args) => callApi('collaboratori:getAll', args),
    create: (args) => callApi('collaboratori:create', args),
    update: (args) => callApi('collaboratori:update', args),
    remove: (args) => callApi('collaboratori:remove', args)
};

export function render(el) {
    renderCrudSubapp(el, {
        title: 'Collaboratori',
        subtitle: 'Subappaltatori e tecnici: provvigioni e pagamenti',
        icon: 'engineering',
        tone: 'violet',
        api,
        fields: FIELDS,
        newLabel: 'Nuovo Collaboratore',
        emptyLabel: 'Nessun collaboratore registrato.',
        cardTitle: (r) => `${r.nome} ${r.cognome}`,
        cardSubtitle: (r) => r.ruolo || '',
        cardMeta: (r) => r.percentuale_commissione_default ? `Provvigione default: ${r.percentuale_commissione_default}%` : '',
        cardBadge: (r) => r.attivo === 0 ? 'Disattivo' : null,
        onCardClick: (r) => openLedgerModal(r),
        instructions: {
            intro: 'Assegna un collaboratore a un preventivo con una provvigione fissa o percentuale, poi registra qui i pagamenti effettuati.',
            steps: ['Clicca su una card per aprire il ledger (maturato/pagato/saldo) del collaboratore.']
        }
    });

    async function openLedgerModal(collaboratore) {
        const existing = document.getElementById('collab-ledger-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'collab-ledger-modal';
        modal.className = 'ak-modal';
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.innerHTML = `
            <div class="ak-modal-card">
                <div class="ak-modal-head">
                    <h3><span class="material-symbols-rounded">receipt_long</span>Ledger — ${collaboratore.nome} ${collaboratore.cognome}</h3>
                    <button id="collab-ledger-close" class="ak-iconbtn" aria-label="Chiudi"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="ak-modal-body">
                    <div id="collab-ledger-kpis" class="ak-kpi-grid" style="margin-bottom:1.2rem;"></div>
                    <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
                        <input type="number" id="collab-pay-importo" class="ak-input" placeholder="Importo €" step="0.01" style="max-width:150px;">
                        <input type="date" id="collab-pay-data" class="ak-input" style="max-width:170px;">
                        <input type="text" id="collab-pay-metodo" class="ak-input" placeholder="Metodo (bonifico, contanti...)">
                        <button id="collab-pay-add" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">add</span>Registra</button>
                    </div>
                    <div id="collab-ledger-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#collab-ledger-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#collab-pay-data').value = new Date().toISOString().slice(0, 10);

        async function renderLedger() {
            const res = await callApi('collaboratori:getLedger', { collaboratoreId: collaboratore.id });
            if (!res || !res.success) return;
            const d = res.data;
            modal.querySelector('#collab-ledger-kpis').innerHTML = `
                <div class="ak-kpi-card"><span class="ak-kpi-label">Maturato</span><span class="ak-kpi-value">${euro(d.totale_maturato)}</span></div>
                <div class="ak-kpi-card"><span class="ak-kpi-label">Pagato</span><span class="ak-kpi-value">${euro(d.totale_pagato)}</span></div>
                <div class="ak-kpi-card"><span class="ak-kpi-label">Saldo</span><span class="ak-kpi-value ${d.saldo > 0 ? 'negative' : 'positive'}">${euro(d.saldo)}</span></div>
            `;
            const list = modal.querySelector('#collab-ledger-list');
            if (!d.pagamenti || d.pagamenti.length === 0) {
                list.innerHTML = '<p style="color:var(--md-on-surface-variant);">Nessun pagamento registrato.</p>';
                return;
            }
            list.innerHTML = d.pagamenti.map(p => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--md-outline-variant);">
                    <span>${p.data || ''} — ${p.metodo || ''}</span>
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                        <strong>${euro(p.importo)}</strong>
                        <button class="ak-iconbtn danger collab-pay-del" data-id="${p.id}"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                </div>
            `).join('');
            list.querySelectorAll('.collab-pay-del').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await callApi('collaboratori:removePagamento', { id: btn.getAttribute('data-id') });
                    await renderLedger();
                });
            });
        }

        modal.querySelector('#collab-pay-add').addEventListener('click', async () => {
            const importo = Number(modal.querySelector('#collab-pay-importo').value);
            const data = modal.querySelector('#collab-pay-data').value;
            const metodo = modal.querySelector('#collab-pay-metodo').value;
            if (!(importo > 0)) { toast('Importo non valido', 'error'); return; }
            const res = await callApi('collaboratori:addPagamento', { collaboratoreId: collaboratore.id, importo, data, metodo });
            if (!res.success) { toast(res.error || 'Errore', 'error'); return; }
            toast('Pagamento registrato', 'success');
            modal.querySelector('#collab-pay-importo').value = '';
            modal.querySelector('#collab-pay-metodo').value = '';
            await renderLedger();
        });

        await renderLedger();
    }
}
