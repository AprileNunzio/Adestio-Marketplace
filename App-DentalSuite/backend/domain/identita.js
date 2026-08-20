'use strict';

const PATTERN = /^[A-Z]{6}\d{2}[ABCDEHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$/;

const DISPARI = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
    N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23
};

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function valorePari(carattere) {
    return carattere >= '0' && carattere <= '9'
        ? carattere.charCodeAt(0) - 48
        : carattere.charCodeAt(0) - 65;
}

function normalizza(valore) {
    return String(valore || '').trim().toUpperCase().replace(/\s/g, '');
}

function caratteroreControllo(primiQuindici) {
    let somma = 0;
    for (let indice = 0; indice < 15; indice += 1) {
        const carattere = primiQuindici[indice];
        somma += (indice % 2 === 0) ? DISPARI[carattere] : valorePari(carattere);
    }
    return ALFABETO[somma % 26];
}

function validaCodiceFiscale(valore) {
    const codice = normalizza(valore);
    if (codice.length === 0) return { valido: true, vuoto: true, errore: null };
    if (codice.length !== 16) return { valido: false, vuoto: false, errore: 'Il codice fiscale deve avere 16 caratteri' };
    if (!PATTERN.test(codice)) return { valido: false, vuoto: false, errore: 'Formato del codice fiscale non valido' };
    if (caratteroreControllo(codice.slice(0, 15)) !== codice[15]) {
        return { valido: false, vuoto: false, errore: 'Carattere di controllo del codice fiscale errato' };
    }
    return { valido: true, vuoto: false, errore: null };
}

function nominativo(persona) {
    return [persona.cognome, persona.nome, persona.secondo_nome]
        .map(parte => String(parte || '').trim())
        .filter(Boolean)
        .join(' ');
}

function eta(dataNascitaIso, riferimento = new Date()) {
    if (!dataNascitaIso) return null;
    const nascita = new Date(`${dataNascitaIso}T00:00:00`);
    if (Number.isNaN(nascita.getTime())) return null;
    let anni = riferimento.getFullYear() - nascita.getFullYear();
    const meseDelta = riferimento.getMonth() - nascita.getMonth();
    if (meseDelta < 0 || (meseDelta === 0 && riferimento.getDate() < nascita.getDate())) anni -= 1;
    return anni >= 0 ? anni : null;
}

function isMinore(dataNascitaIso) {
    const anni = eta(dataNascitaIso);
    return anni !== null && anni < 18;
}

module.exports = { validaCodiceFiscale, normalizza, nominativo, eta, isMinore };
