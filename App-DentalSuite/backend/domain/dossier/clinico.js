'use strict';

const denti = require('../denti');
const money = require('../money');
const consenso = require('../consenso');
const identita = require('../identita');

function testo(valore) {
    return String(valore === null || valore === undefined ? '' : valore).trim();
}

function nominativoDi(nominativi, id) {
    const voce = nominativi.get(id);
    return voce ? identita.nominativo(voce) : '';
}

function arcata(dentizione, righe) {
    const mappa = denti.mappaStati(dentizione, righe);
    return {
        dentizione,
        denti: mappa,
        stati: denti.STATI,
        superfici: denti.SUPERFICI,
        con_reperto: mappa.filter(voce => voce.registrato && voce.stato !== 'sano').length
    };
}

function storiaDelDente(rilevazioni) {
    return rilevazioni.map(riga => ({
        id: riga.id,
        numero_dente: riga.numero_dente,
        stato: riga.stato,
        stato_precedente: testo(riga.stato_precedente),
        superfici: testo(riga.superfici),
        materiale: testo(riga.materiale),
        data_rilevazione: testo(riga.data_rilevazione),
        note: testo(riga.note)
    }));
}

function trattamento(riga, catalogo, nominativi) {
    const prestazione = catalogo.get(riga.prestazione_id);
    return {
        id: riga.id,
        data: testo(riga.data_trattamento),
        descrizione: testo(riga.descrizione) || (prestazione ? prestazione.nome : 'Prestazione non catalogata'),
        categoria: prestazione ? testo(prestazione.categoria) : '',
        dente: testo(riga.dente),
        superfici: testo(riga.superfici),
        stato: riga.stato || 'pianificato',
        importo: money.round(riga.importo || 0),
        medico: nominativoDi(nominativi, riga.medico_id),
        anestesia: testo(riga.anestesia),
        lotto_materiali: testo(riga.lotto_materiali),
        note: testo(riga.note)
    };
}

function prescrizione(riga, nominativi) {
    return {
        id: riga.id,
        farmaco: testo(riga.farmaco),
        principio_attivo: testo(riga.principio_attivo),
        dosaggio: testo(riga.dosaggio),
        posologia: testo(riga.posologia),
        durata_giorni: Number(riga.durata_giorni) || 0,
        data: testo(riga.data_prescrizione),
        medico: nominativoDi(nominativi, riga.medico_id),
        note: testo(riga.note)
    };
}

function referto(riga) {
    return {
        id: riga.id,
        tipo: riga.tipo || 'altro',
        titolo: testo(riga.titolo) || testo(riga.file_name) || 'Referto',
        data: testo(riga.data_esame),
        mime_type: testo(riga.mime_type),
        dimensione: Number(riga.file_size) || 0,
        note: testo(riga.note)
    };
}

function quadroConsensi(consensi, oggi) {
    const scoperture = consenso.scoperture(consensi.modelli, consensi.raccolti, oggi);
    return {
        vigenti: consenso.vigenti(consensi.raccolti, oggi),
        scoperture,
        bloccanti: scoperture.filter(voce => voce.obbligatorio)
    };
}

function seduta(appuntamentiOggi, nominativi, catalogo) {
    if (appuntamentiOggi.length === 0) return null;
    const riga = appuntamentiOggi[0];
    const prestazione = catalogo.get(riga.prestazione_id);
    return {
        id: riga.id,
        inizio: Number(riga.data_ora_inizio) || 0,
        durata_minuti: Number(riga.durata_minuti) || 0,
        stato: riga.stato || 'programmato',
        motivo: testo(riga.motivo_visita),
        medico: nominativoDi(nominativi, riga.medico_id),
        prestazione: prestazione ? prestazione.nome : '',
        note: testo(riga.note)
    };
}

module.exports = { arcata, storiaDelDente, trattamento, prescrizione, referto, quadroConsensi, seduta };
