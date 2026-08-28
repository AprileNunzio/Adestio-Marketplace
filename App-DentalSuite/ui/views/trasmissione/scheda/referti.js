import { el, icona } from '../../../components/dom.js';
import { pannello, vuoto, espandi } from './pannello.js';
import * as fmt from '../../../kernel/format.js';

const TIPI_RADIOLOGICI = ['rx', 'opt', 'cbct'];

export function radiologico(tipo) {
    const valore = String(tipo || '').toLowerCase();
    return TIPI_RADIOLOGICI.some(voce => valore.includes(voce));
}

function apriVisualizzatore(referti, indice, serverOrigine) {
    import('../../shared/visualizzatore_diagnostico.js').then(modulo => {
        modulo.apriVisualizzatoreDiagnostico({ referti, indiceIniziale: indice, serverOrigine });
    });
}

export function voceReferto(voce, indice, tutti, serverOrigine) {
    return el('li', {
        class: 'ds-mn__riga ds-mn__riga--cliccabile',
        onClick: () => apriVisualizzatore(tutti, indice, serverOrigine)
    }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo', title: voce.titolo }, [
            icona(radiologico(voce.tipo) ? 'radiology' : 'image'),
            el('span', {}, voce.titolo),
            voce.note ? el('span', { class: 'ds-mn__nota-riga' }, voce.note) : null
        ].filter(Boolean)),
        voce.tipo ? el('span', { class: 'ds-mn__coda' }, String(voce.tipo).toUpperCase()) : null
    ].filter(Boolean));
}

export function pannelloReferti(dossier, { onApriTutto, servitoreInfo }) {
    const voci = dossier.referti || [];
    return pannello({
        titolo: 'Immagini e referti',
        simbolo: 'imagesmode',
        chiave: 'referti',
        conteggio: voci.length,
        azioni: voci.length > 0 ? [espandi('Apri archivio diagnostico', onApriTutto)] : []
    }, voci.length === 0
        ? vuoto('image_not_supported', 'Nessuna immagine in archivio')
        : el('ul', { class: 'ds-mn__elenco' }, voci.map((voce, indice) =>
            voceReferto(voce, indice, voci, servitoreInfo))));
}
