import { heroHtml } from '../shared/ui_kit.js';
import { euro } from '../shared/calc_display.js';
import { monthlyBarChartSvg } from '../shared/charts.js';
import { callApi } from '../shared/api.js';

const STATO_TONE = { bozza: '#64748b', inviato: '#2563eb', accettato: '#059669', rifiutato: '#dc2626', pagato: '#7c3aed' };
const STATO_LABELS = { bozza: 'Bozza', inviato: 'Inviato', accettato: 'Accettato', rifiutato: 'Rifiutato', pagato: 'Pagato' };

export async function render(el) {
    el.innerHTML = `
        <div class="fade-in-up ak-root">
            ${heroHtml({ title: 'Dashboard', subtitle: 'Panoramica del ciclo commerciale', icon: 'dashboard', tone: 'blue' })}
            <div class="ak-kpi-grid" id="dash-kpis"></div>
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1rem;">
                <section class="ak-panel"><div class="ak-toolbar"><h3>Andamento Mensile Incassi</h3></div><div class="ak-panel-body" id="dash-chart"></div></section>
                <section class="ak-panel"><div class="ak-toolbar"><h3>Preventivi per Stato</h3></div><div class="ak-panel-body" id="dash-stati"></div></section>
            </div>
            <section class="ak-panel">
                <div class="ak-toolbar"><h3>Preventivi Recenti</h3></div>
                <div class="ak-panel-body" id="dash-recenti"></div>
            </section>
        </div>
    `;

    const [preventiviRes, fattureRes, statsRes] = await Promise.all([
        callApi('preventivi:getAll'),
        callApi('fatture:getAll'),
        callApi('finanze:getStats', { anno: new Date().getFullYear() })
    ]);
    const preventivi = (preventiviRes && preventiviRes.success) ? preventiviRes.data : [];
    const fatture = (fattureRes && fattureRes.success) ? fattureRes.data : [];

    const pipeline = preventivi.filter(p => ['bozza', 'inviato'].includes(p.stato));
    const chiusi = preventivi.filter(p => ['accettato', 'pagato'].includes(p.stato));
    const valorePipeline = pipeline.reduce((s, p) => s + (Number(p.totale_ivato) || 0), 0);
    const margineNetto = chiusi.reduce((s, p) => s + (Number(p.margine_euro) || 0), 0);
    const fatturatoAnno = fatture
        .filter(f => (f.data_emissione || '').startsWith(String(new Date().getFullYear())))
        .reduce((s, f) => s + (Number(f.totale_documento) || 0), 0);
    const tassoConversione = preventivi.length > 0 ? (chiusi.length / preventivi.length) * 100 : 0;

    el.querySelector('#dash-kpis').innerHTML = `
        <div class="ak-kpi-card"><span class="ak-kpi-label">Valore Pipeline</span><span class="ak-kpi-value">${euro(valorePipeline)}</span></div>
        <div class="ak-kpi-card"><span class="ak-kpi-label">Fatturato Anno</span><span class="ak-kpi-value positive">${euro(fatturatoAnno)}</span></div>
        <div class="ak-kpi-card"><span class="ak-kpi-label">Margine Netto (chiusi)</span><span class="ak-kpi-value ${margineNetto >= 0 ? 'positive' : 'negative'}">${euro(margineNetto)}</span></div>
        <div class="ak-kpi-card"><span class="ak-kpi-label">Tasso di Conversione</span><span class="ak-kpi-value">${tassoConversione.toFixed(1)}%</span></div>
    `;

    if (statsRes && statsRes.success) {
        el.querySelector('#dash-chart').innerHTML = monthlyBarChartSvg(statsRes.data.monthly);
    }

    const conteggiStato = {};
    preventivi.forEach(p => { conteggiStato[p.stato] = (conteggiStato[p.stato] || 0) + 1; });
    el.querySelector('#dash-stati').innerHTML = Object.keys(STATO_LABELS).map(s => `
        <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--md-outline-variant);">
            <span><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${STATO_TONE[s]}; margin-right:0.5rem;"></span>${STATO_LABELS[s]}</span>
            <strong>${conteggiStato[s] || 0}</strong>
        </div>
    `).join('');

    const recenti = [...preventivi].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 8);
    const recentiBox = el.querySelector('#dash-recenti');
    if (recenti.length === 0) {
        recentiBox.innerHTML = `<div class="ak-empty"><span class="material-symbols-rounded">request_quote</span><p>Nessun preventivo creato finora.</p></div>`;
    } else {
        recentiBox.innerHTML = recenti.map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--md-outline-variant);">
                <div>
                    <div style="font-weight:600;">${r.numero}</div>
                    <div style="font-size:0.82rem; color:var(--md-on-surface-variant);">${r.cliente_ragione_sociale || 'Cliente non specificato'}</div>
                </div>
                <div style="text-align:right;">
                    <div>${euro(r.totale_ivato)}</div>
                    <span style="font-size:0.75rem; font-weight:700; color:${STATO_TONE[r.stato]};">${STATO_LABELS[r.stato] || r.stato}</span>
                </div>
            </div>
        `).join('');
    }
}
