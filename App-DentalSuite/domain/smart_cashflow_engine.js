export function computeSmartCashflow({
    rate = [],
    preventivi = [],
    incassi = [],
    spese = [],
    appuntamenti = [],
    prestazioni = [],
    staff = []
}) {
    try {
        const now = new Date();
        const d30 = new Date(now.getTime() + 30 * 86400000);
        const d60 = new Date(now.getTime() + 60 * 86400000);
        const d90 = new Date(now.getTime() + 90 * 86400000);

        let rateAttive30 = 0;
        let rateAttive60 = 0;
        let rateAttive90 = 0;

        rate.filter(r => r.stato !== 'pagata' && r.data_scadenza).forEach(r => {
            const d = new Date(r.data_scadenza);
            const imp = Number(r.importo) || 0;
            if (d <= d30) rateAttive30 += imp;
            else if (d <= d60) rateAttive60 += imp;
            else if (d <= d90) rateAttive90 += imp;
        });

        const solvencyRate = 0.94;

        let prevAccettatiTot = 0;
        let prevBozzaTot = 0;
        let prevGrandiPiani = 0;

        preventivi.forEach(p => {
            const netto = Number(p.totale_netto) || 0;
            if (p.stato === 'accettato') {
                prevAccettatiTot += netto;
            } else if (p.stato === 'bozza' || p.stato === 'inviato') {
                if (netto > 5000) prevGrandiPiani += netto;
                else prevBozzaTot += netto;
            }
        });

        const prevProb30 = (prevAccettatiTot * 0.40 * 0.90) + (prevBozzaTot * 0.35 * 0.60) + (prevGrandiPiani * 0.20 * 0.45);
        const prevProb60 = (prevAccettatiTot * 0.40 * 0.90) + (prevBozzaTot * 0.35 * 0.60) + (prevGrandiPiani * 0.35 * 0.45);
        const prevProb90 = (prevAccettatiTot * 0.20 * 0.90) + (prevBozzaTot * 0.20 * 0.50) + (prevGrandiPiani * 0.35 * 0.45);

        const prestMap = {};
        prestazioni.forEach(p => { prestMap[p.id] = Number(p.prezzo_paziente) || 80; });

        let agendaValore30 = 0;
        appuntamenti.filter(a => a.data_ora_inizio >= now.getTime() && a.data_ora_inizio <= d30.getTime()).forEach(a => {
            agendaValore30 += 120;
        });

        const storicoTot = incassi.reduce((a, b) => a + (Number(b.importo) || 0), 0);
        const mediaMensileStorica = incassi.length > 0 ? (storicoTot / Math.max(1, incassi.length / 15)) : 6000;

        const currentMonth = now.getMonth();
        const SEASONAL_FACTORS = [0.90, 0.95, 1.05, 1.10, 1.15, 1.10, 0.85, 0.60, 1.05, 1.15, 1.10, 0.90];
        const seasonCoeff30 = SEASONAL_FACTORS[currentMonth] || 1.0;
        const seasonCoeff60 = SEASONAL_FACTORS[(currentMonth + 1) % 12] || 1.0;
        const seasonCoeff90 = SEASONAL_FACTORS[(currentMonth + 2) % 12] || 1.0;

        const speseTotali = spese.reduce((a, b) => a + (Number(b.importo) || 0), 0);
        const speseMensiliMedie = spese.length > 0 ? (speseTotali / Math.max(1, spese.length / 10)) : 3500;

        const costiFissiMensili = Math.round(speseMensiliMedie * 0.70);
        const costiVariabiliStima30 = Math.round(mediaMensileStorica * 0.18);
        const uscitePreviste30 = Math.round(costiFissiMensili + costiVariabiliStima30);
        const uscitePreviste60 = Math.round(costiFissiMensili + (mediaMensileStorica * seasonCoeff60 * 0.18));
        const uscitePreviste90 = Math.round(costiFissiMensili + (mediaMensileStorica * seasonCoeff90 * 0.18));

        const base30 = (rateAttive30 * solvencyRate) + prevProb30 + (agendaValore30 * 0.85) + (mediaMensileStorica * 0.25 * seasonCoeff30);
        const base60 = (rateAttive60 * solvencyRate) + prevProb60 + (mediaMensileStorica * 0.50 * seasonCoeff60);
        const base90 = (rateAttive90 * solvencyRate) + prevProb90 + (mediaMensileStorica * 0.45 * seasonCoeff90);

        const real30 = Math.round(base30 * 100) / 100;
        const real60 = Math.round(base60 * 100) / 100;
        const real90 = Math.round(base90 * 100) / 100;

        const prud30 = Math.round(((rateAttive30 * 0.85) + (prevAccettatiTot * 0.25 * 0.75) + (costiFissiMensili * 0.9)) * 100) / 100;
        const prud60 = Math.round(((rateAttive60 * 0.85) + (prevAccettatiTot * 0.25 * 0.75) + (mediaMensileStorica * 0.3)) * 100) / 100;
        const prud90 = Math.round(((rateAttive90 * 0.85) + (prevAccettatiTot * 0.15 * 0.70) + (mediaMensileStorica * 0.25)) * 100) / 100;

        const ott30 = Math.round((real30 * 1.22) * 100) / 100;
        const ott60 = Math.round((real60 * 1.25) * 100) / 100;
        const ott90 = Math.round((real90 * 1.25) * 100) / 100;

        const netReal30 = Math.round((real30 - uscitePreviste30) * 100) / 100;
        const netReal60 = Math.round((real60 - uscitePreviste60) * 100) / 100;
        const netReal90 = Math.round((real90 - uscitePreviste90) * 100) / 100;

        const advisory = [];
        if (rateAttive30 > 3000) {
            advisory.push({
                type: 'info',
                icon: 'event_repeat',
                title: 'Scadenziario Rate Rilevante a 30gg',
                desc: `Sono previste ${Math.round(rateAttive30)}€ di rate nei prossimi 30 giorni. Si raccomanda l'invio tempestivo dei promemoria automatici via WhatsApp.`
            });
        }
        if (prevGrandiPiani > 4000) {
            advisory.push({
                type: 'warning',
                icon: 'campaign',
                title: 'Piani di Cura Complessi in Attesa',
                desc: `Ci sono preventivi di chirurgia/implantologia per ${Math.round(prevGrandiPiani)}€ in fase di decisione. Un contatto dedicato della segreteria può accelerarne l'accettazione.`
            });
        }
        if (netReal30 >= 0) {
            advisory.push({
                type: 'success',
                icon: 'verified_user',
                title: 'Equilibrio di Cassa Positivo',
                desc: `La proiezione evidenzia un margine operativo netto positivo di ${netReal30}€ nel primo mese con copertura ottimale delle spese fisse.`
            });
        } else {
            advisory.push({
                type: 'danger',
                icon: 'error',
                title: 'Attenzione al Fabbisogno Operativo',
                desc: `Il flusso netto a 30gg evidenzia una contrazione di ${Math.abs(netReal30)}€. Si suggerisce di anticipare acconti e saturare gli slot liberi in agenda.`
            });
        }

        return {
            scenarios: {
                prudenziale: { m30: prud30, m60: prud60, m90: prud90, total: Math.round(prud30 + prud60 + prud90) },
                realistico: { m30: real30, m60: real60, m90: real90, total: Math.round(real30 + real60 + real90) },
                ottimistico: { m30: ott30, m60: ott60, m90: ott90, total: Math.round(ott30 + ott60 + ott90) }
            },
            outflows: {
                m30: uscitePreviste30,
                m60: uscitePreviste60,
                m90: uscitePreviste90,
                total: uscitePreviste30 + uscitePreviste60 + uscitePreviste90
            },
            netFlows: {
                m30: netReal30,
                m60: netReal60,
                m90: netReal90,
                total: Math.round(netReal30 + netReal60 + netReal90)
            },
            breakdown30: {
                rateCerte: Math.round(rateAttive30 * solvencyRate),
                preventiviPonderati: Math.round(prevProb30),
                agendaVelocity: Math.round(agendaValore30 * 0.85),
                routineRicorrente: Math.round(mediaMensileStorica * 0.25 * seasonCoeff30)
            },
            coverageRatio: uscitePreviste30 > 0 ? Math.round((real30 / uscitePreviste30) * 100) / 100 : 2.5,
            advisory
        };
    } catch (e) {
        return {
            scenarios: {
                prudenziale: { m30: 0, m60: 0, m90: 0, total: 0 },
                realistico: { m30: 0, m60: 0, m90: 0, total: 0 },
                ottimistico: { m30: 0, m60: 0, m90: 0, total: 0 }
            },
            outflows: { m30: 0, m60: 0, m90: 0, total: 0 },
            netFlows: { m30: 0, m60: 0, m90: 0, total: 0 },
            breakdown30: { rateCerte: 0, preventiviPonderati: 0, agendaVelocity: 0, routineRicorrente: 0 },
            coverageRatio: 1,
            advisory: []
        };
    }
}
