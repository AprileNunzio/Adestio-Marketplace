const { staff, prestazioni, liquidazioni } = require('../repositories/organization');
const { mensilita } = require('../repositories/compensi');
const { trattamenti, pazienti } = require('../repositories/clinical');
const { appuntamenti } = require('../repositories/facility');
const { orari, assenze } = require('../repositories/personale');
const { db, persist, now } = require('../kernel/database');
const { validationError, conflictError } = require('../kernel/errors');
const money = require('../domain/money');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const calcolo = require('../domain/compensi');
const maturatoDominio = require('../domain/maturato');
const flussiStaffDominio = require('../domain/flussi_staff');
const { oggiIso } = require('../domain/rateizzazione');

function periodo(payload) {
    const dal = String(payload.periodo_dal || '').trim();
    const al = String(payload.periodo_al || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dal) || !/^\d{4}-\d{2}-\d{2}$/.test(al)) {
        throw validationError('Periodo di riferimento non valido');
    }
    if (al < dal) throw validationError('La data finale precede quella iniziale');
    return { dal, al };
}

function trattamentiLiquidabili(staffId, dal, al) {
    return trattamenti.findAll({
        where: { stato: 'eseguito' },
        filtri: [
            { colonna: 'liquidazione_id', operatore: 'vuoto' },
            { colonna: 'data_trattamento', operatore: 'fra', valore: [dal, al] },
            {
                oppure: [
                    { colonna: 'medico_id', operatore: 'eq', valore: staffId },
                    { colonna: 'segretaria_id', operatore: 'eq', valore: staffId }
                ]
            }
        ]
    });
}

function periodiGiaLiquidati(staffId) {
    return mensilita.findAll({ where: { staff_id: staffId } }).map(riga => riga.periodo);
}

function listLiquidazioni(payload = {}) {
    const righe = payload.staff_id
        ? liquidazioni.findAll({ where: { staff_id: payload.staff_id } })
        : liquidazioni.findAll({});
    const collaboratori = riferimenti.mappaPerId(staff, riferimenti.raccogli(righe, 'staff_id'));
    return righe.map(riga => ({
        ...riga,
        collaboratore: collaboratori.has(riga.staff_id)
            ? `${collaboratori.get(riga.staff_id).cognome} ${collaboratori.get(riga.staff_id).nome}`.trim()
            : ''
    }));
}

function componiMaturato(payload) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const collaboratore = staff.requireById(payload.staff_id, { includeArchived: true });
    const { dal, al } = periodo(payload);
    const liquidabili = trattamentiLiquidabili(payload.staff_id, dal, al);
    const catalogo = riferimenti.mappaPerId(prestazioni, riferimenti.raccogli(liquidabili, 'prestazione_id'));
    const mappaPazienti = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(liquidabili, 'paziente_id'));

    const dettaglio = maturatoDominio.componi({
        trattamenti: liquidabili,
        staffId: payload.staff_id,
        catalogo,
        mappaPazienti,
        compensoMensile: collaboratore.compenso_mensile,
        dal,
        al,
        periodiLiquidati: periodiGiaLiquidati(payload.staff_id)
    });

    return { collaboratore, dettaglio, dal, al };
}

function maturato(payload = {}) {
    const { collaboratore, dettaglio } = componiMaturato(payload);
    return {
        staff_id: collaboratore.id,
        collaboratore: `${collaboratore.cognome} ${collaboratore.nome}`.trim(),
        tipo_rapporto: collaboratore.tipo_rapporto || 'collaboratore',
        compenso_mensile: money.round(collaboratore.compenso_mensile || 0),
        ritenuta_percentuale: Number(collaboratore.ritenuta_acconto_percentuale || 0),
        ...dettaglio
    };
}

function calcola(payload = {}) {
    const { collaboratore, dettaglio, dal, al } = componiMaturato(payload);
    const scelta = maturatoDominio.selezione(dettaglio, payload);
    const netto = calcolo.nettoLiquidazione(scelta.totale, collaboratore.ritenuta_acconto_percentuale);

    return {
        staff_id: collaboratore.id,
        collaboratore: `${collaboratore.cognome} ${collaboratore.nome}`.trim(),
        tipo_rapporto: collaboratore.tipo_rapporto || 'collaboratore',
        periodo_dal: dal,
        periodo_al: al,
        numero_trattamenti: scelta.voci.length,
        totale_mensilita: scelta.totale_mensilita,
        totale_variabile: scelta.totale_variabile,
        mensilita: scelta.mensilita,
        ...netto,
        dettaglio: scelta.voci.map(voce => ({
            id: voce.id,
            data_trattamento: voce.data,
            descrizione: voce.descrizione,
            dente: voce.dente || '',
            paziente: voce.paziente || '',
            categoria: voce.categoria,
            importo: voce.importo,
            quota: voce.quota,
            ruolo: voce.ruolo
        }))
    };
}

