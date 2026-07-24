'use strict';

// Generazione documenti (PDF/Excel) e salvataggio su disco.
// PDF via pdfkit, Excel via xlsx: dipendenze proprie dell'app (bundlate nello
// zip in node_modules/, pure JS senza problemi di ABI nativo).

const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const fs = require('fs');
const { db } = require('./db_utils');

function getImpostazioni() {
    const rows = db().query('SELECT key_name, key_value FROM impostazioni_business_suite');
    const map = {};
    rows.forEach(r => { map[r.key_name] = r.key_value; });
    return map;
}

function euro(n) {
    return (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function buildDocumentoPdf({ tipoLabel, numero, data, cliente, righe, totali, note, condizioniPagamento }) {
    return new Promise((resolve, reject) => {
        try {
            const cfg = getImpostazioni();
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const chunks = [];
            doc.on('data', c => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.fontSize(18).fillColor('#6366f1').text(cfg.ragione_sociale_azienda || 'Azienda', 40, 40);
            doc.fontSize(9).fillColor('#475569')
                .text(`${cfg.indirizzo_azienda || ''} ${cfg.cap_azienda || ''} ${cfg.citta_azienda || ''} (${cfg.provincia_azienda || ''})`)
                .text(`P.IVA ${cfg.piva_azienda || ''}${cfg.codice_fiscale_azienda ? ' — CF ' + cfg.codice_fiscale_azienda : ''}`);

            doc.fontSize(16).fillColor('#111827').text(tipoLabel, 350, 40, { width: 200, align: 'right' });
            doc.fontSize(10).fillColor('#475569')
                .text(`Numero: ${numero}`, 350, 65, { width: 200, align: 'right' })
                .text(`Data: ${data}`, 350, 80, { width: 200, align: 'right' });

            doc.moveTo(40, 115).lineTo(555, 115).strokeColor('#cbd5e1').stroke();

            doc.fontSize(10).fillColor('#111827').text('Cliente:', 40, 128, { continued: false });
            doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold').text(cliente.ragione_sociale || '', 40, 142);
            doc.font('Helvetica').fontSize(9).fillColor('#475569');
            if (cliente.indirizzo) doc.text(`${cliente.indirizzo}, ${cliente.cap || ''} ${cliente.citta || ''} (${cliente.provincia || ''})`);
            if (cliente.piva) doc.text(`P.IVA: ${cliente.piva}`);
            if (cliente.codice_fiscale) doc.text(`CF: ${cliente.codice_fiscale}`);

            let y = doc.y + 20;
            doc.fontSize(9).fillColor('#ffffff');
            doc.rect(40, y, 515, 20).fill('#6366f1');
            doc.fillColor('#ffffff')
                .text('Descrizione', 46, y + 6, { width: 230 })
                .text('Qtà', 280, y + 6, { width: 40, align: 'right' })
                .text('Prezzo', 325, y + 6, { width: 70, align: 'right' })
                .text('Sconto', 400, y + 6, { width: 50, align: 'right' })
                .text('Totale', 455, y + 6, { width: 90, align: 'right' });
            y += 22;

            righe.forEach(r => {
                if (y > 720) { doc.addPage(); y = 40; }
                doc.fillColor('#111827').fontSize(9)
                    .text(r.descrizione || '', 46, y, { width: 230 })
                    .text(String(r.quantita), 280, y, { width: 40, align: 'right' })
                    .text(euro(r.prezzo), 325, y, { width: 70, align: 'right' })
                    .text(r.sconto ? `${r.sconto}%` : '-', 400, y, { width: 50, align: 'right' })
                    .text(euro(r.totale), 455, y, { width: 90, align: 'right' });
                y += 18;
                doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
                y += 4;
            });

            y += 10;
            if (y > 680) { doc.addPage(); y = 40; }
            const summaryX = 355;
            doc.fontSize(10).fillColor('#475569')
                .text('Imponibile:', summaryX, y, { width: 110 })
                .text(euro(totali.totale_imponibile), summaryX + 110, y, { width: 90, align: 'right' });
            y += 16;
            doc.text('IVA:', summaryX, y, { width: 110 })
                .text(euro(totali.totale_iva), summaryX + 110, y, { width: 90, align: 'right' });
            y += 16;
            doc.fontSize(12).fillColor('#111827').font('Helvetica-Bold')
                .text('Totale:', summaryX, y, { width: 110 })
                .text(euro(totali.totale_ivato ?? totali.totale_documento), summaryX + 110, y, { width: 90, align: 'right' });
            doc.font('Helvetica');

            y += 40;
            if (condizioniPagamento) {
                doc.fontSize(9).fillColor('#475569').text(`Condizioni di pagamento: ${condizioniPagamento}`, 40, y, { width: 515 });
                y = doc.y + 8;
            }
            if (note) {
                doc.fontSize(9).fillColor('#475569').text(note, 40, y, { width: 515 });
            }

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

async function generatePreventivoPdf(event, args = {}) {
    try {
        const { id } = args;
        const preventiviHandler = require('./preventivi');
        const res = await preventiviHandler.getById(event, { id });
        if (!res.success) return res;
        const { preventivo, voci } = res.data;
        const buffer = await buildDocumentoPdf({
            tipoLabel: 'PREVENTIVO',
            numero: preventivo.numero,
            data: preventivo.data_emissione || new Date().toISOString().slice(0, 10),
            cliente: {
                ragione_sociale: preventivo.cliente_ragione_sociale, piva: preventivo.cliente_piva,
                codice_fiscale: preventivo.cliente_codice_fiscale, indirizzo: preventivo.cliente_indirizzo,
                cap: preventivo.cliente_cap, citta: preventivo.cliente_citta, provincia: preventivo.cliente_provincia
            },
            righe: voci.map(v => ({ descrizione: v.descrizione, quantita: v.quantita, prezzo: v.prezzo_vendita, sconto: v.sconto_percentuale, totale: v.totale_voce })),
            totali: preventivo,
            note: preventivo.note,
            condizioniPagamento: preventivo.condizioni_pagamento
        });
        return { success: true, data: { base64: buffer.toString('base64'), fileName: `${preventivo.numero}.pdf` } };
    } catch (e) {
        console.error('[BusinessSuite:documenti] generatePreventivoPdf error:', e.message);
        return { success: false, error: e.message };
    }
}

async function generateFatturaPdf(event, args = {}) {
    try {
        const { id } = args;
        const fattureHandler = require('./fatture');
        const res = await fattureHandler.getById(event, { id });
        if (!res.success) return res;
        const { fattura, voci } = res.data;
        const buffer = await buildDocumentoPdf({
            tipoLabel: 'FATTURA',
            numero: fattura.numero,
            data: fattura.data_emissione || new Date().toISOString().slice(0, 10),
            cliente: {
                ragione_sociale: fattura.cliente_ragione_sociale, piva: fattura.cliente_piva,
                codice_fiscale: fattura.cliente_codice_fiscale, indirizzo: fattura.cliente_indirizzo,
                cap: fattura.cliente_cap, citta: fattura.cliente_citta, provincia: fattura.cliente_provincia
            },
            righe: voci.map(v => ({ descrizione: v.descrizione, quantita: v.quantita, prezzo: v.prezzo_unitario, sconto: v.sconto_percentuale, totale: v.totale_riga })),
            totali: fattura,
            note: fattura.note,
            condizioniPagamento: ''
        });
        return { success: true, data: { base64: buffer.toString('base64'), fileName: `${fattura.numero}.pdf` } };
    } catch (e) {
        console.error('[BusinessSuite:documenti] generateFatturaPdf error:', e.message);
        return { success: false, error: e.message };
    }
}

function buildRigheExcelBuffer(righe, totali, sheetName) {
    const wb = XLSX.utils.book_new();
    const rows = [
        ['Descrizione', 'Quantità', 'Prezzo Unitario', 'Sconto %', 'Totale'],
        ...righe.map(r => [r.descrizione, r.quantita, r.prezzo, r.sconto || 0, r.totale]),
        [],
        ['', '', '', 'Imponibile', totali.totale_imponibile],
        ['', '', '', 'IVA', totali.totale_iva],
        ['', '', '', 'Totale', totali.totale_ivato ?? totali.totale_documento]
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function generatePreventivoExcel(event, args = {}) {
    try {
        const { id } = args;
        const preventiviHandler = require('./preventivi');
        const res = await preventiviHandler.getById(event, { id });
        if (!res.success) return res;
        const { preventivo, voci } = res.data;
        const buffer = buildRigheExcelBuffer(
            voci.map(v => ({ descrizione: v.descrizione, quantita: v.quantita, prezzo: v.prezzo_vendita, sconto: v.sconto_percentuale, totale: v.totale_voce })),
            preventivo, 'Preventivo'
        );
        return { success: true, data: { base64: buffer.toString('base64'), fileName: `${preventivo.numero}.xlsx` } };
    } catch (e) {
        console.error('[BusinessSuite:documenti] generatePreventivoExcel error:', e.message);
        return { success: false, error: e.message };
    }
}

async function generateFatturaExcel(event, args = {}) {
    try {
        const { id } = args;
        const fattureHandler = require('./fatture');
        const res = await fattureHandler.getById(event, { id });
        if (!res.success) return res;
        const { fattura, voci } = res.data;
        const buffer = buildRigheExcelBuffer(
            voci.map(v => ({ descrizione: v.descrizione, quantita: v.quantita, prezzo: v.prezzo_unitario, sconto: v.sconto_percentuale, totale: v.totale_riga })),
            fattura, 'Fattura'
        );
        return { success: true, data: { base64: buffer.toString('base64'), fileName: `${fattura.numero}.xlsx` } };
    } catch (e) {
        console.error('[BusinessSuite:documenti] generateFatturaExcel error:', e.message);
        return { success: false, error: e.message };
    }
}

async function salvaFile(event, args = {}) {
    try {
        const { base64, fileName, filters } = args;
        if (!base64 || !fileName) return { success: false, error: 'Parametri mancanti' };
        const { dialog, BrowserWindow } = require('electron');
        // Chiamata via capabilityBroker (window.adestioNative.callAppApi): non arriva
        // un vero IpcMainInvokeEvent, quindi non c'e' event.sender da risalire.
        const win = (event && event.sender)
            ? BrowserWindow.fromWebContents(event.sender)
            : (BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null);
        const dialogOptions = {
            defaultPath: fileName,
            filters: filters || [{ name: 'File', extensions: ['*'] }]
        };
        const result = win
            ? await dialog.showSaveDialog(win, dialogOptions)
            : await dialog.showSaveDialog(dialogOptions);
        if (result.canceled || !result.filePath) return { success: false, canceled: true };
        fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
        return { success: true, data: { filePath: result.filePath } };
    } catch (e) {
        console.error('[BusinessSuite:documenti] salvaFile error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = {
    generatePreventivoPdf, generateFatturaPdf,
    generatePreventivoExcel, generateFatturaExcel,
    salvaFile
};
