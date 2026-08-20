const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function getAll(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const query = (args && args.query ? String(args.query).trim() : '');
        let rows;
        if (query) {
            const like = `%${query}%`;
            rows = d.query(
                "SELECT * FROM pazienti WHERE is_deleted = 0 AND (nome LIKE ? OR cognome LIKE ? OR codice_fiscale LIKE ? OR telefono LIKE ?) ORDER BY cognome, nome LIMIT 50",
                [like, like, like, like]
            );
        } else {
            rows = d.query("SELECT * FROM pazienti WHERE is_deleted = 0 ORDER BY cognome, nome LIMIT 100");
        }
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getById(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query("SELECT * FROM pazienti WHERE id = ? AND is_deleted = 0", [id]);
        if (!rows || rows.length === 0) return { success: false, error: 'Paziente non trovato' };
        const paziente = rows[0];
        const anamnesi = d.query("SELECT * FROM anamnesi WHERE paziente_id = ? AND is_deleted = 0 LIMIT 1", [id]);
        const odontogramma = d.query("SELECT * FROM odontogramma WHERE paziente_id = ? AND is_deleted = 0", [id]);
        const trattamenti = d.query("SELECT * FROM trattamenti_paziente WHERE paziente_id = ? AND is_deleted = 0 ORDER BY data_trattamento DESC", [id]);
        const prescrizioni = d.query("SELECT * FROM prescrizioni_farmaci WHERE paziente_id = ? AND is_deleted = 0 ORDER BY data_prescrizione DESC", [id]);
        const allegati = d.query("SELECT * FROM allegati_diagnostici WHERE paziente_id = ? AND is_deleted = 0 ORDER BY data_esame DESC", [id]);
        const pagamenti = d.query("SELECT * FROM pagamenti_incassi WHERE paziente_id = ? AND is_deleted = 0 ORDER BY data_pagamento DESC", [id]);
        return {
            success: true,
            data: {
                paziente,
                anamnesi: anamnesi && anamnesi.length > 0 ? anamnesi[0] : null,
                odontogramma: odontogramma || [],
                trattamenti: trattamenti || [],
                prescrizioni: prescrizioni || [],
                allegati: allegati || [],
                pagamenti: pagamenti || []
            }
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function create(event, payload = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const nome = String(payload.nome || '').trim();
        const cognome = String(payload.cognome || '').trim();
        const codice_fiscale = String(payload.codice_fiscale || '').trim().toUpperCase();
        if (!nome || !cognome) return { success: false, error: 'Nome e Cognome sono obbligatori' };
        const id = crypto.randomUUID();
        const now = Date.now();
        d.run(
            "INSERT INTO pazienti (id, codice_fiscale, nome, cognome, data_nascita, luogo_nascita, sesso, telefono, email, indirizzo, cap, citta, provincia, esenzioni, assicurazione, gruppo_sanguigno, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, codice_fiscale, nome, cognome,
                payload.data_nascita || '', payload.luogo_nascita || '', payload.sesso || '',
                payload.telefono || '', payload.email || '', payload.indirizzo || '',
                payload.cap || '', payload.citta || '', payload.provincia || '',
                payload.esenzioni || '', payload.assicurazione || '', payload.gruppo_sanguigno || '',
                payload.note || '', now, now
            ]
        );
        const anamnesiId = crypto.randomUUID();
        d.run(
            "INSERT INTO anamnesi (id, paziente_id, allergie_farmaci, patologie_cardiovascolari, terapia_anticoagulanti, diabete, ipertensione, epatiti_hiv, fumatore, gravidanza, ansia_odontoiatrica, altre_patologie, terapie_in_corso, note_mediche, data_compilazione, last_modified, is_deleted) VALUES (?, ?, '', 0, 0, 0, 0, 0, 0, 0, 0, '', '', '', '', ?, 0)",
            [anamnesiId, id, now]
        );
        await persist();
        return { success: true, data: { id, nome, cognome, codice_fiscale } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function update(event, payload = {}) {
    try {
        const { id } = payload || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const nome = String(payload.nome || '').trim();
        const cognome = String(payload.cognome || '').trim();
        const codice_fiscale = String(payload.codice_fiscale || '').trim().toUpperCase();
        if (!nome || !cognome) return { success: false, error: 'Nome e Cognome sono obbligatori' };
        const now = Date.now();
        d.run(
            "UPDATE pazienti SET codice_fiscale = ?, nome = ?, cognome = ?, data_nascita = ?, luogo_nascita = ?, sesso = ?, telefono = ?, email = ?, indirizzo = ?, cap = ?, citta = ?, provincia = ?, esenzioni = ?, assicurazione = ?, gruppo_sanguigno = ?, note = ?, last_modified = ? WHERE id = ?",
            [
                codice_fiscale, nome, cognome,
                payload.data_nascita || '', payload.luogo_nascita || '', payload.sesso || '',
                payload.telefono || '', payload.email || '', payload.indirizzo || '',
                payload.cap || '', payload.citta || '', payload.provincia || '',
                payload.esenzioni || '', payload.assicurazione || '', payload.gruppo_sanguigno || '',
                payload.note || '', now, id
            ]
        );
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function remove(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        d.run("UPDATE pazienti SET is_deleted = 1, last_modified = ? WHERE id = ?", [now, id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function saveAnamnesi(event, payload = {}) {
    try {
        const { paziente_id } = payload || {};
        if (!paziente_id) return { success: false, error: 'ID Paziente mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        const existing = d.query("SELECT id FROM anamnesi WHERE paziente_id = ?", [paziente_id]);
        if (existing && existing.length > 0) {
            d.run(
                "UPDATE anamnesi SET allergie_farmaci = ?, patologie_cardiovascolari = ?, terapia_anticoagulanti = ?, diabete = ?, ipertensione = ?, epatiti_hiv = ?, fumatore = ?, gravidanza = ?, ansia_odontoiatrica = ?, altre_patologie = ?, terapie_in_corso = ?, note_mediche = ?, data_compilazione = ?, last_modified = ?, is_deleted = 0 WHERE paziente_id = ?",
                [
                    payload.allergie_farmaci || '', payload.patologie_cardiovascolari ? 1 : 0,
                    payload.terapia_anticoagulanti ? 1 : 0, payload.diabete ? 1 : 0,
                    payload.ipertensione ? 1 : 0, payload.epatiti_hiv ? 1 : 0,
                    payload.fumatore ? 1 : 0, payload.gravidanza ? 1 : 0,
                    payload.ansia_odontoiatrica ? 1 : 0, payload.altre_patologie || '',
                    payload.terapie_in_corso || '', payload.note_mediche || '',
                    payload.data_compilazione || new Date().toISOString().split('T')[0],
                    now, paziente_id
                ]
            );
        } else {
            const id = crypto.randomUUID();
            d.run(
                "INSERT INTO anamnesi (id, paziente_id, allergie_farmaci, patologie_cardiovascolari, terapia_anticoagulanti, diabete, ipertensione, epatiti_hiv, fumatore, gravidanza, ansia_odontoiatrica, altre_patologie, terapie_in_corso, note_mediche, data_compilazione, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                [
                    id, paziente_id,
                    payload.allergie_farmaci || '', payload.patologie_cardiovascolari ? 1 : 0,
                    payload.terapia_anticoagulanti ? 1 : 0, payload.diabete ? 1 : 0,
                    payload.ipertensione ? 1 : 0, payload.epatiti_hiv ? 1 : 0,
                    payload.fumatore ? 1 : 0, payload.gravidanza ? 1 : 0,
                    payload.ansia_odontoiatrica ? 1 : 0, payload.altre_patologie || '',
                    payload.terapie_in_corso || '', payload.note_mediche || '',
                    payload.data_compilazione || new Date().toISOString().split('T')[0],
                    now
                ]
            );
        }
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function saveOdontogrammaDente(event, payload = {}) {
    try {
        const { paziente_id, numero_dente, stato, superfici, materiale, note } = payload || {};
        if (!paziente_id || !numero_dente) return { success: false, error: 'Parametri dente mancanti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        const supStr = Array.isArray(superfici) ? JSON.stringify(superfici) : (superfici || '[]');
        const existing = d.query("SELECT id FROM odontogramma WHERE paziente_id = ? AND numero_dente = ?", [paziente_id, Number(numero_dente)]);
        if (existing && existing.length > 0) {
            d.run(
                "UPDATE odontogramma SET stato = ?, superfici = ?, materiale = ?, note = ?, last_modified = ?, is_deleted = 0 WHERE id = ?",
                [stato || 'sano', supStr, materiale || '', note || '', now, existing[0].id]
            );
        } else {
            const id = crypto.randomUUID();
            d.run(
                "INSERT INTO odontogramma (id, paziente_id, numero_dente, superfici, stato, materiale, note, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
                [id, paziente_id, Number(numero_dente), supStr, stato || 'sano', materiale || '', note || '', now]
            );
        }
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function addTrattamento(event, payload = {}) {
    try {
        const { paziente_id, descrizione, importo } = payload || {};
        if (!paziente_id || !descrizione) return { success: false, error: 'Dati trattamento incompleti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        const imp = Number(importo) || 0;
        const qMed = Number(payload.quota_medico) || 0;
        const qSeg = Number(payload.quota_segretaria) || 0;
        const cMat = Number(payload.costo_materiali) || 0;
        d.run(
            "INSERT INTO trattamenti_paziente (id, paziente_id, prestazione_id, descrizione, dente, superfici, medico_id, segretaria_id, poltrona, data_trattamento, stato, importo, quota_medico, quota_segretaria, costo_materiali, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, paziente_id, payload.prestazione_id || '', descrizione,
                Number(payload.dente) || 0, payload.superfici || '',
                payload.medico_id || '', payload.segretaria_id || '',
                payload.poltrona || 'Unità 1',
                payload.data_trattamento || new Date().toISOString().split('T')[0],
                payload.stato || 'completato',
                imp, qMed, qSeg, cMat,
                payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deleteTrattamento(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE trattamenti_paziente SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function addPrescrizione(event, payload = {}) {
    try {
        const { paziente_id, farmaco, posologia } = payload || {};
        if (!paziente_id || !farmaco || !posologia) return { success: false, error: 'Dati ricetta incompleti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        d.run(
            "INSERT INTO prescrizioni_farmaci (id, paziente_id, medico_id, farmaco, principio_attivo, dosaggio, posologia, durata_giorni, data_prescrizione, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, paziente_id, payload.medico_id || '', farmaco,
                payload.principio_attivo || '', payload.dosaggio || '', posologia,
                Number(payload.durata_giorni) || 5,
                payload.data_prescrizione || new Date().toISOString().split('T')[0],
                payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deletePrescrizione(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE prescrizioni_farmaci SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    saveAnamnesi,
    saveOdontogrammaDente,
    addTrattamento,
    deleteTrattamento,
    addPrescrizione,
    deletePrescrizione
};
