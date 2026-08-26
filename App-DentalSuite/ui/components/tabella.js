import { el } from './dom.js';
import { vuoto } from './layout.js';

function cella(colonna, riga) {
    const contenuto = colonna.rendi ? colonna.rendi(riga) : riga[colonna.campo];
    return el('td', {
        dataset: colonna.numerica ? { numeric: 'true' } : {},
        class: colonna.classe || null
    }, contenuto === null || contenuto === undefined || contenuto === '' ? '—' : contenuto);
}

export function tabella({ colonne, righe, onRiga, vuotoTitolo, vuotoTesto, vuotoSimbolo, vuotoAzione }) {
    if (!righe || righe.length === 0) {
        return vuoto({
            titolo: vuotoTitolo || 'Nessun dato disponibile',
            testo: vuotoTesto,
            simbolo: vuotoSimbolo || 'inbox',
            azione: vuotoAzione
        });
    }

    const testa = el('thead', {}, el('tr', {}, colonne.map(colonna =>
        el('th', { dataset: colonna.numerica ? { numeric: 'true' } : {} }, colonna.titolo))));

    const corpo = el('tbody', {}, righe.map(riga => el('tr', {
        dataset: onRiga ? { clickable: 'true' } : {},
        onClick: onRiga ? evento => {
            if (evento.target.closest('button')) return;
            onRiga(riga);
        } : null
    }, colonne.map(colonna => cella(colonna, riga)))));

    return el('div', { class: 'ds-table-wrap' }, el('table', { class: 'ds-table' }, [testa, corpo]));
}

export function azioniRiga(bottoni) {
    return el('div', { class: 'ds-table__actions' }, bottoni.filter(Boolean));
}
