import { versione } from './moduli.js';

const caricati = new Set();

export function assicuraFoglio(nome) {
    if (caricati.has(nome)) return true;
    const indirizzo = new URL(`../../css/${nome}.css`, import.meta.url);
    const collegamento = document.createElement('link');
    collegamento.rel = 'stylesheet';
    collegamento.href = `${indirizzo.href}${versione()}`;
    collegamento.dataset.dsFoglio = nome;
    document.head.appendChild(collegamento);
    caricati.add(nome);
    return true;
}
