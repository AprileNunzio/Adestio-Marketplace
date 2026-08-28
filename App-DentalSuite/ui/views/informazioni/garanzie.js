import { el, icona } from '../../components/dom.js';

const GARANZIE = [
    ['€ 0', 'di canone', 'payments', 'positivo'],
    ['AES-256', 'su archivio e canale', 'enhanced_encryption', 'sicuro'],
    ['0 byte', 'inviati fuori dallo studio', 'cloud_off', 'positivo'],
    ['SHA-256', 'sul registro accessi', 'fingerprint', 'sicuro']
];

const SPECIFICHE = [
    ['Cifratura del carico', 'AES-256-GCM'],
    ['Scambio di chiave', 'X25519 effimera'],
    ['Derivazione', 'HKDF-SHA256'],
    ['Firma dei messaggi', 'Ed25519'],
    ['Registro accessi', 'catena SHA-256'],
    ['Archivio a riposo', 'AES-256-GCM'],
    ['Chiave archivio', 'scrypt + DPAPI']
];

function garanzia([valore, etichetta, simbolo, tono]) {
    return el('li', { class: 'ds-info__garanzia', dataset: { tono } }, [
        el('span', { class: 'ds-info__garanzia-icona' }, icona(simbolo)),
        el('strong', { class: 'ds-info__garanzia-valore' }, valore),
        el('span', { class: 'ds-info__garanzia-eti' }, etichetta)
    ]);
}

function specifica([etichetta, valore]) {
    return el('div', { class: 'ds-info__spec' }, [
        el('span', { class: 'ds-info__spec-eti' }, etichetta),
        el('code', { class: 'ds-info__spec-val' }, valore)
    ]);
}

export function fasciaGaranzie() {
    return el('ul', { class: 'ds-info__garanzie', dataset: { rivela: 'true' } }, GARANZIE.map(garanzia));
}

export function schedaSpecifiche() {
    return el('section', { class: 'ds-info__scheda', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('terminal'),
            el('h2', {}, 'Le tecnologie, in chiaro')
        ]),
        el('p', { class: 'ds-info__testo' },
            'Non ti chiedo di fidarti sulla parola: questi sono gli algoritmi che il programma usa davvero, '
            + 'tutti standard pubblici e verificabili.'
        ),
        el('div', { class: 'ds-info__specifiche' }, SPECIFICHE.map(specifica))
    ]);
}
