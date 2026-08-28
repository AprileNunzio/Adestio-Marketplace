import { el } from '../../../components/dom.js';
import { pannello, vuoto, espandi } from './pannello.js';
import * as fmt from '../../../kernel/format.js';

export function voceTrattamento(voce) {
    return el('li', { class: 'ds-mn__riga' }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo', title: voce.descrizione }, [
            voce.dente ? el('strong', { class: 'ds-mn__dente-rif' }, `d.${voce.dente}`) : null,
            el('span', {}, voce.descrizione),
            voce.anestesia ? el('span', { class: 'ds-mn__nota-riga' }, `Anestesia: ${voce.anestesia}`) : null,
            voce.note ? el('span', { class: 'ds-mn__nota-riga' }, voce.note) : null
        ].filter(Boolean)),
        el('span', { class: 'ds-mn__coda' }, fmt.etichettaStato(voce.stato))
    ]);
}

export function pannelloStoria(dossier, { onApriTutto }) {
    const voci = dossier.trattamenti || [];
    return pannello({
        titolo: 'Storia clinica',
        simbolo: 'history',
        chiave: 'storia',
        conteggio: voci.length,
        azioni: voci.length > 0 ? [espandi('Apri tutti i trattamenti', onApriTutto)] : []
    }, voci.length === 0
        ? vuoto('info', 'Nessun trattamento registrato')
        : el('ul', { class: 'ds-mn__elenco' }, voci.map(voceTrattamento)));
}
