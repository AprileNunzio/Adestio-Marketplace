const crypto = require('crypto');
const { db, persist } = require('./db_utils');

function ensureColumns(d) {
    try {
        const cols = [
            'ALTER TABLE catalogo_prestazioni ADD COLUMN tempo_sanificazione INTEGER DEFAULT 10',
            'ALTER TABLE catalogo_prestazioni ADD COLUMN num_sedute INTEGER DEFAULT 1',
            'ALTER TABLE catalogo_prestazioni ADD COLUMN prezzo_minimo REAL DEFAULT 0',
            'ALTER TABLE catalogo_prestazioni ADD COLUMN regime_iva TEXT DEFAULT "esente_art10"',
            'ALTER TABLE catalogo_prestazioni ADD COLUMN sala_richiesta TEXT DEFAULT ""',
            'ALTER TABLE catalogo_prestazioni ADD COLUMN colore_badge TEXT DEFAULT "#0d9488"'
        ];
        for (const q of cols) {
            try { d.run(q); } catch (eCol) {}
        }
    } catch (e) {}
}

async function getAll(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        ensureColumns(d);
        const rows = d.query("SELECT * FROM catalogo_prestazioni WHERE is_deleted = 0 ORDER BY branca, nome");
        if (!rows || rows.length === 0) {
            const defaults = [
                { codice: 'IGI-01', branca: 'igiene', nome: 'Ablazione Tartaro con AirFlow e Scaling', durata: 45, prezzo: 90, qMedTipo: 'fisso', qMedVal: 30, qSegTipo: 'fisso', qSegVal: 5, cMat: 8, col: '#0d9488' },
                { codice: 'IGI-02', branca: 'igiene', nome: 'Levigatura Radicolare a Cielo Coperto (Quadrante)', durata: 45, prezzo: 130, qMedTipo: 'percentuale', qMedVal: 35, qSegTipo: 'fisso', qSegVal: 5, cMat: 10, col: '#0d9488' },
                { codice: 'CON-01', branca: 'conservativa', nome: 'Otturazione Estetica Composito Monosuperficie', durata: 30, prezzo: 110, qMedTipo: 'percentuale', qMedVal: 35, qSegTipo: 'fisso', qSegVal: 5, cMat: 12, col: '#2563eb' },
                { codice: 'CON-02', branca: 'conservativa', nome: 'Ricostruzione Complessa con Perno in Fibra', durata: 60, prezzo: 180, qMedTipo: 'percentuale', qMedVal: 35, qSegTipo: 'fisso', qSegVal: 5, cMat: 25, col: '#2563eb' },
                { codice: 'END-01', branca: 'endodonzia', nome: 'Devitalizzazione Monoradicolare (Incisivi/Canini)', durata: 60, prezzo: 190, qMedTipo: 'percentuale', qMedVal: 40, qSegTipo: 'fisso', qSegVal: 10, cMat: 22, col: '#9333ea' },
                { codice: 'END-02', branca: 'endodonzia', nome: 'Devitalizzazione Pluriradicolare e Sigillatura Molari', durata: 90, prezzo: 340, qMedTipo: 'percentuale', qMedVal: 40, qSegTipo: 'fisso', qSegVal: 10, cMat: 35, col: '#9333ea' },
                { codice: 'CHI-01', branca: 'chirurgia', nome: 'Estrazione Dentaria Complessa / Radici Residue', durata: 45, prezzo: 120, qMedTipo: 'fisso', qMedVal: 45, qSegTipo: 'fisso', qSegVal: 5, cMat: 15, col: '#e11d48' },
                { codice: 'CHI-02', branca: 'chirurgia', nome: 'Germectomia / Estrazione Terzo Molare Incluso', durata: 60, prezzo: 280, qMedTipo: 'percentuale', qMedVal: 45, qSegTipo: 'fisso', qSegVal: 10, cMat: 30, col: '#e11d48' },
                { codice: 'IMP-01', branca: 'implantologia', nome: 'Impianto Osteointegrato Titanio Grado 4 + Vite Guarigione', durata: 60, prezzo: 890, qMedTipo: 'fisso', qMedVal: 320, qSegTipo: 'fisso', qSegVal: 20, cMat: 190, col: '#06b6d4' },
                { codice: 'PRO-01', branca: 'protesi', nome: 'Corona Singola Zirconio-Ceramica CAD/CAM', durata: 45, prezzo: 680, qMedTipo: 'percentuale', qMedVal: 30, qSegTipo: 'fisso', qSegVal: 15, cMat: 190, col: '#d97706' },
                { codice: 'ORT-01', branca: 'ortodonzia', nome: 'Studio Caso Ortodontico, Cefalometria & Scan 3D', durata: 45, prezzo: 150, qMedTipo: 'percentuale', qMedVal: 40, qSegTipo: 'fisso', qSegVal: 5, cMat: 15, col: '#16a34a' },
                { codice: 'DIA-01', branca: 'diagnostica', nome: 'Ortopanoramica Digitale ad Alta Definizione (OPT)', durata: 15, prezzo: 55, qMedTipo: 'fisso', qMedVal: 15, qSegTipo: 'fisso', qSegVal: 5, cMat: 3, col: '#475569' }
            ];
            const now = Date.now();
            for (const p of defaults) {
                d.run(
                    "INSERT INTO catalogo_prestazioni (id, codice, branca, nome, descrizione, durata_minuti, tempo_sanificazione, num_sedute, prezzo_paziente, prezzo_minimo, regime_iva, tipo_quota_medico, valore_quota_medico, tipo_quota_segretaria, valore_quota_segretaria, costo_materiale_stimato, sala_richiesta, colore_badge, attivo, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, '', ?, 10, 1, ?, ?, 'esente_art10', ?, ?, ?, ?, ?, '', ?, 1, ?, ?, 0)",
                    [crypto.randomUUID(), p.codice, p.branca, p.nome, p.durata, p.prezzo, p.prezzo * 0.85, p.qMedTipo, p.qMedVal, p.qSegTipo, p.qSegVal, p.cMat, p.col, now, now]
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
        ensureColumns(d);
        const id = crypto.randomUUID();
        const now = Date.now();
        d.run(
            "INSERT INTO catalogo_prestazioni (id, codice, branca, nome, descrizione, durata_minuti, tempo_sanificazione, num_sedute, prezzo_paziente, prezzo_minimo, regime_iva, tipo_quota_medico, valore_quota_medico, tipo_quota_segretaria, valore_quota_segretaria, costo_materiale_stimato, sala_richiesta, colore_badge, attivo, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, payload.codice || '', branca, nome, payload.descrizione || '',
                Number(payload.durata_minuti) || 30, Number(payload.tempo_sanificazione) || 10, Number(payload.num_sedute) || 1,
                Number(prezzo_paziente) || 0, Number(payload.prezzo_minimo) || 0, payload.regime_iva || 'esente_art10',
                payload.tipo_quota_medico || 'percentuale', Number(payload.valore_quota_medico) || 0,
                payload.tipo_quota_segretaria || 'fisso', Number(payload.valore_quota_segretaria) || 0,
                Number(payload.costo_materiale_stimato) || 0,
                payload.sala_richiesta || '', payload.colore_badge || '#0d9488',
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
        ensureColumns(d);
        const now = Date.now();
        d.run(
            "UPDATE catalogo_prestazioni SET codice = ?, branca = ?, nome = ?, descrizione = ?, durata_minuti = ?, tempo_sanificazione = ?, num_sedute = ?, prezzo_paziente = ?, prezzo_minimo = ?, regime_iva = ?, tipo_quota_medico = ?, valore_quota_medico = ?, tipo_quota_segretaria = ?, valore_quota_segretaria = ?, costo_materiale_stimato = ?, sala_richiesta = ?, colore_badge = ?, attivo = ?, last_modified = ? WHERE id = ?",
            [
                payload.codice || '', branca, nome, payload.descrizione || '',
                Number(payload.durata_minuti) || 30, Number(payload.tempo_sanificazione) || 10, Number(payload.num_sedute) || 1,
                Number(prezzo_paziente) || 0, Number(payload.prezzo_minimo) || 0, payload.regime_iva || 'esente_art10',
                payload.tipo_quota_medico || 'percentuale', Number(payload.valore_quota_medico) || 0,
                payload.tipo_quota_segretaria || 'fisso', Number(payload.valore_quota_segretaria) || 0,
                Number(payload.costo_materiale_stimato) || 0,
                payload.sala_richiesta || '', payload.colore_badge || '#0d9488',
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
