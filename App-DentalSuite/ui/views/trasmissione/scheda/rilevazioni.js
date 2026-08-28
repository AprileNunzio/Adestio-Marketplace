import { el } from '../../../components/dom.js';
import { pannello, vuoto } from './pannello.js';
import * as fmt from '../../../kernel/format.js';

function raggruppaPerData(voci) {
    const gruppi = new Map();
    for (const voce of voci) {
        const chiave = voce.data_rilevazione || '';
        if (!gruppi.has(chiave)) gruppi.set(chiave, []);
        gruppi.get(chiave).push(voce);
    }
    return [...gruppi.entries()];
}

function descrizioneDente(voce) {
    return [
        voce.numero_dente,
        fmt.etichettaStato(voce.stato),
        voce.superfici,
        voce.materiale
    ].filter(Boolean).join(' · ');
}

function gruppoRilevazioni(data, elementi) {
    return el('div', { class: 'ds-mn__gruppo' }, [
        el('div', { class: 'ds-mn__gruppo-testa' }, [
            el('time', {}, fmt.data(data)),
            el('span', { class: 'ds-mn__gruppo-conta' }, `${elementi.length} elementi`)
        ]),
        el('div', { class: 'ds-mn__denti' }, elementi.map(voce => el('span', {
            class: 'ds-mn__dente-chip',
            dataset: { stato: voce.stato },
            title: descrizioneDente(voce)
        }, [
            el('strong', {}, String(voce.numero_dente)),
            el('span', {}, fmt.etichettaStato(voce.stato))
        ])))
    ]);
}

export function pannelloRilevazioni(dossier) {
    const voci = dossier.rilevazioni || [];
    return pannello({
        titolo: 'Cronologia odontogramma',
        simbolo: 'history_edu',
        chiave: 'rilevazioni',
        conteggio: voci.length
    }, voci.length === 0
        ? vuoto('info', 'Nessuna rilevazione registrata')
        : raggruppaPerData(voci).map(([data, elementi]) => gruppoRilevazioni(data, elementi)));
}
