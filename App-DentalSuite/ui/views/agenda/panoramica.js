import { el, rimpiazza } from '../../components/dom.js';
import { pannello, distintivo, spaziatore, vuoto, scheletro } from '../../components/layout.js';
import { fasciaGiornata, legendaFasce } from '../../components/fascia_giornata.js';
import { call } from '../../kernel/transport.js';
import { assicuraFoglio } from '../../kernel/stili.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';

function ore(minuti) {
    return `${Math.round((minuti / 60) * 10) / 10} h`;
}

function riga(voce, onApri) {
    return el('div', { class: 'ds-panoramica__riga' }, [
        el('button', {
            class: 'ds-panoramica__nome',
            type: 'button',
            title: `Filtra l'agenda su ${voce.nominativo}`,
            onClick: () => onApri(voce)
        }, [
            el('span', {}, voce.nominativo),
            el('span', { class: 'ds-muted' }, fmt.etichettaStato(voce.ruolo))
        ]),
        fasciaGiornata({ quadro: voce, compatta: true }),
        el('div', { class: 'ds-panoramica__cifre' }, [
            voce.lavora
                ? distintivo(`${ore(voce.minuti_liberi)} libere`, voce.minuti_liberi > 0 ? 'success' : 'warning')
                : distintivo('non in turno', 'neutral'),
            voce.assenze.length > 0
                ? distintivo(fmt.etichettaStato(voce.assenze[0].tipo), 'danger')
                : null
        ].filter(Boolean))
    ]);
}

export function pannelloPanoramica({ giorno, onApri }) {
    assicuraFoglio('turni');
    const corpo = el('div', {}, scheletro(2));
    const testa = el('div', { class: 'ds-toolbar' }, []);

    const aggiorna = async nuovoGiorno => {
        const data = nuovoGiorno || giorno;
        const righe = elenco(await call('disponibilita.panoramica', { data, durata_minuti: 30 }));
        const inTurno = righe.filter(voce => voce.lavora);

        rimpiazza(testa, [
            el('span', { class: 'ds-muted' }, fmt.data(data)),
            spaziatore(),
            distintivo(`${inTurno.length} in turno su ${righe.length}`, inTurno.length > 0 ? 'info' : 'neutral')
        ]);

        rimpiazza(corpo, righe.length === 0
            ? vuoto({
                titolo: 'Nessun collaboratore registrato',
                testo: 'Registra i collaboratori e dichiara i loro turni per vedere qui la copertura della giornata.',
                simbolo: 'groups'
            })
            : [
                el('div', { class: 'ds-panoramica' }, righe.map(voce => riga(voce, onApri))),
                legendaFasce()
            ]);
    };

    aggiorna(giorno);

    return {
        nodo: pannello({ titolo: 'Chi lavora oggi', azioni: [testa] }, corpo),
        aggiorna
    };
}
