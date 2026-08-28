import { el, icona } from '../../components/dom.js';
import { bottoneEsterno, importoRapido } from './collegamento.js';

const IMPORTI = [5, 10, 25, 50];
const PAYPAL = 'https://paypal.me/NunzioAprile';

const PROMESSE = [
    ['all_inclusive', 'Nessun canone, mai'],
    ['groups', 'Pazienti e postazioni illimitati'],
    ['lock_open_right', 'Nessuna funzione a pagamento']
];

function promessa([simbolo, testo]) {
    return el('li', { class: 'ds-info__promessa' }, [icona(simbolo), el('span', {}, testo)]);
}

function sostegno() {
    return el('div', { class: 'ds-info__dona' }, [
        el('div', { class: 'ds-info__dona-testa' }, [
            el('span', { class: 'ds-info__dona-icona' }, icona('volunteer_activism')),
            el('div', {}, [
                el('h2', { class: 'ds-info__dona-titolo' }, 'Sostieni il progetto'),
                el('p', { class: 'ds-info__dona-sottotitolo' },
                    'Lo sviluppo, il prontuario e l\'assistenza li porto avanti da solo. Una donazione libera li tiene in vita.')
            ])
        ]),
        el('div', { class: 'ds-info__importi-riga' }, IMPORTI.map(importoRapido)),
        el('div', { class: 'ds-info__azioni' }, [
            bottoneEsterno({
                etichetta: 'Dona ora',
                simbolo: 'favorite',
                indirizzo: PAYPAL,
                nota: 'Apre PayPal: l\'importo lo scegli tu'
            })
        ]),
        el('p', { class: 'ds-info__dona-nota' }, [
            icona('shield'),
            el('span', {}, 'Il pagamento avviene su PayPal. L\'applicazione non vede né conserva alcun dato di pagamento.')
        ])
    ]);
}

export function eroe() {
    return el('header', { class: 'ds-info__eroe', dataset: { rivela: 'true' } }, [
        el('div', { class: 'ds-info__eroe-alone' }),
        el('div', { class: 'ds-info__eroe-corpo' }, [
            el('span', { class: 'ds-info__occhiello' }, [icona('verified'), el('span', {}, 'Software libero per studi odontoiatrici')]),
            el('h1', { class: 'ds-info__titolo' }, 'DentalSuite è gratuita. E resta gratuita.'),
            el('p', { class: 'ds-info__sommario' },
                'Nessuna licenza da rinnovare, nessun limite nascosto, nessun dato dei tuoi pazienti '
                + 'su server altrui. Se ti è utile, puoi contribuire tu a mantenerla viva.'
            ),
            el('ul', { class: 'ds-info__promesse' }, PROMESSE.map(promessa))
        ]),
        sostegno()
    ]);
}
