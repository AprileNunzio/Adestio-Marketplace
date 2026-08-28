import { el, icona } from '../../components/dom.js';

const CAPACITA = [
    ['person_search', 'Cartella clinica completa', 'Anagrafica, anamnesi strutturata, odontogramma FDI, referti e diario delle prestazioni.'],
    ['calendar_month', 'Agenda per poltrona', 'Planning multi-medico con controllo automatico delle sovrapposizioni.'],
    ['monitor', 'Monitor del medico', 'La scheda del paziente arriva in poltrona dalla segreteria, cifrata sulla rete dello studio.'],
    ['prescriptions', 'Prontuario farmaceutico', 'Prescrizioni con principio attivo e confronto con le allergie dichiarate.'],
    ['euro', 'Preventivi e incassi', 'Piani di cura, rateizzazioni, scadenzario e compensi dei collaboratori.'],
    ['shield_lock', 'Tracciabilità', 'Registro accessi, consensi versionati e dati clinici che restano nello studio.']
];

function voce([simbolo, titolo, testo]) {
    return el('li', { class: 'ds-info__capacita-voce' }, [
        el('span', { class: 'ds-info__capacita-icona' }, icona(simbolo)),
        el('div', {}, [
            el('strong', {}, titolo),
            el('span', { class: 'ds-info__capacita-testo' }, testo)
        ])
    ]);
}

export function bloccoApplicazione() {
    return el('section', { class: 'ds-info__scheda', dataset: { rivela: 'true' } }, [
        el('header', { class: 'ds-info__testa' }, [
            icona('dentistry'),
            el('h2', {}, 'Che cos\'è DentalSuite')
        ]),
        el('p', { class: 'ds-info__testo' },
            'Un gestionale completo per lo studio odontoiatrico: clinica, agenda ed economia in un solo posto. '
            + 'Gira sui computer dello studio e i dati dei pazienti restano lì, senza passare da servizi esterni.'
        ),
        el('ul', { class: 'ds-info__capacita' }, CAPACITA.map(voce)),
        el('p', { class: 'ds-info__minuto' },
            'Nessun canone, nessun limite sul numero di pazienti o di postazioni, nessuna funzione a pagamento.'
        )
    ]);
}
