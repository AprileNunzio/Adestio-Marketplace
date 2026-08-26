import { el, icona, rimpiazza } from '../../components/dom.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { zona } from './zone.js';
import { apriLivello, tastoRiunito } from './livello.js';

const ZOOM_MINIMO = 0.25;
const ZOOM_MASSIMO = 8;
const PASSO_ZOOM = 1.35;

const SIMBOLI = {
    opt: 'dentistry',
    cbct: 'view_in_ar',
    tac: 'view_in_ar',
    rmn: 'magnet',
    rx_endorale: 'radiology',
    teleradiografia: 'radiology',
    foto: 'photo_camera',
    referto: 'description',
    consenso: 'assignment_turned_in',
    altro: 'attach_file'
};

function pesoLeggibile(byte) {
    const valore = Number(byte) || 0;
    if (valore >= 1048576) return `${Math.round((valore / 1048576) * 10) / 10} MB`;
    if (valore >= 1024) return `${Math.round(valore / 1024)} kB`;
    return `${valore} byte`;
}

function creaVisore(contenuto, titolo) {
    const stato = { zoom: 1, x: 0, y: 0, trascina: null };

    const immagine = el('img', {
        class: 'ds-visore__immagine',
        src: contenuto.contenuto,
        alt: titolo,
        draggable: false
    });

    const tela = el('div', { class: 'ds-visore__tela' }, immagine);
    const indicatore = el('span', { class: 'ds-visore__zoom ds-numeric' }, '100%');

    const applica = () => {
        immagine.style.transform = `translate(${stato.x}px, ${stato.y}px) scale(${stato.zoom})`;
        indicatore.textContent = `${Math.round(stato.zoom * 100)}%`;
    };

    const scala = fattore => {
        stato.zoom = Math.min(Math.max(stato.zoom * fattore, ZOOM_MINIMO), ZOOM_MASSIMO);
        applica();
    };

    const adatta = () => {
        stato.zoom = 1;
        stato.x = 0;
        stato.y = 0;
        applica();
    };

    tela.addEventListener('pointerdown', evento => {
        stato.trascina = { x: evento.clientX - stato.x, y: evento.clientY - stato.y };
        tela.setPointerCapture(evento.pointerId);
    });
    tela.addEventListener('pointermove', evento => {
        if (!stato.trascina) return;
        stato.x = evento.clientX - stato.trascina.x;
        stato.y = evento.clientY - stato.trascina.y;
        applica();
    });
    tela.addEventListener('pointerup', () => { stato.trascina = null; });
    tela.addEventListener('pointercancel', () => { stato.trascina = null; });
    tela.addEventListener('dblclick', () => (stato.zoom > 1 ? adatta() : scala(2.2)));
    tela.addEventListener('wheel', evento => {
        evento.preventDefault();
        scala(evento.deltaY < 0 ? PASSO_ZOOM : 1 / PASSO_ZOOM);
    }, { passive: false });

    applica();

    return {
        nodo: el('div', { class: 'ds-visore' }, [
            tela,
            el('div', { class: 'ds-riunito__azioni' }, [
                tastoRiunito({ simbolo: 'zoom_out', titolo: 'Riduci', onClick: () => scala(1 / PASSO_ZOOM) }),
                tastoRiunito({ simbolo: 'zoom_in', titolo: 'Ingrandisci', onClick: () => scala(PASSO_ZOOM) }),
                tastoRiunito({ simbolo: 'fit_screen', etichetta: 'Adatta', onClick: adatta }),
                indicatore
            ])
        ])
    };
}

function documentoNonImmagine(contenuto, titolo) {
    return el('div', { class: 'ds-visore' }, el('object', {
        class: 'ds-visore__documento',
        data: contenuto.contenuto,
        type: contenuto.mime
    }, el('p', { class: 'ds-attesa__testo' }, `${titolo}: anteprima non disponibile su questa postazione.`)));
}

async function apriReferto(referto) {
    const attesa = el('div', { class: 'ds-visore ds-visore--attesa' }, [
        icona('cloud_download'),
        el('p', { class: 'ds-attesa__testo' }, `Sto ricevendo ${referto.titolo} dalla segreteria…`)
    ]);

    const chiudi = apriLivello({
        titolo: referto.titolo,
        sottotitolo: `${fmt.etichettaStato(referto.tipo)} · ${fmt.data(referto.data)} · ${pesoLeggibile(referto.dimensione)}`,
        contenuto: attesa
    });

    const risposta = await call('trasmissioni.scaricaAllegato', { id: referto.id });
    const contenuto = oggetto(risposta, null);

    if (!contenuto) {
        rimpiazza(attesa, [
            icona('error'),
            el('p', { class: 'ds-attesa__testo' },
                (risposta && risposta.error) || 'Referto non disponibile su questa postazione.')
        ]);
        return chiudi;
    }

    const corpo = contenuto.immagine
        ? creaVisore(contenuto, referto.titolo).nodo
        : documentoNonImmagine(contenuto, referto.titolo);

    if (attesa.parentNode) attesa.parentNode.replaceChild(corpo, attesa);
    return chiudi;
}

export function zonaGalleria(dossier, quanti) {
    const voci = dossier.referti.slice(0, quanti || dossier.referti.length);

    return zona({
        titolo: `Immagini e referti · ${dossier.referti.length}`,
        simbolo: 'photo_library',
        modificatore: 'galleria',
        fitto: true
    }, voci.length === 0
        ? el('div', { class: 'ds-riunito__sereno' }, [icona('info'), 'Nessuna immagine in archivio'])
        : el('div', { class: 'ds-galleria' }, voci.map(voce => el('button', {
            class: 'ds-galleria__voce',
            type: 'button',
            title: `${voce.titolo} · ${fmt.data(voce.data)}`,
            onClick: () => apriReferto(voce)
        }, [
            el('span', { class: 'ds-galleria__icona' }, icona(SIMBOLI[voce.tipo] || SIMBOLI.altro)),
            el('span', { class: 'ds-galleria__titolo' }, voce.titolo),
            el('span', { class: 'ds-galleria__meta' }, `${fmt.data(voce.data)} · ${pesoLeggibile(voce.dimensione)}`)
        ]))));
}
