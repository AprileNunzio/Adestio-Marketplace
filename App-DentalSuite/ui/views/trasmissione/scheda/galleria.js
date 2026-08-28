import { el, icona } from '../../../components/dom.js';
import { call } from '../../../kernel/transport.js';
import { errore } from '../../../components/notifica.js';
import * as fmt from '../../../kernel/format.js';
import { radiologico } from './referti.js';

function apriVisualizzatore(referti, indice, serverOrigine) {
    import('../../shared/visualizzatore_diagnostico.js').then(modulo => {
        modulo.apriVisualizzatoreDiagnostico({ referti, indiceIniziale: indice, serverOrigine });
    });
}

async function apriEsterno(id) {
    try {
        await call('allegati.open', { id });
    } catch (eccezione) {
        errore(eccezione.message || 'Impossibile aprire il file esterno');
    }
}

function simboloDi(voce) {
    if (radiologico(voce.tipo)) return 'radiology';
    return String(voce.mime_type || '').includes('pdf') ? 'description' : 'imagesmode';
}

function cartaReferto(voce, indice, tutti, serverOrigine) {
    return el('article', { class: 'ds-mn__carta-referto', dataset: { radiologico: radiologico(voce.tipo) ? 'true' : 'false' } }, [
        el('header', { class: 'ds-mn__carta-testa' }, [
            el('span', { class: 'ds-mn__carta-tipo' }, voce.tipo || 'Esame'),
            el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data))
        ]),
        el('div', { class: 'ds-mn__carta-corpo' }, [
            el('span', { class: 'ds-mn__carta-icona' }, icona(simboloDi(voce))),
            el('strong', { class: 'ds-mn__carta-titolo', title: voce.titolo }, voce.titolo)
        ]),
        voce.note ? el('p', { class: 'ds-mn__carta-note' }, voce.note) : null,
        el('div', { class: 'ds-mn__carta-azioni' }, [
            el('button', {
                class: 'ds-btn ds-btn--primario',
                type: 'button',
                onClick: () => apriVisualizzatore(tutti, indice, serverOrigine)
            }, [icona('visibility'), 'Visualizza']),
            el('button', {
                class: 'ds-btn ds-btn--ghost',
                type: 'button',
                title: 'Apri file esterno',
                onClick: () => apriEsterno(voce.id)
            }, icona('open_in_new'))
        ])
    ].filter(Boolean));
}

export function galleriaReferti(referti, serverOrigine) {
    return el('div', { class: 'ds-mn__galleria' },
        referti.map((voce, indice) => cartaReferto(voce, indice, referti, serverOrigine)));
}
