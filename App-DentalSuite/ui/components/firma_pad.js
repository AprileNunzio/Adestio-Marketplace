import { el } from './dom.js';
import { bottone, spaziatore } from './layout.js';

const LARGHEZZA = 640;
const ALTEZZA = 200;

function contesto(tela) {
    if (!tela || typeof tela.getContext !== 'function') return null;
    const disegno = tela.getContext('2d');
    if (!disegno) return null;
    disegno.lineWidth = 2.2;
    disegno.lineCap = 'round';
    disegno.lineJoin = 'round';
    disegno.strokeStyle = '#0f172a';
    return disegno;
}

function posizione(tela, evento) {
    const riquadro = tela.getBoundingClientRect();
    return {
        x: ((evento.clientX - riquadro.left) / riquadro.width) * LARGHEZZA,
        y: ((evento.clientY - riquadro.top) / riquadro.height) * ALTEZZA
    };
}

export function creaFirmaPad() {
    const tela = el('canvas', { class: 'ds-firma__tela', width: LARGHEZZA, height: ALTEZZA });
    const stato = { disegno: contesto(tela), tracciando: false, vuota: true };

    const avvia = evento => {
        if (!stato.disegno) return;
        stato.tracciando = true;
        stato.vuota = false;
        const punto = posizione(tela, evento);
        stato.disegno.beginPath();
        stato.disegno.moveTo(punto.x, punto.y);
        if (typeof tela.setPointerCapture === 'function' && evento.pointerId !== undefined) {
            tela.setPointerCapture(evento.pointerId);
        }
    };

    const traccia = evento => {
        if (!stato.tracciando || !stato.disegno) return;
        const punto = posizione(tela, evento);
        stato.disegno.lineTo(punto.x, punto.y);
        stato.disegno.stroke();
    };

    const termina = () => {
        stato.tracciando = false;
    };

    if (stato.disegno) {
        tela.addEventListener('pointerdown', avvia);
        tela.addEventListener('pointermove', traccia);
        tela.addEventListener('pointerup', termina);
        tela.addEventListener('pointerleave', termina);
    }

    const pulisci = () => {
        if (!stato.disegno) return;
        stato.disegno.clearRect(0, 0, LARGHEZZA, ALTEZZA);
        stato.vuota = true;
    };

    const nodo = el('div', { class: 'ds-firma' }, [
        el('div', { class: 'ds-firma__area' }, [tela, el('span', { class: 'ds-firma__linea' })]),
        el('div', { class: 'ds-toolbar' }, [
            el('span', { class: 'ds-muted' }, 'Firma nello spazio sopra la linea'),
            spaziatore(),
            bottone({ etichetta: 'Cancella', simbolo: 'ink_eraser', variante: 'ghost', piccolo: true, onClick: pulisci })
        ])
    ]);

    return {
        nodo,
        vuota: () => stato.vuota,
        immagine: () => {
            if (stato.vuota || typeof tela.toDataURL !== 'function') return '';
            return tela.toDataURL('image/png');
        }
    };
}
