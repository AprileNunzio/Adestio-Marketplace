import { el, icona } from './dom.js';

const DURATA_MS = 4200;
const SIMBOLI = { success: 'check_circle', error: 'error', info: 'info' };

function ospite() {
    let contenitore = document.querySelector('.ds-toast-host');
    if (!contenitore) {
        contenitore = el('div', { class: 'ds-toast-host ds-root' });
        document.body.appendChild(contenitore);
    }
    return contenitore;
}

export function notifica(messaggio, tono = 'info') {
    const nodo = el('div', { class: `ds-toast ds-toast--${tono}` }, [
        icona(SIMBOLI[tono] || SIMBOLI.info),
        el('span', {}, messaggio)
    ]);
    ospite().appendChild(nodo);
    setTimeout(() => nodo.remove(), DURATA_MS);
    return nodo;
}

export function successo(messaggio) {
    return notifica(messaggio, 'success');
}

export function errore(messaggio) {
    return notifica(messaggio, 'error');
}

export function esito(risultato, messaggioSuccesso) {
    if (risultato && risultato.success === true) {
        if (messaggioSuccesso) successo(messaggioSuccesso);
        return true;
    }
    errore((risultato && risultato.error) || 'Operazione non riuscita');
    return false;
}
