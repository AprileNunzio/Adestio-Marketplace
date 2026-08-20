const { db } = require('./db_utils');

async function getGlobalStats(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { dateFrom, dateTo } = args || {};

        let incassiSql = "SELECT SUM(importo) as totale FROM pagamenti_incassi WHERE is_deleted = 0";
        let speseSql = "SELECT SUM(importo) as totale FROM spese_studio WHERE is_deleted = 0";
        let trattamentiSql = "SELECT SUM(importo) as totale_eseguito, SUM(quota_medico) as tot_medici, SUM(quota_segretaria) as tot_segreteria, SUM(costo_materiali) as tot_materiali FROM trattamenti_paziente WHERE is_deleted = 0";
        const params = [];

        if (dateFrom && dateTo) {
            incassiSql += " AND data_pagamento >= ? AND data_pagamento <= ?";
            speseSql += " AND data_spesa >= ? AND data_spesa <= ?";
            trattamentiSql += " AND data_trattamento >= ? AND data_trattamento <= ?";
            params.push(dateFrom, dateTo);
        }

        const incassiRes = d.query(incassiSql, params);
        const speseRes = d.query(speseSql, params);
        const trattRes = d.query(trattamentiSql, params);
        const pazientiTot = d.query("SELECT COUNT(*) as cnt FROM pazienti WHERE is_deleted = 0")[0].cnt;
        const appuntamentiTot = d.query("SELECT COUNT(*) as cnt FROM appuntamenti WHERE is_deleted = 0")[0].cnt;

        const totIncassi = (incassiRes && incassiRes[0] && incassiRes[0].totale) || 0;
        const totSpese = (speseRes && speseRes[0] && speseRes[0].totale) || 0;
        const totEseguito = (trattRes && trattRes[0] && trattRes[0].totale_eseguito) || 0;
        const totMedici = (trattRes && trattRes[0] && trattRes[0].tot_medici) || 0;
        const totSegreteria = (trattRes && trattRes[0] && trattRes[0].tot_segreteria) || 0;
        const totMateriali = (trattRes && trattRes[0] && trattRes[0].tot_materiali) || 0;

        const utileNettoStudio = totIncassi - totSpese - totMedici - totSegreteria;

        return {
            success: true,
            data: {
                totIncassi,
                totSpese,
                totEseguito,
                totMedici,
                totSegreteria,
                totMateriali,
                utileNettoStudio,
                pazientiTot,
                appuntamentiTot
            }
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getStatsByMedico(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query(`
            SELECT s.id, s.nome, s.cognome, s.ruolo, s.colore_calendario,
                   COUNT(t.id) as numero_prestazioni,
                   SUM(t.importo) as fatturato_generato,
                   SUM(t.quota_medico) as compensi_maturati
            FROM staff_clinico s
            LEFT JOIN trattamenti_paziente t ON t.medico_id = s.id AND t.is_deleted = 0
            WHERE s.is_deleted = 0
            GROUP BY s.id
            ORDER BY fatturato_generato DESC
        `);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getStatsByBranca(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query(`
            SELECT cp.branca,
                   COUNT(t.id) as conteggio,
                   SUM(t.importo) as fatturato
            FROM trattamenti_paziente t
            JOIN catalogo_prestazioni cp ON cp.id = t.prestazione_id
            WHERE t.is_deleted = 0
            GROUP BY cp.branca
            ORDER BY fatturato DESC
        `);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { getGlobalStats, getStatsByMedico, getStatsByBranca };
