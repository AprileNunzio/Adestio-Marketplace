import { el, icona } from '../../components/dom.js';

export function hubSceltaModalita({
    monitorOnline = 0,
    postazione = null,
    puoTrasmettere = true,
    puoRicevere = true,
    onScegliTrasmetti,
    onScegliRicevi
}) {
    const cardTrasmetti = el('button', {
        class: `ds-hub-card ${puoTrasmettere ? 'ds-hub-card--attiva' : 'ds-hub-card--disabilitata'}`,
        type: 'button',
        disabled: !puoTrasmettere,
        onClick: () => {
            if (puoTrasmettere && typeof onScegliTrasmetti === 'function') {
                onScegliTrasmetti();
            }
        }
    }, [
        el('div', { class: 'ds-hub-card__icona ds-hub-card__icona--trasmetti' }, icona('cast_connected')),
        el('div', { class: 'ds-hub-card__titolo' }, 'Trasmetti'),
        el('div', { class: 'ds-hub-card__descrizione' },
            'Invia in tempo reale la cartella clinica di un paziente a uno o più monitor attivi dello studio.'
        ),
        el('div', { class: 'ds-hub-card__piede' }, [
            el('span', {
                class: `ds-hub-card__badge ${monitorOnline > 0 ? 'ds-hub-card__badge--online' : 'ds-hub-card__badge--offline'}`
            }, [
                el('span', { class: 'ds-hub-card__punto' }),
                monitorOnline > 0 ? `${monitorOnline} monitor online` : 'Nessun monitor collegato'
            ]),
            !puoTrasmettere
                ? el('span', { class: 'ds-hub-card__avviso-permesso' }, 'Permesso trasmissione_invia richiesto')
                : null
        ].filter(Boolean))
    ]);

    const cardRicevi = el('button', {
        class: `ds-hub-card ${puoRicevere ? 'ds-hub-card--attiva' : 'ds-hub-card--disabilitata'}`,
        type: 'button',
        disabled: !puoRicevere,
        onClick: () => {
            if (puoRicevere && typeof onScegliRicevi === 'function') {
                onScegliRicevi();
            }
        }
    }, [
        el('div', { class: 'ds-hub-card__icona ds-hub-card__icona--ricevi' }, icona('desktop_windows')),
        el('div', { class: 'ds-hub-card__titolo' }, 'Ricevi (Monitor del Medico)'),
        el('div', { class: 'ds-hub-card__descrizione' },
            'Visualizza la cartella clinica del paziente a schermo intero live con interfaccia ottimizzata per il touch.'
        ),
        el('div', { class: 'ds-hub-card__piede' }, [
            el('span', { class: 'ds-hub-card__badge ds-hub-card__badge--postazione' }, [
                icona('place'),
                postazione ? postazione.nome : 'Seleziona postazione'
            ]),
            !puoRicevere
                ? el('span', { class: 'ds-hub-card__avviso-permesso' }, 'Permesso trasmissione_ricevi richiesto')
                : null
        ].filter(Boolean))
    ]);

    return el('div', { class: 'ds-hub-scelta' }, [
        el('div', { class: 'ds-hub-scelta__griglia' }, [
            cardTrasmetti,
            cardRicevi
        ])
    ]);
}
