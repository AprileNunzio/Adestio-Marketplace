'use strict';

const money = require('./money');

function nellIntervallo(isoDate, dal, al) {
    try {
        if (!isoDate) return false;
        if (dal && isoDate < dal) return false;
        if (al && isoDate > al) return false;
        return true;
    } catch {
        return false;
    }
}

function meseDi(isoDate) {
    try {
        return String(isoDate || '').slice(0, 7);
    } catch {
        return '';
    }
}

function durataOreTurno(inizio, fine) {
    try {
        const [oInizio, mInizio] = String(inizio || '00:00').split(':').map(Number);
        const [oFine, mFine] = String(fine || '00:00').split(':').map(Number);
        const minuti = (oFine * 60 + mFine) - (oInizio * 60 + mInizio);
        return Math.max(minuti / 60, 0);
    } catch {
        return 0;
    }
}

function raggruppaMesi(trattamenti, staffId) {
    try {
        const mappa = new Map();
        trattamenti.forEach(t => {
            const mese = meseDi(t.data_trattamento) || 'non_datato';
            const quota = t.medico_id === staffId ? Number(t.quota_medico || 0) : Number(t.quota_segretaria || 0);
            const imp = Number(t.importo || 0);
            const corrente = mappa.get(mese) || {
                etichetta: mese,
                produzione: 0,
                compensi: 0,
                trattamenti: 0,
                entrate: 0,
                uscite: 0,
                saldo: 0
            };
            corrente.produzione = money.round(corrente.produzione + imp);
            corrente.compensi = money.round(corrente.compensi + quota);
            corrente.trattamenti += 1;
            corrente.entrate = corrente.produzione;
            corrente.uscite = corrente.compensi;
            corrente.saldo = money.round(corrente.produzione - corrente.compensi);
            mappa.set(mese, corrente);
        });
        return [...mappa.values()].sort((a, b) => a.etichetta.localeCompare(b.etichetta));
    } catch {
        return [];
    }
}

function raggruppaCategorie(trattamenti, catalogo) {
    try {
        const mappa = new Map();
        trattamenti.forEach(t => {
            const prest = catalogo.get(t.prestazione_id);
            const cat = (prest && (prest.categoria || prest.branca)) || 'Generale';
            const imp = Number(t.importo || 0);
            const corrente = mappa.get(cat) || { etichetta: cat, totale: 0, conteggio: 0 };
            corrente.totale = money.round(corrente.totale + imp);
            corrente.conteggio += 1;
            mappa.set(cat, corrente);
        });
        return [...mappa.values()].sort((a, b) => b.totale - a.totale);
    } catch {
        return [];
    }
}

function raggruppaTopPrestazioni(trattamenti) {
    try {
        const mappa = new Map();
        trattamenti.forEach(t => {
            const nome = String(t.descrizione || 'Prestazione').trim();
            const imp = Number(t.importo || 0);
            const corrente = mappa.get(nome) || { etichetta: nome, totale: 0, conteggio: 0 };
            corrente.totale = money.round(corrente.totale + imp);
            corrente.conteggio += 1;
            mappa.set(nome, corrente);
        });
        return [...mappa.values()]
            .sort((a, b) => b.totale - a.totale)
            .slice(0, 8);
    } catch {
        return [];
    }
}

function calcolaAgenda(appuntamenti, dal, al) {
    try {
        const inclusi = appuntamenti.filter(a => {
            const dataIso = a.data_ora_inizio ? new Date(Number(a.data_ora_inizio)).toISOString().slice(0, 10) : '';
            return nellIntervallo(dataIso, dal, al);
        });
        const conclusi = inclusi.filter(a => a.stato === 'concluso').length;
        const nonPresentati = inclusi.filter(a => a.stato === 'non_presentato').length;
        const annullati = inclusi.filter(a => a.stato === 'annullato').length;
        const programmati = inclusi.filter(a => a.stato === 'programmato' || a.stato === 'in_corso').length;
        const completatiValidi = conclusi + nonPresentati;
        const tassoCompletamento = completatiValidi > 0 ? money.round((conclusi / completatiValidi) * 100) : 100;

        return {
            totali: inclusi.length,
            conclusi,
            non_presentati: nonPresentati,
            annullati,
            programmati,
            tasso_aderenza: tassoCompletamento
        };
    } catch {
        return { totali: 0, conclusi: 0, non_presentati: 0, annullati: 0, programmati: 0, tasso_aderenza: 100 };
    }
}

