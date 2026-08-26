import { el, icona, rimpiazza } from '../../components/dom.js';
import { adattaAlTelaio } from '../../kernel/telaio.js';

const VOCI_PER_PAGINA = 9;

function tasto({ simbolo, etichetta, titolo, primario = false, tono, disabilitato = false, onClick }) {
    return el('button', {
        class: 'ds-riunito__tasto',
        type: 'button',
        title: titolo || etichetta || '',
        disabled: disabilitato,
        dataset: { primario: primario ? 'true' : 'false', tono: tono || 'neutro' },
        onClick
    }, [simbolo ? icona(simbolo) : null, etichetta || null]);
}

export function tastoRiunito(configurazione) {
    return tasto(configurazione);
}

export function apriLivello({ titolo, sottotitolo, voci = [], rendiVoce, contenuto, perPagina = VOCI_PER_PAGINA }) {
    const pagine = Math.max(Math.ceil(voci.length / perPagina), 1);
    let pagina = 1;

    const corpo = el('div', { class: 'ds-livello__corpo' });
    const indicatore = el('span', { class: 'ds-livello__pagina' }, `1 / ${pagine}`);

    const chiudi = () => {
        document.removeEventListener('keydown', allaTastiera);
        if (livello.parentNode) livello.parentNode.removeChild(livello);
    };

    const allaTastiera = evento => {
        if (evento.key === 'Escape') chiudi();
        if (evento.key === 'ArrowRight') vai(pagina + 1);
        if (evento.key === 'ArrowLeft') vai(pagina - 1);
    };

    const vai = numero => {
        pagina = Math.min(Math.max(numero, 1), pagine);
        indicatore.textContent = `${pagina} / ${pagine}`;
        precedente.disabled = pagina <= 1;
        successiva.disabled = pagina >= pagine;
        if (contenuto) {
            rimpiazza(corpo, contenuto);
            return;
        }
        const inizio = (pagina - 1) * perPagina;
        rimpiazza(corpo, el('ul', { class: 'ds-riunito__elenco' },
            voci.slice(inizio, inizio + perPagina).map(rendiVoce)));
    };

    const precedente = tasto({
        simbolo: 'chevron_left',
        titolo: 'Pagina precedente',
        onClick: () => vai(pagina - 1)
    });
    const successiva = tasto({
        simbolo: 'chevron_right',
        titolo: 'Pagina successiva',
        onClick: () => vai(pagina + 1)
    });

    const livello = el('div', { class: 'ds-root ds-livello', dataset: { accent: 'pazienti' }, role: 'dialog', 'aria-modal': 'true' }, [
        el('header', { class: 'ds-livello__testa' }, [
            el('div', {}, [
                el('h2', { class: 'ds-livello__titolo' }, titolo),
                sottotitolo ? el('p', { class: 'ds-attesa__testo' }, sottotitolo) : null
            ]),
            tasto({ simbolo: 'close', etichetta: 'Chiudi', onClick: chiudi })
        ]),
        corpo,
        el('footer', { class: 'ds-livello__piede' }, contenuto ? [] : [precedente, indicatore, successiva])
    ]);

    adattaAlTelaio(livello);
    document.body.appendChild(livello);
    document.addEventListener('keydown', allaTastiera);
    vai(1);

    return chiudi;
}
