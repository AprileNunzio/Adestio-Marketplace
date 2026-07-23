const db = require('./backend/db');
const pdfGen = require('./backend/pdf-generator');
const fatturaXml = require('./backend/fattura-xml');

function registerBackendHandlers(ipcMain, app) {
    try {
        db.initDatabase(app);

        ipcMain.handle('businessSuite:getStats', async (event, args) => {
            try {
                const quotes = await db.queryAll('SELECT COUNT(*) as cnt FROM preventivi');
                const customers = await db.queryAll('SELECT COUNT(*) as cnt FROM clienti');
                const inventory = await db.queryAll('SELECT COUNT(*) as cnt FROM prodotti_magazzino');
                const revRow = await db.queryAll('SELECT SUM(totale_fattura) as rev FROM fatture');
                const recent = await db.queryAll('SELECT id, codice as id_code, "Preventivo" as type, cliente_nome as customer, totale_ivato as amount, stato, data_creazione as date FROM preventivi ORDER BY id DESC LIMIT 5');

                return {
                    success: true,
                    revenue: revRow[0]?.rev || 0,
                    quotesCount: quotes[0]?.cnt || 0,
                    customersCount: customers[0]?.cnt || 0,
                    inventoryCount: inventory[0]?.cnt || 0,
                    recent: recent.map(r => ({
                        id: r.id_code,
                        type: r.type,
                        customer: r.customer,
                        amount: `€ ${(r.amount || 0).toFixed(2)}`,
                        status: r.stato,
                        date: r.date
                    }))
                };
            } catch (error) {
                console.error("businessSuite:getStats error:", error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:getClienti', async () => {
            try {
                const data = await db.queryAll('SELECT * FROM clienti ORDER BY id DESC');
                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:saveCliente', async (event, c) => {
            try {
                if (c.id && typeof c.id === 'number' && c.id < 1000000000000) {
                    await db.queryRun(`UPDATE clienti SET nome=?, ragione_sociale=?, piva=?, cf=?, email=?, telefono=?, indirizzo=?, sdi=?, pec=?, is_pa=? WHERE id=?`,
                        [c.name, c.ragione_sociale || c.name, c.vat, c.cf || '', c.contact, c.telefono || '', c.indirizzo || '', c.sdi, c.pec || '', c.is_pa ? 1 : 0, c.id]);
                } else {
                    await db.queryRun(`INSERT INTO clienti (nome, ragione_sociale, piva, cf, email, codice_destinatario, is_pa) VALUES (?,?,?,?,?,?,?)`,
                        [c.name, c.ragione_sociale || c.name, c.vat, c.cf || '', c.contact, c.sdi || '0000000', c.is_pa ? 1 : 0]);
                }
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:getMagazzino', async () => {
            try {
                const data = await db.queryAll('SELECT * FROM prodotti_magazzino ORDER BY id DESC');
                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:saveProdotto', async (event, p) => {
            try {
                await db.queryRun(`INSERT INTO prodotti_magazzino (codice_articolo, descrizione, prezzo_vendita, giacenza) VALUES (?,?,?,?) ON CONFLICT(codice_articolo) DO UPDATE SET descrizione=excluded.descrizione, prezzo_vendita=excluded.prezzo_vendita, giacenza=excluded.giacenza`,
                    [p.code, p.name, p.price, p.stock]);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:getPreventivi', async () => {
            try {
                const data = await db.queryAll('SELECT * FROM preventivi ORDER BY id DESC');
                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:savePreventivo', async (event, q) => {
            try {
                const res = await db.queryRun(`INSERT INTO preventivi (codice, titolo, cliente_nome, data_creazione, totale_imponibile, totale_iva, totale_ivato, stato) VALUES (?,?,?,?,?,?,?,?)`,
                    [q.id, q.subject, q.customer, q.date, q.subtotal || 0, q.vatAmount || 0, q.grandTotal || 0, q.status || 'bozza']);
                return { success: true, lastID: res.lastID };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:getFatture', async () => {
            try {
                const data = await db.queryAll('SELECT * FROM fatture ORDER BY id DESC');
                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:generateFatturaXML', async (event, args) => {
            try {
                return fatturaXml.createFatturaPAXML(args || {});
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:generatePDF', async (event, args) => {
            try {
                return pdfGen.generateDocumentPDF(args.type || 'preventivo', args.data, args.outputPath);
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('businessSuite:processPOSSale', async (event, args) => {
            try {
                const scontrinoNum = `SCO-${Date.now().toString().slice(-6)}`;
                await db.queryRun(`INSERT INTO pos_scontrini (numero_scontrino, totale_lordo, metodo_pagamento) VALUES (?,?,?)`,
                    [scontrinoNum, parseFloat(args.total.replace('€', '').trim()) || 0, 'CONTANTI']);
                return { success: true, scontrinoNum };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        return true;
    } catch (error) {
        console.error("registerBackendHandlers failure:", error);
        return false;
    }
}

module.exports = {
    registerBackendHandlers
};
