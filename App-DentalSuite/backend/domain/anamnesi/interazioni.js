'use strict';

const LUNGHEZZA_MINIMA = 4;
const SEPARATORI = /[\/,;()\[\]]+/;

function normalizza(valore) {
    return String(valore === null || valore === undefined ? '' : valore)
        .toLowerCase()
        .replace(/[^a-zà-ù0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function radice(parola) {
    return parola.replace(/(e|i|o|a|he|ne|ni|ina|ine|ico|ici)$/u, '');
}

function terminiDa(testo) {
    return String(testo || '')
        .split(SEPARATORI)
        .map(normalizza)
        .flatMap(pezzo => pezzo.split(' '))
        .filter(parola => parola.length >= LUNGHEZZA_MINIMA)
        .map(radice)
        .filter(parola => parola.length >= LUNGHEZZA_MINIMA - 1);
}

function fontiAllergiche(anamnesi) {
    if (!anamnesi) return [];
    const fonti = [];

    for (const voce of anamnesi.allergie || []) {
        fonti.push({ etichetta: voce.etichetta, livello: voce.livello, origine: 'allergia' });
    }
    for (const voce of anamnesi.intolleranze || []) {
        fonti.push({ etichetta: voce.etichetta, livello: voce.livello, origine: 'intolleranza' });
    }
    if (anamnesi.allergie_farmaci) {
        fonti.push({ etichetta: anamnesi.allergie_farmaci, livello: 'critica', origine: 'allergia dichiarata' });
    }
    if (anamnesi.intolleranze_testo) {
        fonti.push({ etichetta: anamnesi.intolleranze_testo, livello: 'attenzione', origine: 'intolleranza dichiarata' });
    }

    return fonti.map(fonte => ({ ...fonte, termini: new Set(terminiDa(fonte.etichetta)) }));
}

function avvisiPer(prescrizione, fonti) {
    const termini = terminiDa(`${prescrizione.farmaco} ${prescrizione.principio_attivo}`);
    if (termini.length === 0) return [];

    const avvisi = [];
    for (const fonte of fonti) {
        const comuni = termini.filter(parola => fonte.termini.has(parola));
        if (comuni.length === 0) continue;
        avvisi.push({
            livello: fonte.livello,
            origine: fonte.origine,
            riferimento: fonte.etichetta,
            motivo: `Corrispondenza con ${fonte.origine}: ${fonte.etichetta}`
        });
    }
    return avvisi;
}

function annota(prescrizioni, anamnesi) {
    const fonti = fontiAllergiche(anamnesi);
    if (fonti.length === 0) {
        return prescrizioni.map(voce => ({ ...voce, avvisi: [] }));
    }
    return prescrizioni.map(voce => ({ ...voce, avvisi: avvisiPer(voce, fonti) }));
}

module.exports = { annota, terminiDa };