async function liquida(payload = {}) {
    const bozza = calcola(payload);
    if (bozza.numero_trattamenti === 0 && bozza.totale_mensilita <= 0) {
        throw conflictError('Nessun compenso selezionato da liquidare nel periodo indicato');
    }

    const chiusi = new Set(periodiGiaLiquidati(bozza.staff_id));
    const duplicato = bozza.mensilita.find(voce => chiusi.has(voce.periodo));
    if (duplicato) {
        throw conflictError(`La mensilità ${duplicato.periodo} risulta già liquidata`);
    }

    const id = await liquidazioni.insert({
        staff_id: bozza.staff_id,
        periodo_dal: bozza.periodo_dal,
        periodo_al: bozza.periodo_al,
        totale_competenze: bozza.totale_competenze,
        totale_mensilita: bozza.totale_mensilita,
        totale_variabile: bozza.totale_variabile,
        ritenuta_acconto: bozza.ritenuta_acconto,
        totale_liquidato: bozza.totale_liquidato,
        numero_trattamenti: bozza.numero_trattamenti,
        data_liquidazione: payload.data_liquidazione || oggiIso(),
        metodo_pagamento: payload.metodo_pagamento || '',
        note: payload.note || ''
    }, actor.stamp());

    for (const voce of bozza.mensilita) {
        await mensilita.insert({
            liquidazione_id: id,
            staff_id: bozza.staff_id,
            periodo: voce.periodo,
            giorni_coperti: voce.giorni_coperti,
            giorni_mese: voce.giorni_mese,
            importo: voce.importo
        });
    }

    const timestamp = now();
    bozza.dettaglio.forEach(voce => {
        db().run(
            'UPDATE trattamenti_paziente SET liquidazione_id = ?, last_modified = ? WHERE id = ?',
            [id, timestamp, voce.id]
        );
    });
    await persist();

    return {
        id,
        totale_liquidato: bozza.totale_liquidato,
        totale_mensilita: bozza.totale_mensilita,
        totale_variabile: bozza.totale_variabile,
        trattamenti_chiusi: bozza.numero_trattamenti,
        mensilita_chiuse: bozza.mensilita.map(voce => voce.periodo)
    };
}

function flussiStaff(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const collaboratore = staff.requireById(payload.staff_id, { includeArchived: true });
    const dal = String(payload.dal || payload.periodo_dal || '').trim();
    const al = String(payload.al || payload.periodo_al || '').trim();

    const filtriTratt = [
        {
            oppure: [
                { colonna: 'medico_id', operatore: 'eq', valore: payload.staff_id },
                { colonna: 'segretaria_id', operatore: 'eq', valore: payload.staff_id }
            ]
        }
    ];
    if (dal) filtriTratt.push({ colonna: 'data_trattamento', operatore: 'gte', valore: dal });
    if (al) filtriTratt.push({ colonna: 'data_trattamento', operatore: 'lte', valore: al });

    const righeTrattamenti = trattamenti.findAll({ filtri: filtriTratt });
    const catalogo = riferimenti.mappaPerId(prestazioni, riferimenti.raccogli(righeTrattamenti, 'prestazione_id'));
    const righeAppuntamenti = appuntamenti.findAll({ where: { medico_id: payload.staff_id } });
    const righeOrari = orari.findAll({ where: { staff_id: payload.staff_id } });
    const righeAssenze = assenze.findAll({ where: { staff_id: payload.staff_id } });
    const righeLiquidazioni = liquidazioni.findAll({ where: { staff_id: payload.staff_id } });

    return flussiStaffDominio.analizza({
        staffMember: collaboratore,
        trattamenti: righeTrattamenti,
        appuntamenti: righeAppuntamenti,
        orari: righeOrari,
        assenze: righeAssenze,
        liquidazioni: righeLiquidazioni,
        catalogo,
        dal,
        al
    });
}

module.exports = { listLiquidazioni, maturato, calcola, liquida, flussiStaff };
