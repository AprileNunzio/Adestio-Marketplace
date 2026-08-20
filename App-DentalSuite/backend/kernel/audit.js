'use strict';

const crypto = require('crypto');
const { db, persist, newId, now } = require('./database');

const RITARDO_FLUSH_MS = 8000;
const GENESI = '0'.repeat(64);

let catena = null;
let flushProgrammato = null;

function impronta(riga) {
    return crypto
        .createHash('sha256')
        .update([
            riga.sequenza,
            riga.azione,
            riga.attore_id,
            riga.entita,
            riga.entita_id,
            riga.paziente_id,
            riga.esito,
            riga.codice_errore,
            riga.created_at,
            riga.impronta_precedente
        ].join(''))
        .digest('hex');
}

function caricaCatena() {
    if (catena) return catena;
    try {
        const righe = db().query(
            'SELECT sequenza, impronta FROM log_audit ORDER BY sequenza DESC LIMIT 1',
            []
        );
        catena = righe.length > 0
            ? { sequenza: Number(righe[0].sequenza), impronta: righe[0].impronta }
            : { sequenza: 0, impronta: GENESI };
    } catch (e) {
        catena = { sequenza: 0, impronta: GENESI };
    }
    return catena;
}

function entitaDa(azione) {
    const punto = String(azione).indexOf('.');
    return punto > 0 ? String(azione).slice(0, punto) : String(azione);
}

function identificativoDa(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return String(payload.id || payload.piano_id || payload.preventivo_id || payload.staff_id || '');
}

function programmaFlush() {
    if (flushProgrammato) return;
    flushProgrammato = setTimeout(() => {
        flushProgrammato = null;
        persist().catch(() => {});
    }, RITARDO_FLUSH_MS);
    if (typeof flushProgrammato.unref === 'function') flushProgrammato.unref();
}

function registra(evento) {
    try {
        const stato = caricaCatena();
        const riga = {
            id: newId(),
            sequenza: stato.sequenza + 1,
            azione: evento.azione,
            permesso: evento.permesso || '',
            muta: evento.muta ? 1 : 0,
            attore_id: evento.attoreId || '',
            entita: entitaDa(evento.azione),
            entita_id: identificativoDa(evento.payload),
            paziente_id: (evento.payload && evento.payload.paziente_id) ? String(evento.payload.paziente_id) : '',
            esito: evento.esito,
            codice_errore: evento.codiceErrore || '',
            messaggio: String(evento.messaggio || '').slice(0, 300),
            durata_ms: Number(evento.durataMs) || 0,
            impronta_precedente: stato.impronta,
            created_at: now()
        };
        riga.impronta = impronta(riga);

        const colonne = Object.keys(riga);
        db().run(
            `INSERT INTO log_audit (${colonne.join(', ')}) VALUES (${colonne.map(() => '?').join(', ')})`,
            colonne.map(colonna => riga[colonna])
        );

        catena = { sequenza: riga.sequenza, impronta: riga.impronta };
        if (!evento.muta) programmaFlush();
        return true;
    } catch (e) {
        return false;
    }
}

function verificaCatena(limite) {
    const righe = db().query(
        `SELECT * FROM log_audit ORDER BY sequenza ASC${limite ? ` LIMIT ${Number(limite)}` : ''}`,
        []
    ) || [];

    let precedente = GENESI;
    let attesa = 1;
    const anomalie = [];

    righe.forEach(riga => {
        if (Number(riga.sequenza) !== attesa) {
            anomalie.push({ sequenza: riga.sequenza, tipo: 'sequenza interrotta', atteso: attesa });
        }
        if (riga.impronta_precedente !== precedente) {
            anomalie.push({ sequenza: riga.sequenza, tipo: 'collegamento alla riga precedente non valido' });
        }
        if (impronta(riga) !== riga.impronta) {
            anomalie.push({ sequenza: riga.sequenza, tipo: 'contenuto alterato dopo la scrittura' });
        }
        precedente = riga.impronta;
        attesa = Number(riga.sequenza) + 1;
    });

    return { righe_verificate: righe.length, integra: anomalie.length === 0, anomalie };
}

function reimposta() {
    catena = null;
    if (flushProgrammato) {
        clearTimeout(flushProgrammato);
        flushProgrammato = null;
    }
}

module.exports = { registra, verificaCatena, reimposta, GENESI };
