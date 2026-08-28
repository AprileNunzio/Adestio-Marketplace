'use strict';

const identita = require('../identita');

function testo(valore) {
    return String(valore === null || valore === undefined ? '' : valore).trim();
}

function attivo(valore) {
    return Number(valore) === 1;
}

function residenza(paziente) {
    const via = testo(paziente.indirizzo);
    const comune = [testo(paziente.cap), testo(paziente.citta)].filter(Boolean).join(' ');
    const provincia = testo(paziente.provincia);
    return [via, comune, provincia ? `(${provincia})` : ''].filter(Boolean).join(', ');
}

function recapiti(paziente) {
    return {
        telefono: testo(paziente.telefono),
        email: testo(paziente.email),
        residenza: residenza(paziente),
        canale_preferito: testo(paziente.canale_preferito)
    };
}

function emergenza(paziente) {
    const nome = testo(paziente.contatto_emergenza_nome);
    const parentela = testo(paziente.contatto_emergenza_parentela);
    const telefono = testo(paziente.contatto_emergenza_tel);
    return {
        nome,
        parentela,
        telefono,
        presente: Boolean(nome || telefono),
        sintesi: [nome, parentela, telefono].filter(Boolean).join(' · ')
    };
}

function curante(paziente) {
    return {
        nome: testo(paziente.medico_curante),
        telefono: testo(paziente.tel_medico_curante)
    };
}

function amministrativo(paziente) {
    return {
        assicurazione: testo(paziente.assicurazione),
        numero_polizza: testo(paziente.numero_polizza),
        professione: testo(paziente.professione),
        stato_civile: testo(paziente.stato_civile),
        esenzioni: testo(paziente.esenzioni)
    };
}

function privacy(paziente) {
    return {
        consenso_privacy: attivo(paziente.consenso_privacy),
        data_consenso_privacy: testo(paziente.data_consenso_privacy),
        consenso_promemoria: attivo(paziente.consenso_promemoria)
    };
}

function componi(paziente) {
    const contatto = emergenza(paziente);
    return {
        id: paziente.id,
        nominativo: identita.nominativo(paziente),
        secondo_nome: testo(paziente.secondo_nome),
        eta: identita.eta(paziente.data_nascita),
        minore: identita.isMinore(paziente.data_nascita),
        sesso: testo(paziente.sesso),
        data_nascita: testo(paziente.data_nascita),
        luogo_nascita: testo(paziente.luogo_nascita),
        codice_fiscale: testo(paziente.codice_fiscale),
        gruppo_sanguigno: testo(paziente.gruppo_sanguigno),
        pacemaker: attivo(paziente.pacemaker),
        recapiti: recapiti(paziente),
        emergenza: contatto,
        medico_curante_scheda: curante(paziente),
        amministrativo: amministrativo(paziente),
        privacy: privacy(paziente),
        note: testo(paziente.note),
        telefono: testo(paziente.telefono),
        medico_curante: testo(paziente.medico_curante),
        esenzioni: testo(paziente.esenzioni),
        contatto_emergenza: contatto.sintesi
    };
}

module.exports = { componi };
