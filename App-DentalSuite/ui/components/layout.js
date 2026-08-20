import { el, icona } from './dom.js';

export function radice(accento, contenuto) {
    return el('div', { class: 'ds-root', dataset: { accent: accento } }, contenuto);
}

export function intestazione({ titolo, sottotitolo, simbolo, indietro, azioni = [] }) {
    const testa = [];
    if (indietro) {
        testa.push(el('button', {
            class: 'ds-btn ds-btn--ghost ds-btn--icon',
            title: 'Torna indietro',
            onClick: indietro
        }, icona('arrow_back')));
    }
    if (simbolo) {
        testa.push(el('div', { class: 'ds-header__mark' }, icona(simbolo)));
    }
    testa.push(el('div', {}, [
        el('h2', { class: 'ds-header__title' }, titolo),
        sottotitolo ? el('p', { class: 'ds-header__subtitle' }, sottotitolo) : null
    ]));

    return el('header', { class: 'ds-header' }, [
        el('div', { class: 'ds-header__lead' }, testa),
        azioni.length > 0 ? el('div', { class: 'ds-header__actions' }, azioni) : null
    ]);
}

export function pannello({ titolo, azioni = [], flush = false }, contenuto) {
    const testa = titolo
        ? el('div', { class: 'ds-panel__head' }, [
            el('span', {}, titolo),
            azioni.length > 0 ? el('div', { class: 'ds-toolbar' }, azioni) : null
        ])
        : null;
    return el('section', { class: 'ds-panel' }, [
        testa,
        el('div', { class: flush ? 'ds-panel__body ds-panel__body--flush' : 'ds-panel__body' }, contenuto)
    ]);
}

export function griglia(variante, contenuto) {
    return el('div', { class: `ds-grid ds-grid--${variante}` }, contenuto);
}

export function scheda({ titolo, descrizione, simbolo, disabilitata = false, onApri }) {
    return el('button', {
        class: 'ds-card',
        type: 'button',
        'aria-disabled': disabilitata ? 'true' : 'false',
        disabled: disabilitata,
        onClick: disabilitata ? null : onApri
    }, [
        el('div', { class: 'ds-card__icon' }, icona(simbolo)),
        el('div', { class: 'ds-card__title' }, titolo),
        el('div', { class: 'ds-card__desc' }, descrizione),
        disabilitata ? el('span', { class: 'ds-badge ds-badge--neutral' }, 'Accesso non autorizzato') : null
    ]);
}

export function statistica({ etichetta, valore, nota, tono }) {
    const classi = ['ds-stat'];
    if (tono === 'positivo') classi.push('ds-stat--positive');
    if (tono === 'negativo') classi.push('ds-stat--negative');
    return el('div', { class: classi.join(' ') }, [
        el('span', { class: 'ds-stat__label' }, etichetta),
        el('span', { class: 'ds-stat__value ds-numeric' }, valore),
        nota ? el('span', { class: 'ds-stat__hint' }, nota) : null
    ]);
}

export function vuoto({ titolo, testo, simbolo = 'inbox', azione }) {
    return el('div', { class: 'ds-empty' }, [
        icona(simbolo),
        el('div', { class: 'ds-empty__title' }, titolo),
        testo ? el('div', { class: 'ds-empty__text' }, testo) : null,
        azione ? el('div', { class: 'ds-empty__azione' }, azione) : null
    ]);
}

export function avviso({ tono = 'info', simbolo = 'info', titolo, voci = [] }) {
    const classi = ['ds-alert'];
    if (tono === 'danger') classi.push('ds-alert--danger');
    if (tono === 'warning') classi.push('ds-alert--warning');
    return el('div', { class: classi.join(' ') }, [
        icona(simbolo),
        el('div', {}, [
            titolo ? el('strong', {}, titolo) : null,
            voci.length > 0
                ? el('ul', { class: 'ds-alert__list' }, voci.map(voce => el('li', {}, voce)))
                : null
        ])
    ]);
}

export function scheletro(righe = 4) {
    return el('div', { class: 'ds-panel__body' },
        Array.from({ length: righe }, () => el('div', { class: 'ds-skeleton ds-skeleton--row' })));
}

export function barra(contenuto) {
    return el('div', { class: 'ds-toolbar' }, contenuto);
}

export function spaziatore() {
    return el('div', { class: 'ds-toolbar__spacer' });
}

export function bottone({ etichetta, simbolo, variante = 'primario', piccolo = false, disabilitato = false, titolo, onClick }) {
    const classi = ['ds-btn'];
    if (variante === 'ghost') classi.push('ds-btn--ghost');
    if (variante === 'danger') classi.push('ds-btn--danger');
    if (piccolo) classi.push('ds-btn--sm');
    if (!etichetta) classi.push('ds-btn--icon');
    return el('button', {
        class: classi.join(' '),
        type: 'button',
        title: titolo || etichetta || '',
        disabled: disabilitato,
        onClick
    }, [simbolo ? icona(simbolo) : null, etichetta || null]);
}

export function distintivo(etichetta, tono = 'neutral') {
    return el('span', { class: `ds-badge ds-badge--${tono}` }, etichetta);
}

export function coppie(voci) {
    return el('div', { class: 'ds-kv' }, voci
        .filter(voce => voce)
        .map(voce => el('div', {}, [
            el('div', { class: 'ds-kv__label' }, voce.etichetta),
            el('div', { class: 'ds-kv__value' }, voce.valore || '—')
        ])));
}
