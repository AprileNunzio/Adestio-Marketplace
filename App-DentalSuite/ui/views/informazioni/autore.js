import { el, icona } from '../../components/dom.js';
import { bottoneEsterno } from './collegamento.js';

const EMAIL = 'mailto:info@nunziotech.com';

export function bloccoAutore() {
    return el('section', { class: 'ds-info__scheda', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('waving_hand'),
            el('h2', {}, 'Chi sono')
        ]),
        el('p', { class: 'ds-info__testo' },
            'Mi chiamo Nunzio Aprile e sviluppo software con il marchio NunzioTech. '
            + 'DentalSuite nasce da un\'idea semplice: uno studio odontoiatrico non dovrebbe '
            + 'pagare un canone per tenere in ordine le cartelle dei propri pazienti.'
        ),
        el('p', { class: 'ds-info__testo' },
            'La scrivo e la mantengo da solo, ascoltando chi la usa tutti i giorni in poltrona '
            + 'e in segreteria. Ogni segnalazione che mi arriva finisce in una versione successiva.'
        ),
        el('div', { class: 'ds-info__azioni' }, [
            bottoneEsterno({
                etichetta: 'Scrivimi',
                simbolo: 'mail',
                indirizzo: EMAIL,
                variante: 'secondario',
                nota: 'info@nunziotech.com'
            })
        ])
    ]);
}

export function bloccoContatti() {
    const voci = [
        ['mail', 'Email', 'info@nunziotech.com'],
        ['language', 'Sito', 'nunziotech.it'],
        ['engineering', 'Sviluppo', 'NunzioTech']
    ];

    return el('section', { class: 'ds-info__scheda', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('contact_support'),
            el('h2', {}, 'Contatti e assistenza')
        ]),
        el('p', { class: 'ds-info__testo' },
            'Per segnalare un problema, chiedere una funzione o avere una mano nella configurazione '
            + 'dello studio, scrivimi: rispondo personalmente.'
        ),
        el('dl', { class: 'ds-info__contatti' }, voci.flatMap(([simbolo, etichetta, valore]) => [
            el('dt', {}, [icona(simbolo), el('span', {}, etichetta)]),
            el('dd', {}, valore)
        ]))
    ]);
}
