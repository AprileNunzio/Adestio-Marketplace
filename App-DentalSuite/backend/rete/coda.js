'use strict';

const { coda } = require('../repositories/rete');
const { tableExists } = require('../kernel/database');

const IN_ATTESA = 'in_attesa';
const CONSEGNATO = 'consegnato';
const SOSPESO = 'sospeso';
const TENTATIVI_MASSIMI = 20;

function disponibile() {
    return tableExists('rete_coda');
}

async function accoda(destinatarioId, tipo, contenuto) {
    if (!disponibile()) return null;
    return coda.insert({
        destinatario_id: destinatarioId || '',
        tipo,
        contenuto: JSON.stringify(contenuto === undefined ? null : contenuto),
        tentativi: 0,
        stato: IN_ATTESA,
        ultimo_errore: ''
    });
}

function inAttesa() {
    if (!disponibile()) return [];
    return coda
        .findAll({ where: { stato: IN_ATTESA }, ordina: 'created_at ASC' })
        .map(riga => ({ ...riga, contenuto: interpreta(riga.contenuto) }));
}

function interpreta(testo) {
    try {
        return JSON.parse(testo);
    } catch (e) {
        return null;
    }
}

async function segnaConsegnato(id) {
    await coda.update(id, { stato: CONSEGNATO, ultimo_errore: '' });
    return { id };
}

async function segnaFallito(riga, errore) {
    const tentativi = Number(riga.tentativi) + 1;
    await coda.update(riga.id, {
        tentativi,
        ultimo_errore: String(errore || '').slice(0, 240),
        stato: tentativi >= TENTATIVI_MASSIMI ? SOSPESO : IN_ATTESA
    });
    return { id: riga.id, tentativi };
}

async function svuota(consegnaSingola) {
    const pendenti = inAttesa();
    let consegnati = 0;
    for (const riga of pendenti) {
        try {
            await consegnaSingola(riga);
            await segnaConsegnato(riga.id);
            consegnati += 1;
        } catch (errore) {
            await segnaFallito(riga, errore.message);
            break;
        }
    }
    return { consegnati, residui: inAttesa().length };
}

function riepilogo() {
    if (!disponibile()) return { in_attesa: 0, sospesi: 0 };
    return {
        in_attesa: coda.count({ where: { stato: IN_ATTESA } }),
        sospesi: coda.count({ where: { stato: SOSPESO } })
    };
}

module.exports = { accoda, inAttesa, svuota, riepilogo, segnaConsegnato, segnaFallito, IN_ATTESA, SOSPESO };
