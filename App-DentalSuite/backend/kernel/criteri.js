'use strict';

const { validationError } = require('./errors');

const IDENTIFICATORE = /^[a-z_][a-z0-9_]*$/;
const DIREZIONI = ['ASC', 'DESC'];
const DIMENSIONE_PREDEFINITA = 50;
const DIMENSIONE_MASSIMA = 500;

const OPERATORI = {
    eq: (colonna) => ({ frammento: `${colonna} = ?`, valori: valore => [valore] }),
    ne: (colonna) => ({ frammento: `${colonna} <> ?`, valori: valore => [valore] }),
    lt: (colonna) => ({ frammento: `${colonna} < ?`, valori: valore => [valore] }),
    lte: (colonna) => ({ frammento: `${colonna} <= ?`, valori: valore => [valore] }),
    gt: (colonna) => ({ frammento: `${colonna} > ?`, valori: valore => [valore] }),
    gte: (colonna) => ({ frammento: `${colonna} >= ?`, valori: valore => [valore] }),
    contiene: (colonna) => ({
        frammento: `${colonna} LIKE ? ESCAPE '\\'`,
        valori: valore => [`%${scappa(valore)}%`]
    }),
    inizia: (colonna) => ({
        frammento: `${colonna} LIKE ? ESCAPE '\\'`,
        valori: valore => [`${scappa(valore)}%`]
    }),
    vuoto: (colonna) => ({ frammento: `(${colonna} IS NULL OR ${colonna} = '')`, valori: () => [] }),
    valorizzato: (colonna) => ({ frammento: `(${colonna} IS NOT NULL AND ${colonna} <> '')`, valori: () => [] })
};

function scappa(valore) {
    return String(valore === undefined || valore === null ? '' : valore)
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
}

function assertColonna(colonna, ammesse) {
    const nome = String(colonna || '');
    if (!IDENTIFICATORE.test(nome)) {
        throw validationError(`Colonna non valida nel criterio: ${colonna}`);
    }
    if (Array.isArray(ammesse) && ammesse.length > 0 && !ammesse.includes(nome)) {
        throw validationError(`Colonna non consentita nel criterio: ${colonna}`);
    }
    return nome;
}

function frammentoIn(colonna, valore) {
    const elenco = Array.isArray(valore) ? valore : [valore];
    if (elenco.length === 0) return { frammento: '1 = 0', valori: [] };
    return {
        frammento: `${colonna} IN (${elenco.map(() => '?').join(', ')})`,
        valori: elenco
    };
}

function frammentoFra(colonna, valore) {
    const coppia = Array.isArray(valore) ? valore : [valore, valore];
    if (coppia.length !== 2) throw validationError(`L'operatore "fra" richiede due estremi su ${colonna}`);
    return { frammento: `${colonna} BETWEEN ? AND ?`, valori: [coppia[0], coppia[1]] };
}

function frammentoSemplice(colonna, operatore, valore) {
    const costruttore = OPERATORI[operatore];
    if (!costruttore) throw validationError(`Operatore sconosciuto nel criterio: ${operatore}`);
    const definizione = costruttore(colonna);
    return { frammento: definizione.frammento, valori: definizione.valori(valore) };
}

function frammentoDi(colonna, operatore, valore) {
    if (operatore === 'in') return frammentoIn(colonna, valore);
    if (operatore === 'fra') return frammentoFra(colonna, valore);
    return frammentoSemplice(colonna, operatore, valore);
}

function normalizza(filtri) {
    if (!filtri) return [];
    if (Array.isArray(filtri)) return filtri.filter(Boolean);
    return Object.keys(filtri).map(colonna => ({ colonna, operatore: 'eq', valore: filtri[colonna] }));
}

function gruppoOppure(voce, ammesse) {
    const interni = normalizza(voce.oppure).map(voceInterna => singolo(voceInterna, ammesse));
    if (interni.length === 0) return null;
    return {
        frammento: `(${interni.map(parte => parte.frammento).join(' OR ')})`,
        valori: interni.reduce((tutti, parte) => tutti.concat(parte.valori), [])
    };
}

function singolo(voce, ammesse) {
    if (voce && voce.oppure) return gruppoOppure(voce, ammesse);
    const colonna = assertColonna(voce.colonna, ammesse);
    return frammentoDi(colonna, voce.operatore || 'eq', voce.valore);
}

function costruisci(filtri, ammesse) {
    const parti = normalizza(filtri).map(voce => singolo(voce, ammesse)).filter(Boolean);
    if (parti.length === 0) return { sql: '', parametri: [] };
    return {
        sql: parti.map(parte => `AND ${parte.frammento}`).join(' '),
        parametri: parti.reduce((tutti, parte) => tutti.concat(parte.valori), [])
    };
}

function ordinamento(valore, ammesse, predefinito) {
    if (!valore) return predefinito;
    const voci = String(valore).split(',').map(voce => voce.trim()).filter(Boolean);
    const compilate = voci.map(voce => {
        const pezzi = voce.split(/\s+/);
        const colonna = assertColonna(pezzi[0], ammesse);
        const direzione = String(pezzi[1] || 'ASC').toUpperCase();
        if (!DIREZIONI.includes(direzione)) {
            throw validationError(`Direzione di ordinamento non valida: ${pezzi[1]}`);
        }
        return `${colonna} ${direzione}`;
    });
    return compilate.length > 0 ? compilate.join(', ') : predefinito;
}

function finestra(criteri = {}) {
    const dimensioneGrezza = Number(criteri.dimensione || criteri.limit || DIMENSIONE_PREDEFINITA);
    const dimensione = Math.min(
        Math.max(Number.isFinite(dimensioneGrezza) ? Math.trunc(dimensioneGrezza) : DIMENSIONE_PREDEFINITA, 1),
        DIMENSIONE_MASSIMA
    );
    const paginaGrezza = Number(criteri.pagina || 1);
    const pagina = Math.max(Number.isFinite(paginaGrezza) ? Math.trunc(paginaGrezza) : 1, 1);
    const scarto = criteri.offset !== undefined ? Math.max(Number(criteri.offset) || 0, 0) : (pagina - 1) * dimensione;
    return { pagina, dimensione, scarto };
}

module.exports = {
    costruisci,
    ordinamento,
    finestra,
    assertColonna,
    DIMENSIONE_PREDEFINITA,
    DIMENSIONE_MASSIMA
};
