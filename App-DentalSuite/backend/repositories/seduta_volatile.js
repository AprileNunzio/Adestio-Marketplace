'use strict';

const INATTIVITA_MS = 20 * 60 * 1000;
const ATTESA_MASSIMA_MS = 20000;

let stato = { versione: 0, dossier: null, ricevutoIl: 0, trasmissioneId: '', origine: '' };
let sorgente = null;
let scadenza = null;
const inAscolto = new Set();

function notifica() {
    const attuale = istantanea();
    [...inAscolto].forEach(voce => {
        inAscolto.delete(voce);
        clearTimeout(voce.sveglia);
        voce.risolvi(attuale);
    });
}

function programmaScadenza() {
    if (scadenza) clearTimeout(scadenza);
    scadenza = setTimeout(() => {
        scadenza = null;
        svuota('inattività della postazione');
    }, INATTIVITA_MS);
    if (typeof scadenza.unref === 'function') scadenza.unref();
}

function riponi(dossier, dettagli = {}, mittenteNuovo) {
    stato = {
        versione: stato.versione + 1,
        dossier,
        ricevutoIl: Date.now(),
        trasmissioneId: dettagli.trasmissione_id || '',
        origine: dettagli.origine || ''
    };
    if (mittenteNuovo && mittenteNuovo.ip) {
        sorgente = { ip: mittenteNuovo.ip, porta: Number(mittenteNuovo.porta) || 7345 };
    }
    verificataIl = Date.now();
    contattoIl = Date.now();
    programmaScadenza();
    notifica();
    try {
        const scopertaMesh = require('../rete/scoperta_mesh');
        scopertaMesh.diffondiStatoLive();
    } catch (_) {}
    return stato.versione;
}

let verificataIl = 0;
let contattoIl = 0;

function mittente() {
    return sorgente ? { ...sorgente } : null;
}

function daVerificare(intervalloMs) {
    if (!stato.dossier || !sorgente || !stato.trasmissioneId) return false;
    return Date.now() - verificataIl >= intervalloMs;
}

function segnaContatto() {
    contattoIl = Date.now();
    return contattoIl;
}

function silenzioDa() {
    if (!stato.dossier || !contattoIl) return 0;
    return Date.now() - contattoIl;
}

function presente() {
    return Boolean(stato.dossier);
}

function segnaVerificata() {
    verificataIl = Date.now();
    return verificataIl;
}

function estrai() {
    return istantanea();
}

function svuota(motivo) {
    if (scadenza) {
        clearTimeout(scadenza);
        scadenza = null;
    }
    stato = {
        versione: stato.versione + 1,
        dossier: null,
        ricevutoIl: 0,
        trasmissioneId: '',
        origine: motivo || ''
    };
    sorgente = null;
    verificataIl = 0;
    contattoIl = 0;
    notifica();
    try {
        const scopertaMesh = require('../rete/scoperta_mesh');
        scopertaMesh.diffondiStatoLive();
    } catch (_) {}
    return stato.versione;
}

function tocca() {
    if (stato.dossier) programmaScadenza();
    return stato.versione;
}

function istantanea() {
    return {
        versione: stato.versione,
        presente: Boolean(stato.dossier),
        ricevuto_il: stato.ricevutoIl,
        trasmissione_id: stato.trasmissioneId,
        origine: stato.origine,
        servitore_info: sorgente ? { ...sorgente } : null,
        dossier: stato.dossier
    };
}

function attendi(versioneNota) {
    const nota = Number(versioneNota);
    if (!Number.isFinite(nota) || nota !== stato.versione) {
        return Promise.resolve(istantanea());
    }
    return new Promise(risolvi => {
        const voce = { risolvi, sveglia: null };
        voce.sveglia = setTimeout(() => {
            inAscolto.delete(voce);
            risolvi(istantanea());
        }, ATTESA_MASSIMA_MS);
        if (typeof voce.sveglia.unref === 'function') voce.sveglia.unref();
        inAscolto.add(voce);
    });
}

function applicaReperto(datiDente) {
    try {
        if (!stato.dossier || !stato.dossier.odontogramma) return false;
        const codice = String(datiDente.numero_dente || datiDente.dente_fdi || datiDente.dente || '');
        if (!codice) return false;

        stato.dossier.odontogramma.denti = stato.dossier.odontogramma.denti || {};
        const superf = Array.isArray(datiDente.superfici)
            ? datiDente.superfici
            : (datiDente.superfici ? String(datiDente.superfici).split(',').filter(Boolean) : []);

        stato.dossier.odontogramma.denti[codice] = {
            ...(stato.dossier.odontogramma.denti[codice] || {}),
            ...datiDente,
            numero_dente: codice,
            stato: datiDente.stato || 'sano',
            superfici: superf,
            aggiornato_il: Date.now()
        };

        stato.versione += 1;
        programmaScadenza();
        notifica();
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = { riponi, svuota, tocca, istantanea, estrai, attendi, mittente, daVerificare, segnaVerificata, segnaContatto, silenzioDa, presente, applicaReperto, INATTIVITA_MS };
