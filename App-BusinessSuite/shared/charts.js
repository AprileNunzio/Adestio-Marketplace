// Grafici SVG leggeri, disegnati a mano (nessuna dipendenza esterna).
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function monthlyBarChartSvg(monthly, opts = {}) {
    const width = opts.width || 760;
    const height = opts.height || 220;
    const padding = 30;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;
    const maxVal = Math.max(1, ...monthly.map(m => Math.max(m.entrate || 0, m.uscite || 0)));
    const groupW = chartW / monthly.length;
    const barW = Math.min(16, groupW / 3);

    const bars = monthly.map((m, i) => {
        const x0 = padding + i * groupW + groupW / 2 - barW - 2;
        const hEntrate = (m.entrate / maxVal) * chartH;
        const hUscite = (m.uscite / maxVal) * chartH;
        const yEntrate = padding + chartH - hEntrate;
        const yUscite = padding + chartH - hUscite;
        return `
            <rect x="${x0}" y="${yEntrate}" width="${barW}" height="${hEntrate}" rx="3" fill="#059669" />
            <rect x="${x0 + barW + 4}" y="${yUscite}" width="${barW}" height="${hUscite}" rx="3" fill="#dc2626" />
            <text x="${x0 + barW}" y="${height - 8}" text-anchor="middle" font-size="10" fill="var(--md-on-surface-variant)">${MESI[i]}</text>
        `;
    }).join('');

    return `
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto;" role="img" aria-label="Andamento mensile entrate e uscite">
            <line x1="${padding}" y1="${padding + chartH}" x2="${width - padding}" y2="${padding + chartH}" stroke="var(--md-outline-variant)" />
            ${bars}
        </svg>
        <div style="display:flex; gap:1.2rem; justify-content:center; margin-top:0.4rem; font-size:0.82rem; color:var(--md-on-surface-variant);">
            <span><span style="display:inline-block; width:10px; height:10px; background:#059669; border-radius:2px; margin-right:0.3rem;"></span>Entrate</span>
            <span><span style="display:inline-block; width:10px; height:10px; background:#dc2626; border-radius:2px; margin-right:0.3rem;"></span>Uscite</span>
        </div>
    `;
}

export function categoryBreakdownHtml(categorie) {
    const entries = Object.entries(categorie || {}).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const colors = ['#2563eb', '#dc2626', '#c2410c', '#7c3aed', '#0f766e', '#64748b', '#f59e0b'];
    if (entries.length === 0) return '<p style="color:var(--md-on-surface-variant);">Nessuna uscita registrata.</p>';
    return `<div style="display:flex; flex-direction:column; gap:0.5rem;">
        ${entries.map(([cat, val], i) => {
            const pct = (val / total) * 100;
            return `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.2rem;">
                        <span>${cat}</span><span>${pct.toFixed(1)}%</span>
                    </div>
                    <div style="height:8px; border-radius:4px; background:var(--md-surface-variant); overflow:hidden;">
                        <div style="height:100%; width:${pct}%; background:${colors[i % colors.length]};"></div>
                    </div>
                </div>
            `;
        }).join('')}
    </div>`;
}
