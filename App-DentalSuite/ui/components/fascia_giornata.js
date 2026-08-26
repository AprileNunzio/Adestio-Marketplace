import { el } from './dom.js';
import { assicuraFoglio } from '../kernel/stili.js';

const APERTURA = 7 * 60;
const CHIUSURA = 21 * 60;

function percentuale(minuti, dal, al) {
    return ((minuti - dal) / (al - dal)) * 100;
}

function segmento(fascia, genere, dal, al, titolo) {
    const inizio = Math.max(fascia.inizio, dal);
    const fine = Math.min(fascia.fine, al);
    if (fine <= inizio) return null;
    const nodo = el('div', { class: 'ds-fascia__segmento', dataset: { genere }, title: titolo || fascia.etichetta || '' });
    nodo.style.left = `${percentuale(inizio, dal, al)}%`;
    nodo.style.width = `${percentuale(fine, dal, al) - percentuale(inizio, dal, al)}%`;
    return nodo;
}

function tacche(dal, al, passo) {
    const voci = [];
    for (let minuti = Math.ceil(dal / passo) * passo; minuti <= al; minuti += passo) {
        const nodo = el('span', { class: 'ds-fascia__tacca' }, `${String(Math.floor(minuti / 60)).padStart(2, '0')}`);
        nodo.style.left = `${percentuale(minuti, dal, al)}%`;
        voci.push(nodo);
    }
    return voci;
}

export function fasciaGiornata({ quadro, dal, al, passo = 120, compatta = false }) {
    assicuraFoglio('turni');
    const inizio = dal === undefined ? APERTURA : dal;
    const fine = al === undefined ? CHIUSURA : al;

    const strati = [
        ...(quadro.fasce_lavoro || []).map(fascia =>
            segmento(fascia, 'lavoro', inizio, fine, `Orario di lavoro ${fascia.etichetta}`)),
        ...(quadro.assenze || []).map(fascia =>
            segmento(fascia, 'assenza', inizio, fine, `${fascia.tipo} ${fascia.etichetta}`)),
        ...(quadro.occupazioni || []).map(fascia =>
            segmento(fascia, 'occupato', inizio, fine,
                `Occupato ${fascia.etichetta}${fascia.paziente ? ` · ${fascia.paziente}` : ''}`))
    ].filter(Boolean);

    return el('div', { class: compatta ? 'ds-fascia ds-fascia--compatta' : 'ds-fascia' }, [
        el('div', { class: 'ds-fascia__pista' }, strati),
        compatta ? null : el('div', { class: 'ds-fascia__scala' }, tacche(inizio, fine, passo))
    ].filter(Boolean));
}

export function legendaFasce() {
    return el('div', { class: 'ds-fascia__legenda' }, [
        ['lavoro', 'In turno'],
        ['occupato', 'Occupato'],
        ['assenza', 'Assenza']
    ].map(([genere, etichetta]) => el('span', { class: 'ds-fascia__voce' }, [
        el('span', { class: 'ds-fascia__pastiglia', dataset: { genere } }),
        etichetta
    ])));
}
