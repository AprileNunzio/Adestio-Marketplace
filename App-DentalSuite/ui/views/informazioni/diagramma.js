import { el, icona } from '../../components/dom.js';

const SVG = 'http://www.w3.org/2000/svg';

function nodo(tag, attributi = {}, figli = []) {
    const elemento = document.createElementNS(SVG, tag);
    for (const [chiave, valore] of Object.entries(attributi)) {
        elemento.setAttribute(chiave, String(valore));
    }
    for (const figlio of figli) elemento.appendChild(figlio);
    return elemento;
}

function testo(x, y, contenuto, classe) {
    const elemento = nodo('text', { x, y, class: classe });
    elemento.textContent = contenuto;
    return elemento;
}

function postazione(x, etichetta, ruolo) {
    return nodo('g', {}, [
        nodo('rect', { x, y: 46, width: 132, height: 74, rx: 12, class: 'ds-dia__scatola' }),
        testo(x + 66, 76, etichetta, 'ds-dia__eti'),
        testo(x + 66, 98, ruolo, 'ds-dia__sub')
    ]);
}

function canale() {
    return nodo('g', {}, [
        nodo('path', { d: 'M 164 83 L 268 83', class: 'ds-dia__canale' }),
        nodo('path', { d: 'M 164 83 L 268 83', class: 'ds-dia__flusso' }),
        nodo('rect', { x: 178, y: 60, width: 76, height: 22, rx: 11, class: 'ds-dia__sigillo' }),
        testo(216, 75, 'AES-256', 'ds-dia__sigillo-eti')
    ]);
}

function recinto() {
    return nodo('g', {}, [
        nodo('rect', { x: 8, y: 16, width: 416, height: 124, rx: 18, class: 'ds-dia__recinto' }),
        testo(24, 36, 'RETE DELLO STUDIO', 'ds-dia__recinto-eti')
    ]);
}

function nuvolaEsclusa() {
    return nodo('g', {}, [
        nodo('path', {
            d: 'M 470 74 a 22 22 0 0 1 42 -10 a 18 18 0 0 1 26 18 a 15 15 0 0 1 -4 29 h -56 a 19 19 0 0 1 -8 -37 z',
            class: 'ds-dia__nuvola'
        }),
        nodo('path', { d: 'M 462 46 L 548 116', class: 'ds-dia__sbarra' }),
        testo(504, 136, 'nessun server esterno', 'ds-dia__sub')
    ]);
}

function collegamentoInterrotto() {
    return nodo('path', { d: 'M 424 83 L 458 83', class: 'ds-dia__interrotto' });
}

export function diagrammaFlusso() {
    const svg = nodo('svg', {
        viewBox: '0 0 566 156',
        class: 'ds-dia',
        role: 'img',
        'aria-label': 'La cartella clinica viaggia cifrata fra segreteria e monitor sulla rete dello studio, senza uscire verso server esterni'
    }, [
        recinto(),
        postazione(32, 'Segreteria', 'archivio pazienti'),
        canale(),
        postazione(268, 'Monitor', 'poltrona del medico'),
        collegamentoInterrotto(),
        nuvolaEsclusa()
    ]);

    return el('section', { class: 'ds-info__scheda ds-info__scheda--diagramma', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('account_tree'),
            el('h2', {}, 'Dove passano davvero i dati')
        ]),
        el('div', { class: 'ds-info__diagramma' }, svg),
        el('p', { class: 'ds-info__minuto' },
            'La cartella si muove solo fra i computer dello studio, dentro una busta cifrata che '
            + 'può aprire soltanto il monitor a cui è destinata. Fuori da quel perimetro non va niente.'
        )
    ]);
}
