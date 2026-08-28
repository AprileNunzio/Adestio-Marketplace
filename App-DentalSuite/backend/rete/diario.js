'use strict';

const CAPIENZA = 200;

const voci = [];
let contatore = 0;

function annota(contesto, errore, dettagli) {
    contatore += 1;
    voci.push({
        numero: contatore,
        istante: Date.now(),
        contesto: String(contesto || 'rete'),
        messaggio: errore && errore.message ? errore.message : String(errore || ''),
        codice: (errore && errore.code) || '',
        dettagli: dettagli || null
    });
    while (voci.length > CAPIENZA) voci.shift();
    return contatore;
}

function recenti(quante = 50) {
    const limite = Math.max(1, Math.min(Number(quante) || 50, CAPIENZA));
    return voci.slice(-limite).reverse();
}

function perContesto() {
    const conteggi = new Map();
    for (const voce of voci) {
        conteggi.set(voce.contesto, (conteggi.get(voce.contesto) || 0) + 1);
    }
    return [...conteggi.entries()]
        .map(([contesto, quante]) => ({ contesto, quante }))
        .sort((prima, seconda) => seconda.quante - prima.quante);
}

function riepilogo() {
    return {
        totale: contatore,
        in_memoria: voci.length,
        capienza: CAPIENZA,
        per_contesto: perContesto(),
        ultimo: voci.length > 0 ? voci[voci.length - 1] : null
    };
}

function svuota() {
    voci.length = 0;
    contatore = 0;
}

module.exports = { annota, recenti, riepilogo, perContesto, svuota, CAPIENZA };
