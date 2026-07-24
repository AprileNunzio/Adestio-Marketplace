export function euro(n) {
    return (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

export function riepilogoEconomicoHtml(totali, opts = {}) {
    const margineClass = (Number(totali.margine_euro) || 0) >= 0 ? 'positive' : 'negative';
    return `
        <div class="ak-kpi-grid">
            <div class="ak-kpi-card">
                <span class="ak-kpi-label">Imponibile</span>
                <span class="ak-kpi-value">${euro(totali.totale_imponibile)}</span>
            </div>
            <div class="ak-kpi-card">
                <span class="ak-kpi-label">IVA</span>
                <span class="ak-kpi-value">${euro(totali.totale_iva)}</span>
            </div>
            <div class="ak-kpi-card">
                <span class="ak-kpi-label">Totale ${opts.documentLabel || 'Documento'}</span>
                <span class="ak-kpi-value">${euro(totali.totale_ivato ?? totali.totale_documento)}</span>
            </div>
            ${totali.totale_costo !== undefined ? `
            <div class="ak-kpi-card">
                <span class="ak-kpi-label">Costo</span>
                <span class="ak-kpi-value">${euro(totali.totale_costo)}</span>
            </div>
            <div class="ak-kpi-card">
                <span class="ak-kpi-label">Margine</span>
                <span class="ak-kpi-value ${margineClass}">${euro(totali.margine_euro)} <small style="font-size:0.9rem;">(${(Number(totali.margine_percentuale) || 0).toFixed(1)}%)</small></span>
            </div>` : ''}
        </div>
    `;
}
