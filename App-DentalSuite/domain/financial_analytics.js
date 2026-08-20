export function computeMonthlyTrends(incassi = [], spese = [], monthsCount = 6) {
    try {
        const now = new Date();
        const months = [];

        for (let i = monthsCount - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }).toUpperCase();
            months.push({ key, label, year: d.getFullYear(), month: d.getMonth() + 1, incassi: 0, spese: 0, margine: 0 });
        }

        incassi.forEach(inc => {
            if (!inc.data_pagamento) return;
            const d = new Date(inc.data_pagamento);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const target = months.find(m => m.key === key);
            if (target) {
                target.incassi += Number(inc.importo) || 0;
            }
        });

        spese.forEach(sp => {
            if (!sp.data_spesa) return;
            const d = new Date(sp.data_spesa);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const target = months.find(m => m.key === key);
            if (target) {
                target.spese += Number(sp.importo) || 0;
            }
        });

        months.forEach(m => {
            m.incassi = Math.round(m.incassi * 100) / 100;
            m.spese = Math.round(m.spese * 100) / 100;
            m.margine = Math.round((m.incassi - m.spese) * 100) / 100;
        });

        return months;
    } catch (e) {
        return [];
    }
}

export function computeCashflowForecast(rate = [], preventivi = [], storicoIncassi = []) {
    try {
        const now = new Date();
        const day30 = new Date(now.getTime() + 30 * 86400000);
        const day60 = new Date(now.getTime() + 60 * 86400000);
        const day90 = new Date(now.getTime() + 90 * 86400000);

        let rate30 = 0;
        let rate60 = 0;
        let rate90 = 0;

        rate.filter(r => r.stato !== 'pagata' && r.data_scadenza).forEach(r => {
            const d = new Date(r.data_scadenza);
            const imp = Number(r.importo) || 0;
            if (d <= day30) rate30 += imp;
            else if (d <= day60) rate60 += imp;
            else if (d <= day90) rate90 += imp;
        });

        let prevInAttesa = 0;
        preventivi.filter(p => p.stato === 'accettato' || p.stato === 'bozza').forEach(p => {
            prevInAttesa += Number(p.totale_netto) || 0;
        });

        const stotMediaMensile = storicoIncassi.length > 0 
            ? (storicoIncassi.reduce((a, b) => a + (Number(b.importo) || 0), 0) / Math.max(1, storicoIncassi.length / 10))
            : 5000;

        const stima30 = Math.round((rate30 + (prevInAttesa * 0.25) + (stotMediaMensile * 0.4)) * 100) / 100;
        const stima60 = Math.round((rate60 + (prevInAttesa * 0.35) + (stotMediaMensile * 0.35)) * 100) / 100;
        const stima90 = Math.round((rate90 + (prevInAttesa * 0.20) + (stotMediaMensile * 0.35)) * 100) / 100;

        return {
            forecast30: stima30,
            forecast60: stima60,
            forecast90: stima90,
            rateInScadenza30: Math.round(rate30 * 100) / 100,
            rateInScadenza60: Math.round(rate60 * 100) / 100,
            rateInScadenza90: Math.round(rate90 * 100) / 100,
            preventiviAttiviTotale: Math.round(prevInAttesa * 100) / 100,
            totaleAttesoTrimestre: Math.round((stima30 + stima60 + stima90) * 100) / 100
        };
    } catch (e) {
        return { forecast30: 0, forecast60: 0, forecast90: 0, rateInScadenza30: 0, totaleAttesoTrimestre: 0 };
    }
}

export function computeCategoryDistribution(trattamenti = [], prestazioni = []) {
    try {
        const catMap = {
            igiene: { label: 'Igiene & Profilassi', total: 0, count: 0, color: '#0d9488' },
            conservativa: { label: 'Conservativa & Estetica', total: 0, count: 0, color: '#2563eb' },
            endodonzia: { label: 'Endodonzia', total: 0, count: 0, color: '#9333ea' },
            implantologia: { label: 'Implantologia & Chirurgia', total: 0, count: 0, color: '#e11d48' },
            protesi: { label: 'Protesi Fissa / Mobile', total: 0, count: 0, color: '#d97706' },
            ortodonzia: { label: 'Ortodonzia & Gnatologia', total: 0, count: 0, color: '#06b6d4' },
            varie: { label: 'Diagnostica & Altro', total: 0, count: 0, color: '#64748b' }
        };

        const prestMap = {};
        prestazioni.forEach(p => { prestMap[p.id] = p.categoria || 'varie'; });

        trattamenti.forEach(t => {
            const cat = (t.prestazione_id && prestMap[t.prestazione_id]) ? prestMap[t.prestazione_id] : 'varie';
            const target = catMap[cat] || catMap['varie'];
            target.total += Number(t.importo) || 0;
            target.count += 1;
        });

        const totalRevenue = Object.values(catMap).reduce((a, b) => a + b.total, 0);

        return Object.values(catMap).map(c => ({
            ...c,
            total: Math.round(c.total * 100) / 100,
            percentage: totalRevenue > 0 ? Math.round((c.total / totalRevenue) * 100) : 0
        })).filter(c => c.total > 0 || c.count > 0);
    } catch (e) {
        return [];
    }
}

export function computePaymentMethodsDistribution(incassi = []) {
    try {
        const methods = {
            pos: { label: 'POS / Carte', total: 0, count: 0, color: '#0d9488' },
            bonifico: { label: 'Bonifico Bancario', total: 0, count: 0, color: '#2563eb' },
            contanti: { label: 'Contanti', total: 0, count: 0, color: '#16a34a' },
            finanziamento: { label: 'Finanziamento', total: 0, count: 0, color: '#9333ea' },
            assegno: { label: 'Assegno', total: 0, count: 0, color: '#d97706' }
        };

        incassi.forEach(inc => {
            const m = inc.metodo_pagamento || 'pos';
            const target = methods[m] || methods['pos'];
            target.total += Number(inc.importo) || 0;
            target.count += 1;
        });

        const totalAmount = Object.values(methods).reduce((a, b) => a + b.total, 0);

        return Object.values(methods).map(m => ({
            ...m,
            total: Math.round(m.total * 100) / 100,
            percentage: totalAmount > 0 ? Math.round((m.total / totalAmount) * 100) : 0
        })).filter(m => m.total > 0);
    } catch (e) {
        return [];
    }
}
