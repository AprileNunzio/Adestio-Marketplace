'use strict';

const APPLICAZIONE = 'adestio_dental_suite';

const CAMPI_CONSENTITI = [
    'applicazione',
    'versione_protocollo',
    'id',
    'nome',
    'poltrona_id',
    'poltrona_nome',
    'ruolo',
    'porta',
    'impronta',
    'nodo',
    'attiva',
    'occupato',
    'aggiornato_il'
];

const CAMPI_VIETATI = [
    'paziente_id',
    'paziente_nome',
    'paziente',
    'nominativo',
    'dossier',
    'trasmissione_id',
    'codice_fiscale',
    'anamnesi'
];

function testo(valore) {
    return String(valore === null || valore === undefined ? '' : valore).trim();
}

function componi(scheda, occupato, versioneProtocollo) {
    if (!scheda) return null;
    return {
        applicazione: APPLICAZIONE,
        versione_protocollo: Number(versioneProtocollo) || 0,
        id: testo(scheda.id),
        nome: testo(scheda.nome),
        poltrona_id: testo(scheda.poltrona_id),
        poltrona_nome: testo(scheda.poltrona_nome),
        ruolo: testo(scheda.ruolo),
        porta: Number(scheda.porta) || 0,
        impronta: testo(scheda.impronta),
        nodo: testo(scheda.nodo),
        attiva: true,
        occupato: Boolean(occupato),
        aggiornato_il: Date.now()
    };
}

function depura(pacchetto) {
    if (!pacchetto || typeof pacchetto !== 'object') return null;
    const pulito = {};
    for (const campo of CAMPI_CONSENTITI) {
        if (pacchetto[campo] !== undefined) pulito[campo] = pacchetto[campo];
    }
    pulito.occupato = Boolean(pacchetto.occupato);
    return pulito;
}

function contieneDatiPaziente(pacchetto) {
    if (!pacchetto || typeof pacchetto !== 'object') return false;
    return CAMPI_VIETATI.some(campo => {
        const valore = pacchetto[campo];
        return valore !== undefined && valore !== null && valore !== '';
    });
}

function etichettaPostazione(voce) {
    if (!voce) return '';
    return testo(voce.poltrona_nome) || testo(voce.nome) || '';
}

module.exports = {
    APPLICAZIONE,
    CAMPI_CONSENTITI,
    CAMPI_VIETATI,
    componi,
    depura,
    contieneDatiPaziente,
    etichettaPostazione
};
