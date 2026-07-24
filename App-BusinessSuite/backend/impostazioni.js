'use strict';

const { db, now, persist } = require('./db_utils');

const DEFAULTS = {
    ragione_sociale_azienda: '',
    piva_azienda: '',
    codice_fiscale_azienda: '',
    indirizzo_azienda: '',
    citta_azienda: '',
    cap_azienda: '',
    provincia_azienda: '',
    iva_default: '22',
    margine_default: '30',
    arrotonda_preventivi: 'false',
    termini_pagamento_default: '30 giorni data fattura',
    ritenuta_percentuale_default: '20',
    cassa_previdenziale_percentuale_default: '4'
};

async function getAll() {
    try {
        const rows = db().query('SELECT key_name, key_value FROM impostazioni_business_suite');
        const map = { ...DEFAULTS };
        rows.forEach(r => { map[r.key_name] = r.key_value; });
        return { success: true, data: map };
    } catch (e) {
        console.error('[BusinessSuite:impostazioni] getAll error:', e.message);
        return { success: false, error: e.message };
    }
}

async function setMultiple(event, args = {}) {
    try {
        const ts = now();
        Object.keys(args || {}).forEach(key => {
            const value = String(args[key] === undefined || args[key] === null ? '' : args[key]);
            const existing = db().query('SELECT key_name FROM impostazioni_business_suite WHERE key_name = ?', [key]);
            if (existing.length > 0) {
                db().run('UPDATE impostazioni_business_suite SET key_value = ?, last_modified = ? WHERE key_name = ?', [value, ts, key]);
            } else {
                db().run('INSERT INTO impostazioni_business_suite (key_name, key_value, last_modified) VALUES (?, ?, ?)', [key, value, ts]);
            }
        });
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:impostazioni] setMultiple error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = { getAll, setMultiple };
