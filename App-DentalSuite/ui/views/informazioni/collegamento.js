import { el, icona } from '../../components/dom.js';
import { call } from '../../kernel/transport.js';
import { errore } from '../../components/notifica.js';

async function apriEsterno(indirizzo) {
    try {
        const risposta = await call('collegamenti.apri', { indirizzo });
        if (!risposta || risposta.success !== true) {
            errore((risposta && risposta.error) || 'Collegamento non disponibile');
        }
    } catch (eccezione) {
        errore(eccezione.message || 'Impossibile aprire il collegamento');
    }
}

export function bottoneEsterno({ etichetta, simbolo, indirizzo, variante = 'primario', nota }) {
    const classi = ['ds-info__azione'];
    if (variante !== 'primario') classi.push(`ds-info__azione--${variante}`);

    return el('button', {
        class: classi.join(' '),
        type: 'button',
        title: nota || etichetta,
        onClick: () => apriEsterno(indirizzo)
    }, [
        icona(simbolo),
        el('span', {}, etichetta)
    ]);
}

export function importoRapido(valore) {
    return el('button', {
        class: 'ds-info__importo',
        type: 'button',
        title: `Dona ${valore} euro`,
        onClick: () => apriEsterno(`https://paypal.me/NunzioAprile/${valore}`)
    }, `${valore} €`);
}