function calcolaPresenze(orari, assenze, dal, al) {
    try {
        let oreSettimanali = 0;
        (orari || []).forEach(o => {
            oreSettimanali += durataOreTurno(o.ora_inizio, o.ora_fine);
        });

        let giorniFerie = 0;
        let giorniPermesso = 0;
        let giorniMalattia = 0;

        (assenze || []).forEach(a => {
            if (nellIntervallo(a.data_inizio, dal, al) || nellIntervallo(a.data_fine, dal, al)) {
                if (a.tipo === 'ferie') giorniFerie += 1;
                else if (a.tipo === 'malattia') giorniMalattia += 1;
                else giorniPermesso += 1;
            }
        });

        const giorniPeriodo = Math.max(
            dal && al ? Math.round((new Date(al).getTime() - new Date(dal).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 30,
            1
        );
        const settimane = giorniPeriodo / 7;
        const oreTeoriche = money.round(oreSettimanali * settimane);
        const oreAssenze = (giorniFerie + giorniPermesso + giorniMalattia) * (oreSettimanali > 0 ? oreSettimanali / 5 : 8);
        const oreEffettive = Math.max(money.round(oreTeoriche - oreAssenze), oreSettimanali > 0 ? 1 : 0);

        return {
            ore_settimanali: money.round(oreSettimanali),
            ore_pianificate: oreTeoriche,
            giorni_ferie: giorniFerie,
            giorni_permesso: giorniPermesso,
            giorni_malattia: giorniMalattia,
            totale_giorni_assenza: giorniFerie + giorniPermesso + giorniMalattia,
            ore_effettive: oreEffettive
        };
    } catch {
        return { ore_settimanali: 0, ore_pianificate: 0, giorni_ferie: 0, giorni_permesso: 0, giorni_malattia: 0, totale_giorni_assenza: 0, ore_effettive: 0 };
    }
}

function analizza({ staffMember, trattamenti, appuntamenti, orari, assenze, liquidazioni, catalogo, dal, al }) {
    try {
        const staffId = staffMember.id;
        const eseguiti = (trattamenti || []).filter(t =>
            t.stato === 'eseguito' && nellIntervallo(t.data_trattamento, dal, al)
        );

        let valoreProdotto = 0;
        let competenzeMaturate = 0;
        let costoMateriali = 0;
        const pazientiSet = new Set();

        eseguiti.forEach(t => {
            const imp = Number(t.importo || 0);
            const quota = t.medico_id === staffId ? Number(t.quota_medico || 0) : Number(t.quota_segretaria || 0);
            const mat = Number(t.costo_materiali || 0);

            valoreProdotto += imp;
            competenzeMaturate += quota;
            costoMateriali += mat;
            if (t.paziente_id) pazientiSet.add(t.paziente_id);
        });

        valoreProdotto = money.round(valoreProdotto);
        competenzeMaturate = money.round(competenzeMaturate);
        costoMateriali = money.round(costoMateriali);
        const margineStudio = money.round(valoreProdotto - competenzeMaturate - costoMateriali);
        const marginalitaPercentuale = valoreProdotto > 0 ? money.round((margineStudio / valoreProdotto) * 100) : 0;
        const incidenzaStaff = valoreProdotto > 0 ? money.round((competenzeMaturate / valoreProdotto) * 100) : 0;

        const ticketMedio = eseguiti.length > 0 ? money.round(valoreProdotto / eseguiti.length) : 0;
        const valoreMedioPaziente = pazientiSet.size > 0 ? money.round(valoreProdotto / pazientiSet.size) : 0;

        const flussiMensili = raggruppaMesi(eseguiti, staffId);
        const perCategoria = raggruppaCategorie(eseguiti, catalogo);
        const topPrestazioni = raggruppaTopPrestazioni(eseguiti);
        const agenda = calcolaAgenda(appuntamenti, dal, al);
        const presenze = calcolaPresenze(orari, assenze, dal, al);

        const resaOraria = presenze.ore_effettive > 0 ? money.round(valoreProdotto / presenze.ore_effettive) : 0;
        const guadagnoOrario = presenze.ore_effettive > 0 ? money.round(competenzeMaturate / presenze.ore_effettive) : 0;

        let totaleLiquidato = 0;
        (liquidazioni || []).forEach(l => {
            if (nellIntervallo(l.data_liquidazione, dal, al)) {
                totaleLiquidato += Number(l.totale_liquidato || 0);
            }
        });
        totaleLiquidato = money.round(totaleLiquidato);
        const totaleDaLiquidare = Math.max(money.round(competenzeMaturate - totaleLiquidato), 0);

        return {
            staff_id: staffMember.id,
            nominativo: `${staffMember.cognome} ${staffMember.nome}`.trim(),
            ruolo: staffMember.ruolo || 'medico',
            specializzazione: staffMember.specializzazione || '',
            compenso_mensile: Number(staffMember.compenso_mensile || 0),
            percentuale_default: Number(staffMember.percentuale_default || 0),
            ritenuta_percentuale: Number(staffMember.ritenuta_acconto_percentuale || 0),
            periodo_dal: dal,
            periodo_al: al,
            totale_prodotto: valoreProdotto,
            competenze_maturate: competenzeMaturate,
            costo_materiali: costoMateriali,
            margine_studio: margineStudio,
            marginalita_percentuale: marginalitaPercentuale,
            incidenza_staff_percentuale: incidenzaStaff,
            trattamenti_eseguiti: eseguiti.length,
            pazienti_unici: pazientiSet.size,
            ticket_medio_trattamento: ticketMedio,
            valore_medio_paziente: valoreMedioPaziente,
            flusso_mensile: flussiMensili,
            per_categoria: perCategoria,
            top_prestazioni: topPrestazioni,
            agenda,
            presenze,
            resa_oraria: resaOraria,
            guadagno_orario: guadagnoOrario,
            totale_liquidato: totaleLiquidato,
            totale_da_liquidare: totaleDaLiquidare
        };
    } catch {
        return {
            staff_id: (staffMember && staffMember.id) || '',
            nominativo: (staffMember && `${staffMember.cognome} ${staffMember.nome}`.trim()) || '',
            totale_prodotto: 0,
            competenze_maturate: 0,
            margine_studio: 0,
            trattamenti_eseguiti: 0,
            pazienti_unici: 0,
            flusso_mensile: [],
            per_categoria: [],
            top_prestazioni: [],
            agenda: { totali: 0, conclusi: 0, non_presentati: 0, annullati: 0, programmati: 0, tasso_aderenza: 100 },
            presenze: { ore_settimanali: 0, ore_pianificate: 0, giorni_ferie: 0, giorni_permesso: 0, ore_effettive: 0 },
            resa_oraria: 0,
            guadagno_orario: 0,
            totale_liquidato: 0,
            totale_da_liquidare: 0
        };
    }
}

module.exports = { analizza };
