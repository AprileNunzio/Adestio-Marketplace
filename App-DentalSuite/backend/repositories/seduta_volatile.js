'use strict';

const INATTIVITA_MS = 20 * 60 * 1000;
const ATTESA_MASSIMA_MS = 20000;

let stato = { versione: 0, dossier: null, ricevutoIl: 0, trasmissioneId: '', origine: '' };
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

function riponi(dossier, dettagli = {}) {
    stato = {
        versione: stato.versione + 1,
        dossier,
        ricevutoIl: Date.now(),
        trasmissioneId: dettagli.trasmissione_id || '',
        origine: dettagli.origine || ''
    };
    programmaScadenza();
    notifica();
    return stato.versione;
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
    notifica();
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

module.exports = { riponi, svuota, tocca, istantanea, attendi, INATTIVITA_MS };
