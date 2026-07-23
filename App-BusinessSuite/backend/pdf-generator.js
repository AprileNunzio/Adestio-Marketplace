const fs = require('fs');
const path = require('path');

function generateDocumentHTML(type, data) {
    try {
        const title = type === 'preventivo' ? 'PREVENTIVO' : (type === 'fattura' ? 'FATTURA ELETTRONICA' : 'DOCUMENTO DI TRASPORTO');
        const code = data.codice || data.numero || 'DOC-001';
        const date = data.data_creazione || data.data_fattura || data.data_ddt || new Date().toISOString().split('T')[0];
        const client = data.cliente_nome || 'Cliente Spettabile';

        return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: sans-serif; padding: 40px; color: #1e293b; }
.header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
.title { font-size: 24px; font-weight: bold; color: #6366f1; }
.box { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f1f5f9; }
.totals { text-align: right; margin-top: 30px; font-size: 18px; font-weight: bold; }
</style>
</head>
<body>
<div class="header">
    <div>
        <div class="title">${title}</div>
        <div>N: ${code}</div>
        <div>Data: ${date}</div>
    </div>
    <div style="text-align: right;">
        <strong>Adestio Business Suite</strong><br>
        Via Roma 100 - Roma<br>
        P.IVA IT01234567890
    </div>
</div>

<div class="box">
    <strong>Destinatario:</strong><br>
    ${client}<br>
    P.IVA: ${data.cliente_piva || 'N/D'}<br>
    SDI: ${data.cliente_sdi || '0000000'}
</div>

<table>
    <thead>
        <tr>
            <th>Descrizione</th>
            <th>Q.tà</th>
            <th>Prezzo Unitario</th>
            <th>Totale</th>
        </tr>
    </thead>
    <tbody>
        ${(data.voci || []).map(v => `
            <tr>
                <td>${v.descrizione}</td>
                <td>${v.quantita || 1}</td>
                <td>€ ${(parseFloat(v.prezzo_vendita || v.prezzo_unitario) || 0).toFixed(2)}</td>
                <td>€ ${(parseFloat(v.totale_voce || v.totale_riga) || 0).toFixed(2)}</td>
            </tr>
        `).join('')}
    </tbody>
</table>

<div class="totals">
    Totale Imponibile: € ${(parseFloat(data.totale_imponibile) || 0).toFixed(2)}<br>
    Totale IVA: € ${(parseFloat(data.totale_iva) || 0).toFixed(2)}<br>
    <span style="color: #10b981;">Totale Documento: € ${(parseFloat(data.totale_ivato || data.totale_fattura) || 0).toFixed(2)}</span>
</div>
</body>
</html>`;
    } catch (error) {
        console.error("generateDocumentHTML error:", error);
        return "";
    }
}

function generateDocumentPDF(type, data, outputPath) {
    try {
        const html = generateDocumentHTML(type, data);
        if (outputPath) {
            fs.writeFileSync(outputPath, html);
        }
        return {
            success: true,
            html,
            path: outputPath
        };
    } catch (error) {
        console.error("generateDocumentPDF failure:", error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    generateDocumentHTML,
    generateDocumentPDF
};
