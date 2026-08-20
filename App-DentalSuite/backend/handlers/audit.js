'use strict';

const { db } = require('../kernel/database');
const auditKernel = require('../kernel/audit');
const { validationError } = require('../kernel/errors');

const LIMITE_PREDEFINITO = 100;
const LIMITE_MASSIMO = 500;

function condizioni(filtro) {
    const clausole = [];
    const parametri = [];

    if (filtro.dal) {
        clausole.push('created_at >= ?');
        parametri.push(Number(filtro.dal));
    }
    if (filtro.al) {
        clausole.push('created_at <= ?');
        parametri.push(Number(filtro.al));
    }
    if (filtro.attore_id) {
        clausole.push('attore_id = ?');
        parametri.push(String(filtro.attore_id));
    }
    if (filtro.paziente_id) {
        clausole.push('paziente_id = ?');
        parametri.push(String(filtro.paziente_id));
    }
    if (filtro.esito) {
        clausole.push('esito = ?');
        parametri.push(String(filtro.esito));
    }
    if (filtro.entita) {
        clausole.push('entita = ?');
        parametri.push(String(filtro.entita));
    }
    if (filtro.solo_mutazioni === true) {
        clausole.push('muta = 1');
    }

    return {
        dove: clausole.length > 0 ? `WHERE ${clausole.join(' AND ')}` : '',
        parametri
    };
}

function list(payload = {}) {
    const limite = Math.min(Number(payload.limite) || LIMITE_PREDEFINITO, LIMITE_MASSIMO);
    const scarto = Math.max(0, Number(payload.scarto) || 0);
    const { dove, parametri } = condizioni(payload);

    const righe = db().query(
        `SELECT * FROM log_audit ${dove} ORDER BY sequenza DESC LIMIT ? OFFSET ?`,
        [...parametri, limite, scarto]
    ) || [];

    const conteggio = db().query(
        `SELECT COUNT(*) AS totale FROM log_audit ${dove}`,
        parametri
    ) || [];

    return {
        righe,
        totale: conteggio.length > 0 ? Number(conteggio[0].totale) : 0,
        limite,
        scarto
    };
}

function riepilogo(payload = {}) {
    const { dove, parametri } = condizioni(payload);

    const perEsito = db().query(
        `SELECT esito, COUNT(*) AS totale FROM log_audit ${dove} GROUP BY esito`,
        parametri
    ) || [];

    const perEntita = db().query(
        `SELECT entita, COUNT(*) AS totale FROM log_audit ${dove} GROUP BY entita ORDER BY totale DESC LIMIT 12`,
        parametri
    ) || [];

    const perAttore = db().query(
        `SELECT attore_id, COUNT(*) AS totale FROM log_audit ${dove} GROUP BY attore_id ORDER BY totale DESC LIMIT 12`,
        parametri
    ) || [];

    const negati = db().query(
        `SELECT azione, permesso, COUNT(*) AS totale FROM log_audit ${dove}${dove ? ' AND' : ' WHERE'} esito = 'negato'
         GROUP BY azione, permesso ORDER BY totale DESC LIMIT 12`,
        parametri
    ) || [];

    return {
        per_esito: perEsito.map(riga => ({ etichetta: riga.esito, totale: Number(riga.totale) })),
        per_entita: perEntita.map(riga => ({ etichetta: riga.entita, totale: Number(riga.totale) })),
        per_attore: perAttore.map(riga => ({ etichetta: riga.attore_id || 'non identificato', totale: Number(riga.totale) })),
        accessi_negati: negati.map(riga => ({
            azione: riga.azione,
            permesso: riga.permesso,
            totale: Number(riga.totale)
        }))
    };
}

function verificaIntegrita(payload = {}) {
    const limite = payload.limite ? Number(payload.limite) : null;
    if (limite !== null && (!Number.isFinite(limite) || limite <= 0)) {
        throw validationError('Limite di verifica non valido');
    }
    return auditKernel.verificaCatena(limite);
}

module.exports = { list, riepilogo, verificaIntegrita };
