import { formatCurrency } from '../shared/ui_kit.js';

export function renderBarTrendChart({ months = [], height = 220 }) {
    try {
        if (!months || months.length === 0) {
            return '<div style="text-align:center; padding:2rem; color:var(--md-on-surface-variant);">Dati insufficienti per il grafico degli andamenti.</div>';
        }

        const maxVal = Math.max(...months.map(m => Math.max(m.incassi, m.spese)), 1000);
        const chartHeight = height - 50;

        const barsHtml = months.map((m, idx) => {
            const incH = Math.max(4, Math.round((m.incassi / maxVal) * chartHeight));
            const spH = Math.max(4, Math.round((m.spese / maxVal) * chartHeight));

            return `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:0.4rem; height:100%; justify-content:flex-end;">
                    <div style="display:flex; gap:6px; align-items:flex-end; height:${chartHeight}px; width:100%; justify-content:center;">
                        <div title="Incassi: ${formatCurrency(m.incassi)}" style="width:16px; height:${incH}px; background:linear-gradient(180deg, #14b8a6 0%, #0d9488 100%); border-radius:6px 6px 0 0; transition:height 0.3s ease;"></div>
                        <div title="Spese: ${formatCurrency(m.spese)}" style="width:16px; height:${spH}px; background:linear-gradient(180deg, #f43f5e 0%, #e11d48 100%); border-radius:6px 6px 0 0; transition:height 0.3s ease;"></div>
                    </div>
                    <div style="font-size:0.74rem; font-weight:800; color:var(--md-on-surface-variant); text-transform:uppercase;">${m.label}</div>
                </div>
            `;
        }).join('');

        return `
            <div style="display:flex; flex-direction:column; gap:0.8rem; width:100%;">
                <div style="display:flex; justify-content:flex-end; gap:1.2rem; font-size:0.78rem; font-weight:700;">
                    <span style="display:inline-flex; align-items:center; gap:0.35rem; color:#0d9488;"><span style="width:10px; height:10px; background:#0d9488; border-radius:3px;"></span> Incassi</span>
                    <span style="display:inline-flex; align-items:center; gap:0.35rem; color:#e11d48;"><span style="width:10px; height:10px; background:#e11d48; border-radius:3px;"></span> Spese</span>
                </div>
                <div style="display:flex; height:${height}px; align-items:flex-end; border-bottom:1.5px solid var(--md-outline-variant); padding-bottom:0.4rem; gap:0.8rem;">
                    ${barsHtml}
                </div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

export function renderDonutChart({ items = [], size = 170, holeRadius = 52 }) {
    try {
        if (!items || items.length === 0) {
            return '<div style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun dato.</div>';
        }

        const radius = 70;
        const center = size / 2;
        const circumference = 2 * Math.PI * radius;
        let runningAngle = 0;

        const circlesHtml = items.map(it => {
            const strokeDasharray = `${(it.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -runningAngle;
            runningAngle += (it.percentage / 100) * circumference;

            return `
                <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent"
                    stroke="${it.color}" stroke-width="24"
                    stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
                    style="transition:stroke-dashoffset 0.4s ease;" />
            `;
        }).join('');

        const legendHtml = items.map(it => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:0.8rem; font-size:0.82rem; margin-bottom:0.35rem;">
                <span style="display:inline-flex; align-items:center; gap:0.4rem; font-weight:700; color:var(--md-on-surface);">
                    <span style="width:10px; height:10px; background:${it.color}; border-radius:50%; flex-shrink:0;"></span>
                    ${it.label}
                </span>
                <span style="font-weight:800; color:var(--md-on-surface);">${it.percentage}% <small style="color:var(--md-on-surface-variant); font-weight:600;">(${formatCurrency(it.total)})</small></span>
            </div>
        `).join('');

        return `
            <div style="display:flex; align-items:center; gap:1.8rem; flex-wrap:wrap; justify-content:center;">
                <svg width="${size}" height="${size}" style="transform:rotate(-90deg); flex-shrink:0;">
                    ${circlesHtml}
                </svg>
                <div style="flex:1; min-width:200px;">
                    ${legendHtml}
                </div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

export function renderForecastCard({ forecastData = {} }) {
    try {
        return `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:16px; padding:1.2rem; position:relative; overflow:hidden;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant); letter-spacing:0.04em;">Prossimi 30 Giorni</span>
                        <span class="material-symbols-rounded" style="color:var(--ds-teal);">calendar_view_month</span>
                    </div>
                    <div style="font-size:1.6rem; font-weight:800; color:var(--ds-teal); margin-top:0.4rem;">${formatCurrency(forecastData.forecast30 || 0)}</div>
                    <div style="font-size:0.76rem; color:var(--md-on-surface-variant); margin-top:0.3rem;">Rate certe a scadere: ${formatCurrency(forecastData.rateInScadenza30 || 0)}</div>
                </div>

                <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:16px; padding:1.2rem; position:relative; overflow:hidden;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant); letter-spacing:0.04em;">Prossimi 60 Giorni</span>
                        <span class="material-symbols-rounded" style="color:var(--ds-blue);">trending_up</span>
                    </div>
                    <div style="font-size:1.6rem; font-weight:800; color:var(--ds-blue); margin-top:0.4rem;">${formatCurrency(forecastData.forecast60 || 0)}</div>
                    <div style="font-size:0.76rem; color:var(--md-on-surface-variant); margin-top:0.3rem;">Rate certe a scadere: ${formatCurrency(forecastData.rateInScadenza60 || 0)}</div>
                </div>

                <div style="background:var(--md-surface); border:1.5px solid var(--md-outline-variant); border-radius:16px; padding:1.2rem; position:relative; overflow:hidden;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--md-on-surface-variant); letter-spacing:0.04em;">Prossimi 90 Giorni</span>
                        <span class="material-symbols-rounded" style="color:var(--ds-purple);">insights</span>
                    </div>
                    <div style="font-size:1.6rem; font-weight:800; color:var(--ds-purple); margin-top:0.4rem;">${formatCurrency(forecastData.forecast90 || 0)}</div>
                    <div style="font-size:0.76rem; color:var(--md-on-surface-variant); margin-top:0.3rem;">Rate certe a scadere: ${formatCurrency(forecastData.rateInScadenza90 || 0)}</div>
                </div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}
