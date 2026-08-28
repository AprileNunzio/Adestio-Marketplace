import { el, icona } from '../../components/dom.js';
import { bottone, distintivo } from '../../components/layout.js';

const PRESENTAZIONE = {
    offline: {
        etichetta: 'Non raggiungibile',
        tono: 'warning',
        bordo: 'var(--ds-warning, #b45309)'
    },
    seduta: {
        etichetta: 'In Seduta',
        tono: 'info',
        bordo: 'var(--ds-info, #2563eb)'
    },
    pronto: {
        etichetta: 'Pronto',
        tono: 'success',
        bordo: 'var(--ds-accent, #0d9488)'
    }
};

function chiaveStato(voce) {
    if (voce.online === false) return 'offline';
    return voce.in_seduta ? 'seduta' : 'pronto';
}

function rigaPaziente(voce, colore) {
    return el('div', { style: `color: ${colore}; font-weight: 600; font-size: 0.88rem;` }, [
        icona('person', { style: 'font-size: 16px; vertical-align: middle; margin-right: 4px;' }),
        `Paziente: ${voce.paziente_nome || 'Paziente in visita'}`
    ]);
}

function rigaNota(testo) {
    return el('div', { class: 'ds-muted', style: 'font-size: 0.84rem;' }, testo);
}

function corpoStato(voce, chiave) {
    if (chiave === 'offline') {
        return el('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
            rigaPaziente(voce, 'var(--ds-warning, #b45309)'),
            rigaNota('Il monitor non risponde in rete. Chiudi la seduta per liberare la poltrona.')
        ]);
    }
    if (chiave === 'seduta') {
        return rigaPaziente(voce, 'var(--ds-info, #2563eb)');
    }
    return rigaNota('Pronto per la ricezione della cartella clinica');
}

function comandi(voce, chiave, onInvia, onChiudi) {
    const invia = bottone({
        etichetta: chiave === 'pronto' ? 'Invia Paziente' : 'Cambia Paziente',
        simbolo: chiave === 'pronto' ? 'send' : 'swap_horiz',
        variante: 'primario',
        piccolo: true,
        disabilitato: chiave === 'offline',
        titolo: chiave === 'offline' ? 'Monitor non raggiungibile in rete' : '',
        onClick: () => onInvia(voce)
    });

    const chiudi = chiave === 'pronto' ? null : bottone({
        etichetta: 'Chiudi Seduta',
        simbolo: 'stop_circle',
        variante: 'ghost',
        piccolo: true,
        onClick: () => onChiudi(voce)
    });

    return el('div', { class: 'ds-toolbar', style: 'margin-top: 8px;' }, [invia, chiudi].filter(Boolean));
}

export function schedaMonitor({ voce, onInvia, onChiudi }) {
    const chiave = chiaveStato(voce);
    const stile = PRESENTAZIONE[chiave];

    return el('div', {
        class: 'ds-panel',
        style: `border: 2px solid ${stile.bordo}; display: flex; flex-direction: column; justify-content: space-between;`
    }, [
        el('div', { class: 'ds-panel__head' }, [
            el('div', { style: 'display: flex; align-items: center; gap: 8px; min-width: 0;' }, [
                icona('monitor'),
                el('strong', {}, voce.etichetta || voce.poltrona_nome || voce.nome || 'Monitor dello studio')
            ]),
            distintivo(stile.etichetta, stile.tono)
        ]),
        el('div', { class: 'ds-panel__body', style: 'gap: 8px;' }, [
            el('div', { class: 'ds-muted ds-numeric', style: 'font-size: 0.8rem;' },
                [voce.nome, voce.indirizzo].filter(Boolean).join(' · ') || 'Rete locale LAN'),
            corpoStato(voce, chiave),
            comandi(voce, chiave, onInvia, onChiudi)
        ])
    ]);
}
