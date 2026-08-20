const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function getAll(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query("SELECT * FROM catalogo_prestazioni WHERE is_deleted = 0 ORDER BY branca, nome");
        if (!rows || rows.length === 0) {
            const defaults = [
                { branca: 'igiene', nome: 'Ablazione Tartaro (Igiene Professionale)', durata: 45, prezzo: 80, qMedTipo: 'fisso', qMedVal: 25, qSegTipo: 'fisso', qSegVal: 5, cMat: 5 },
                { branca: 'igiene', nome: 'Levigatura Radicolare per Quadrante', durata: 45, prezzo: 120, qMedTipo: 'percentuale', qMedVal: 35, qSegTipo: 'fisso', qSegVal: 5, cMat: 8 },
                { branca: 'conservativa', nome: 'Otturazione Composito Monosuperficie', durata: 30, prezzo: 100, qMedTipo: 'percentuale', qMedVal: 35, qSegTipo: 'fisso', qSegVal: 5, cMat: 10 },
                { branca: 'conservativa', nome: 'Otturazione Composito Plurisuperficie', durata: 45, prezzo: 140, qMedTipo: 'percentuale', qMedVal: 35, qSegTipo: 'fisso', qSegVal: 5, cMat: 15 },
                { branca: 'endodonzia', nome: 'Devitalizzazione Monoradicolare', durata: 60, prezzo: 180, qMedTipo: 'percentuale', qMedVal: 40, qSegTipo: 'fisso', qSegVal: 10, cMat: 20 },
                { branca: 'endodonzia', nome: 'Devitalizzazione Pluriradicolare (Molari)', durata: 90, prezzo: 320, qMedTipo: 'percentuale', qMedVal: 40, qSegTipo: 'fisso', qSegVal: 10, cMat: 30 },
                { branca: 'chirurgia', nome: 'Estrazione Dentaria Semplice', durata: 30, prezzo: 90, qMedTipo: 'fisso', qMedVal: 35, qSegTipo: 'fisso', qSegVal: 5, cMat: 8 },
                { branca: 'chirurgia', nome: 'Estrazione Terzo Molare in Disodontiasi', durata: 60, prezzo: 250, qMedTipo: 'percentuale', qMedVal: 45, qSegTipo: 'fisso', qSegVal: 10, cMat: 25 },
                { branca: 'implantologia', nome: 'Inserimento Impianto Osteointegrato Titanio', durata: 60, prezzo: 850, qMedTipo: 'fisso', qMedVal: 300, qSegTipo: 'fisso', qSegVal: 20, cMat: 180 },
                { branca: 'protesi', nome: 'Corona Zirconio/Ceramica su Dente Naturale', durata: 45, prezzo: 650, qMedTipo: 'percentuale', qMedVal: 30, qSegTipo: 'fisso', qSegVal: 15, cMat: 180 },
                { branca: 'ortodonzia', nome: 'Visita Cefalometrica e Check-up Ortodontico', durata: 45, prezzo: 120, qMedTipo: 'percentuale', qMedVal: 40, qSegTipo: 'fisso', qSegVal: 5, cMat: 10 },
                { branca: 'diagnostica', nome: 'Ortopanoramica Digitale (OPT)', durata: 15, prezzo: 50, qMedTipo: 'fisso', qMedVal: 15, qSegTipo: 'fisso', qSegVal: 5, cMat: 2 }
            ];
            const now = Date.now();
            for (const p of defaults) {
                d.run(
                    "INSERT INTO catalogo_prestazioni (id, codice, branca, nome, descrizione, durata_minuti, prezzo_paziente, tipo_quota_medico, valore_quota_medico, tipo_quota_segretaria, valore_quota_segretaria, costo_materiale_stimato, attivo, created_at, last_modified, is_deleted) VALUES (?, '', ?, ?, '', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)",
                    [crypto.randomUUID(), p.branca, p.nome, p.durata, p.prezzo, p.qMedTipo, p.qMedVal, p.qSegTipo, p.qSegVal, p.cMat, now, now]
                );
            }
            await persist();
            return { success: true, data: d.query("SELECT * FROM catalogo_prestazioni WHERE is_deleted = 0 ORDER BY branca, nome") };
        }
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function create(event, payload = {}) {
    try {
        const { nome, branca, prezzo_paziente } = payload || {};
        if (!nome || !branca) return { success: false, error: 'Nome e Branca sono obbligatori' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        d.run(
            "INSERT INTO catalogo_prestazioni (id, codice, branca, nome, descrizione, durata_minuti, prezzo_paziente, tipo_quota_medico, valore_quota_medico, tipo_quota_segretaria, valore_quota_segretaria, costo_materiale_stimato, attivo, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, payload.codice || '', branca, nome, payload.descrizione || '',
                Number(payload.durata_minuti) || 30, Number(prezzo_paziente) || 0,
                payload.tipo_quota_medico || 'fisso', Number(payload.valore_quota_medico) || 0,
                payload.tipo_quota_segretaria || 'fisso', Number(payload.valore_quota_segretaria) || 0,
                Number(payload.costo_materiale_stimato) || 0,
                payload.attivo !== undefined ? (payload.attivo ? 1 : 0) : 1,
                now, now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function update(event, payload = {}) {
    try {
        const { id, nome, branca, prezzo_paziente } = payload || {};
        if (!id || !nome || !branca) return { success: false, error: 'Dati incompleti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        d.run(
            "UPDATE catalogo_prestazioni SET codice = ?, branca = ?, nome = ?, descrizione = ?, durata_minuti = ?, prezzo_paziente = ?, tipo_quota_medico = ?, valore_quota_medico = ?, tipo_quota_segretaria = ?, valore_quota_segretaria = ?, costo_materiale_stimato = ?, attivo = ?, last_modified = ? WHERE id = ?",
            [
                payload.codice || '', branca, nome, payload.descrizione || '',
                Number(payload.durata_minuti) || 30, Number(prezzo_paziente) || 0,
                payload.tipo_quota_medico || 'fisso', Number(payload.valore_quota_medico) || 0,
                payload.tipo_quota_segretaria || 'fisso', Number(payload.valore_quota_segretaria) || 0,
                Number(payload.costo_materiale_stimato) || 0,
                payload.attivo ? 1 : 0,
                now, id
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
        d.run("UPDATE catalogo_prestazioni SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { getAll, create, update, remove };
