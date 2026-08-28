import { el, icona } from '../../../components/dom.js';

export function pannello({ titolo, simbolo, chiave, conteggio = null, azioni = [], pieno = false }, contenuto) {
    return el('section', {
        class: `ds-mn__pannello ds-mn__pannello--${chiave}`,
        dataset: { pieno: pieno ? 'true' : 'false' }
    }, [
        el('header', { class: 'ds-mn__testa' }, [
            simbolo ? icona(simbolo) : null,
            el('span', { class: 'ds-mn__testa-titolo' }, titolo),
            conteggio !== null ? el('span', { class: 'ds-mn__conteggio' }, String(conteggio)) : null,
            azioni.length > 0 ? el('span', { class: 'ds-mn__testa-azioni' }, azioni) : null
        ].filter(Boolean)),
        el('div', { class: 'ds-mn__corpo' }, contenuto)
    ]);
}

export function vuoto(simbolo, testo) {
    return el('div', { class: 'ds-mn__vuoto' }, [icona(simbolo), el('span', {}, testo)]);
}

export function espandi(titolo, onClick) {
    return el('button', {
        class: 'ds-mn__mini',
        type: 'button',
        title: titolo,
        onClick
    }, icona('open_in_full'));
}

export function riga(quando, titolo, coda, tono) {
    return el('li', { class: 'ds-mn__riga', dataset: tono ? { tono } : {} }, [
        el('time', { class: 'ds-mn__quando' }, quando),
        el('span', { class: 'ds-mn__titolo', title: typeof titolo === 'string' ? titolo : '' }, titolo),
        coda ? el('span', { class: 'ds-mn__coda' }, coda) : null
    ].filter(Boolean));
}

export function coppia(etichetta, valore) {
    if (!valore) return null;
    return el('div', { class: 'ds-mn__coppia' }, [
        el('span', { class: 'ds-mn__coppia-eti' }, etichetta),
        el('span', { class: 'ds-mn__coppia-val' }, String(valore))
    ]);
}

export function marcatore(etichetta, livello, titolo) {
    return el('span', {
        class: 'ds-mn__marcatore',
        dataset: { livello: livello || 'nota' },
        title: titolo || etichetta
    }, etichetta);
}

export function blocchetto(titolo, contenuto) {
    if (!contenuto) return null;
    return el('div', { class: 'ds-mn__blocchetto' }, [
        el('span', { class: 'ds-mn__blocchetto-eti' }, titolo),
        el('p', { class: 'ds-mn__blocchetto-testo' }, contenuto)
    ]);
}
