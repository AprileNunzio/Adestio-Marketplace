'use strict';

const fs = require('fs');
const path = require('path');
const { allegati, pazienti } = require('../repositories/clinical');
const { validationError, notFoundError, storageError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const { oggiIso } = require('../domain/rateizzazione');

const TIPI = ['opt', 'cbct', 'tac', 'rmn', 'rx_endorale', 'teleradiografia', 'foto', 'referto', 'consenso', 'altro'];
const ESTENSIONI = ['.pdf', '.jpg', '.jpeg', '.png', '.dcm', '.zip', '.tif', '.tiff'];
const DIMENSIONE_MASSIMA = 200 * 1024 * 1024;

function electron() {
    return require('electron');
}

function archivioDir(pazienteId) {
    const base = path.join(electron().app.getPath('userData'), 'dental_suite_archivio', pazienteId);
    fs.mkdirSync(base, { recursive: true });
    return base;
}

function finestraAttiva() {
    const { BrowserWindow } = electron();
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    return allegati.findAll({ where: { paziente_id: payload.paziente_id } });
}

async function upload(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (payload.tipo && !TIPI.includes(payload.tipo)) throw validationError(`Tipo referto non valido: ${payload.tipo}`);
    pazienti.requireById(payload.paziente_id, { includeArchived: true });

    const finestra = finestraAttiva();
    const scelta = await electron().dialog.showOpenDialog(finestra, {
        title: 'Seleziona il referto diagnostico',
        properties: ['openFile'],
        filters: [{ name: 'Referti', extensions: ESTENSIONI.map(e => e.slice(1)) }]
    });
    if (scelta.canceled || scelta.filePaths.length === 0) return { annullato: true };

    const origine = scelta.filePaths[0];
    const estensione = path.extname(origine).toLowerCase();
    if (!ESTENSIONI.includes(estensione)) throw validationError(`Estensione non ammessa: ${estensione}`);

    const statistiche = fs.statSync(origine);
    if (statistiche.size > DIMENSIONE_MASSIMA) throw validationError('Il file supera il limite di 200 MB');

    const nomeArchiviato = `${Date.now()}_${path.basename(origine).replace(/[^\w.\-]/g, '_')}`;
    const destinazione = path.join(archivioDir(payload.paziente_id), nomeArchiviato);
    try {
        fs.copyFileSync(origine, destinazione);
    } catch (errore) {
        throw storageError(`Copia del referto non riuscita: ${errore.message}`);
    }

    const id = await allegati.insert({
        paziente_id: payload.paziente_id,
        tipo: payload.tipo || 'altro',
        titolo: payload.titolo || path.basename(origine, estensione),
        file_name: path.basename(origine),
        file_path: destinazione,
        file_size: statistiche.size,
        mime_type: estensione.slice(1),
        data_esame: payload.data_esame || oggiIso(),
        note: payload.note || ''
    }, actor.stamp());

    return { id, annullato: false };
}

async function open(payload = {}) {
    const riga = allegati.requireById(payload.id, { includeArchived: true });
    if (!riga.file_path || !fs.existsSync(riga.file_path)) {
        throw notFoundError('File del referto non più presente su disco');
    }
    const esito = await electron().shell.openPath(riga.file_path);
    if (esito) throw storageError(esito);
    return { aperto: true };
}

async function remove(payload = {}) {
    const riga = allegati.requireById(payload.id, { includeArchived: true });
    await allegati.archive(payload.id);
    if (payload.elimina_file === true && riga.file_path && fs.existsSync(riga.file_path)) {
        try {
            fs.unlinkSync(riga.file_path);
        } catch (errore) {
            throw storageError(`Referto archiviato ma file non eliminato: ${errore.message}`);
        }
    }
    return { id: payload.id };
}

module.exports = { listByPaziente, upload, open, remove, TIPI };
