const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function checkSeedStructure(d) {
    try {
        const sedi = d.query("SELECT COUNT(*) as count FROM sedi_studio WHERE is_deleted = 0");
        if (!sedi || sedi[0].count === 0) {
            const now = Date.now();
            const sedeId = crypto.randomUUID();
            d.run(
                "INSERT INTO sedi_studio (id, nome, codice, indirizzo, citta, cap, provincia, telefono, email, direttore_sanitario, is_principale, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0)",
                [sedeId, 'Sede Principale', 'SEDE-01', 'Via Roma 1', 'Roma', '00100', 'RM', '06 12345678', 'info@dentalsuite.it', 'Dr. Mario Rossi', now]
            );

            const sala1Id = crypto.randomUUID();
            d.run(
                "INSERT INTO sale_studio (id, sede_id, nome, tipo_sala, piano, codice_stanza, dotazioni, colore, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                [sala1Id, sedeId, 'Sala Operativa 1', 'operativa', 'Piano Terra', 'S1', 'Radiografico endorale, Turbina LED, Micromotore', '#0d9488', now]
            );

            const sala2Id = crypto.randomUUID();
            d.run(
                "INSERT INTO sale_studio (id, sede_id, nome, tipo_sala, piano, codice_stanza, dotazioni, colore, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                [sala2Id, sedeId, 'Sala Chirurgica & Implantologia', 'chirurgia', 'Piano 1', 'S2', 'Piezo-surgery, Monitor chirurgico, Lampada scialitica', '#2563eb', now]
            );

            const pol1Id = crypto.randomUUID();
            d.run(
                "INSERT INTO poltrone_studio (id, sede_id, sala_id, nome, codice_unita, marca_modello, matricola, medico_default_id, assistente_default_id, colore_agenda, stato, note, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '#0d9488', 'attiva', '', ?, 0)",
                [pol1Id, sedeId, sala1Id, 'Unità 1 - Conservativa', 'POL-01', 'Stern Weber S300', 'SW-2024-001', now]
            );

            const pol2Id = crypto.randomUUID();
            d.run(
                "INSERT INTO poltrone_studio (id, sede_id, sala_id, nome, codice_unita, marca_modello, matricola, medico_default_id, assistente_default_id, colore_agenda, stato, note, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '#2563eb', 'attiva', '', ?, 0)",
                [pol2Id, sedeId, sala2Id, 'Unità 2 - Chirurgia', 'POL-02', 'Anthos Classe A7', 'ANT-2024-002', now]
            );

            await persist();
        }
    } catch (e) {}
}

async function getAll(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        await checkSeedStructure(d);

        const sedi = d.query("SELECT * FROM sedi_studio WHERE is_deleted = 0 ORDER BY is_principale DESC, nome ASC");
        const sale = d.query("SELECT * FROM sale_studio WHERE is_deleted = 0 ORDER BY nome ASC");
        const poltrone = d.query("SELECT * FROM poltrone_studio WHERE is_deleted = 0 ORDER BY nome ASC");

        return {
            success: true,
            data: {
                sedi: sedi || [],
                sale: sale || [],
                poltrone: poltrone || []
            }
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function saveSede(event, payload = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { id, nome } = payload || {};
        if (!nome) return { success: false, error: 'Il nome della sede è obbligatorio' };
        const now = Date.now();

        if (payload.is_principale) {
            d.run("UPDATE sedi_studio SET is_principale = 0 WHERE is_deleted = 0");
        }

        if (id) {
            d.run(
                `UPDATE sedi_studio SET
                    nome = ?, codice = ?, indirizzo = ?, citta = ?, cap = ?, provincia = ?,
                    telefono = ?, email = ?, direttore_sanitario = ?, is_principale = ?, last_modified = ?
                WHERE id = ?`,
                [
                    nome, payload.codice || '', payload.indirizzo || '', payload.citta || '',
                    payload.cap || '', payload.provincia || '', payload.telefono || '',
                    payload.email || '', payload.direttore_sanitario || '',
                    payload.is_principale ? 1 : 0, now, id
                ]
            );
        } else {
            const newId = crypto.randomUUID();
            d.run(
                `INSERT INTO sedi_studio (
                    id, nome, codice, indirizzo, citta, cap, provincia, telefono, email,
                    direttore_sanitario, is_principale, last_modified, is_deleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    newId, nome, payload.codice || '', payload.indirizzo || '', payload.citta || '',
                    payload.cap || '', payload.provincia || '', payload.telefono || '',
                    payload.email || '', payload.direttore_sanitario || '',
                    payload.is_principale ? 1 : 0, now
                ]
            );
        }
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function removeSede(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID sede mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE sedi_studio SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function saveSala(event, payload = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { id, sede_id, nome } = payload || {};
        if (!sede_id || !nome) return { success: false, error: 'Sede e Nome sala obbligatori' };
        const now = Date.now();

        if (id) {
            d.run(
                `UPDATE sale_studio SET
                    sede_id = ?, nome = ?, tipo_sala = ?, piano = ?, codice_stanza = ?,
                    dotazioni = ?, colore = ?, last_modified = ?
                WHERE id = ?`,
                [
                    sede_id, nome, payload.tipo_sala || 'operativa', payload.piano || '',
                    payload.codice_stanza || '', payload.dotazioni || '', payload.colore || '#0d9488', now, id
                ]
            );
        } else {
            const newId = crypto.randomUUID();
            d.run(
                `INSERT INTO sale_studio (
                    id, sede_id, nome, tipo_sala, piano, codice_stanza, dotazioni, colore, last_modified, is_deleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    newId, sede_id, nome, payload.tipo_sala || 'operativa', payload.piano || '',
                    payload.codice_stanza || '', payload.dotazioni || '', payload.colore || '#0d9488', now
                ]
            );
        }
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function removeSala(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID sala mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE sale_studio SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function savePoltrona(event, payload = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { id, sede_id, nome } = payload || {};
        if (!sede_id || !nome) return { success: false, error: 'Sede e Nome poltrona obbligatori' };
        const now = Date.now();

        if (id) {
            d.run(
                `UPDATE poltrone_studio SET
                    sede_id = ?, sala_id = ?, nome = ?, codice_unita = ?, marca_modello = ?,
                    matricola = ?, medico_default_id = ?, assistente_default_id = ?, colore_agenda = ?,
                    stato = ?, note = ?, last_modified = ?
                WHERE id = ?`,
                [
                    sede_id, payload.sala_id || '', nome, payload.codice_unita || '',
                    payload.marca_modello || '', payload.matricola || '', payload.medico_default_id || '',
                    payload.assistente_default_id || '', payload.colore_agenda || '#0d9488',
                    payload.stato || 'attiva', payload.note || '', now, id
                ]
            );
        } else {
            const newId = crypto.randomUUID();
            d.run(
                `INSERT INTO poltrone_studio (
                    id, sede_id, sala_id, nome, codice_unita, marca_modello, matricola,
                    medico_default_id, assistente_default_id, colore_agenda, stato, note, last_modified, is_deleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    newId, sede_id, payload.sala_id || '', nome, payload.codice_unita || '',
                    payload.marca_modello || '', payload.matricola || '', payload.medico_default_id || '',
                    payload.assistente_default_id || '', payload.colore_agenda || '#0d9488',
                    payload.stato || 'attiva', payload.note || '', now
                ]
            );
        }
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function removePoltrona(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID poltrona mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE poltrone_studio SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAll,
    saveSede,
    removeSede,
    saveSala,
    removeSala,
    savePoltrona,
    removePoltrona
};
