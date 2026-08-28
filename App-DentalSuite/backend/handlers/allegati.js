'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { allegati, pazienti } = require('../repositories/clinical');
const { validationError, notFoundError, storageError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const { oggiIso } = require('../domain/rateizzazione');

const TIPI = ['opt', 'cbct', 'tac', 'rmn', 'rx_endorale', 'teleradiografia', 'foto', 'referto', 'consenso', 'altro'];
const ESTENSIONI = ['.pdf', '.jpg', '.jpeg', '.png', '.dcm', '.zip', '.tif', '.tiff'];
const DIMENSIONE_MASSIMA = 200 * 1024 * 1024;
const PORZIONE = 512 * 1024;
const TRASFERIBILE_MASSIMO = 40 * 1024 * 1024;
const VISUALIZZABILI = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
const DERIVABILI = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const DERIVATA_MASSIMA = 12 * 1024 * 1024;
const VARIANTI = ['originale', 'visione', 'anteprima'];

const MIME = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf'
};

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

    const formato = estensione.slice(1);
    const derivabile = DERIVABILI.includes(formato) && statistiche.size <= TRASFERIBILE_MASSIMO;

    const id = await allegati.insert({
        paziente_id: payload.paziente_id,
        tipo: payload.tipo || 'altro',
        titolo: payload.titolo || path.basename(origine, estensione),
        file_name: path.basename(origine),
        file_path: destinazione,
        file_size: statistiche.size,
        mime_type: formato,
        data_esame: payload.data_esame || oggiIso(),
        note: payload.note || '',
        impronta: improntaDi(destinazione),
        derivate_stato: derivabile ? 'da_generare' : 'non_applicabile'
    }, actor.stamp());

    return { id, annullato: false, derivabile };
}

function improntaDi(percorso) {
    return crypto.createHash('sha256').update(fs.readFileSync(percorso)).digest('hex');
}

function percorsoVariante(riga, variante) {
    if (variante === 'anteprima' && riga.anteprima_path) return riga.anteprima_path;
    if (variante === 'visione' && riga.visione_path) return riga.visione_path;
    return riga.file_path;
}

function tipoDi(riga) {
    const estensione = String(riga.mime_type || '').toLowerCase().replace('.', '');
    return {
        estensione,
        mime: MIME[estensione] || 'application/octet-stream',
        visualizzabile: VISUALIZZABILI.includes(estensione),
        immagine: VISUALIZZABILI.includes(estensione) && estensione !== 'pdf'
    };
}

function porzione(payload = {}) {
    const riga = allegati.requireById(payload.id, { includeArchived: true });
    const tipo = tipoDi(riga);
    const variante = VARIANTI.includes(payload.variante) ? payload.variante : 'originale';
    const percorso = percorsoVariante(riga, variante);
    const derivata = percorso !== riga.file_path;

    if (!percorso || !fs.existsSync(percorso)) {
        throw notFoundError('File del referto non più presente su disco');
    }
    if (!derivata && !tipo.visualizzabile) {
        throw validationError(`Formato non visualizzabile a distanza: ${tipo.estensione || 'sconosciuto'}`);
    }

    const statistiche = fs.statSync(percorso);
    if (statistiche.size > TRASFERIBILE_MASSIMO) {
        throw validationError('Referto troppo grande per la trasmissione: apritelo dalla postazione di segreteria');
    }

    const dimensione = Math.min(Number(payload.dimensione) || PORZIONE, PORZIONE);
    const blocco = Math.max(Number(payload.blocco) || 0, 0);
    const inizio = blocco * dimensione;
    if (inizio >= statistiche.size && statistiche.size > 0) {
        throw validationError('Porzione oltre la fine del file');
    }

    const lunghezza = Math.min(dimensione, statistiche.size - inizio);
    const tampone = Buffer.alloc(lunghezza);
    const descrittore = fs.openSync(percorso, 'r');
    try {
        fs.readSync(descrittore, tampone, 0, lunghezza, inizio);
    } finally {
        fs.closeSync(descrittore);
    }

    return {
        id: riga.id,
        titolo: riga.titolo || riga.file_name,
        variante,
        mime: derivata ? 'image/webp' : tipo.mime,
        immagine: derivata ? true : tipo.immagine,
        dimensione_totale: statistiche.size,
        dimensione_porzione: dimensione,
        blocco,
        blocchi: Math.max(Math.ceil(statistiche.size / dimensione), 1),
        dati: tampone.toString('base64')
    };
}

function daDerivare(payload = {}) {
    const filtri = [{ colonna: 'derivate_stato', operatore: 'eq', valore: 'da_generare' }];
    if (payload.paziente_id) filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    return allegati
        .findPage({ filtri, dimensione: Number(payload.dimensione) || 10, ordina: 'created_at ASC' })
        .righe
        .map(riga => ({ id: riga.id, titolo: riga.titolo, mime_type: riga.mime_type, file_size: riga.file_size }));
}

function scriviDerivata(riga, suffisso, datiBase64) {
    const contenuto = Buffer.from(String(datiBase64 || '').split(',').pop(), 'base64');
    if (contenuto.length === 0) throw validationError('Derivata vuota');
    if (contenuto.length > DERIVATA_MASSIMA) throw validationError('Derivata troppo grande');
    const destinazione = path.join(
        path.dirname(riga.file_path),
        `${path.basename(riga.file_path, path.extname(riga.file_path))}_${suffisso}.webp`
    );
    fs.writeFileSync(destinazione, contenuto);
    return destinazione;
}

async function salvaDerivate(payload = {}) {
    const riga = allegati.requireById(payload.id, { includeArchived: true });
    if (!DERIVABILI.includes(String(riga.mime_type || '').toLowerCase())) {
        throw validationError('Il formato di questo referto non ammette derivate');
    }

    if (payload.fallita === true) {
        await allegati.update(payload.id, { derivate_stato: 'non_applicabile' });
        return { id: payload.id, stato: 'non_applicabile' };
    }

    const modifiche = {
        larghezza: Number(payload.larghezza) || 0,
        altezza: Number(payload.altezza) || 0,
        derivate_stato: 'pronte'
    };
    if (payload.anteprima) modifiche.anteprima_path = scriviDerivata(riga, 'anteprima', payload.anteprima);
    if (payload.visione) modifiche.visione_path = scriviDerivata(riga, 'visione', payload.visione);
    if (!modifiche.anteprima_path && !modifiche.visione_path) {
        throw validationError('Nessuna derivata ricevuta');
    }

    await allegati.update(payload.id, modifiche, actor.stamp());
    return {
        id: payload.id,
        stato: 'pronte',
        anteprima: Boolean(modifiche.anteprima_path),
        visione: Boolean(modifiche.visione_path)
    };
}

function verificaIntegrita(payload = {}) {
    const riga = allegati.requireById(payload.id, { includeArchived: true });
    if (!riga.file_path || !fs.existsSync(riga.file_path)) {
        return { id: riga.id, integro: false, motivo: 'File non più presente su disco' };
    }
    if (!riga.impronta) {
        return { id: riga.id, integro: null, motivo: 'Referto acquisito prima della registrazione dell impronta' };
    }
    const attuale = improntaDi(riga.file_path);
    return {
        id: riga.id,
        integro: attuale === riga.impronta,
        impronta_registrata: riga.impronta,
        impronta_attuale: attuale
    };
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

async function contenuto(payload = {}) {
    const riga = allegati.requireById(payload.id, { includeArchived: true });
    const tipo = tipoDi(riga);
    const variante = VARIANTI.includes(payload.variante) ? payload.variante : 'visione';
    let percorso = percorsoVariante(riga, variante);
    if (!percorso || !fs.existsSync(percorso)) percorso = riga.file_path;
    if (!percorso || !fs.existsSync(percorso)) throw notFoundError('File del referto non presente su disco');
    const statistiche = fs.statSync(percorso);
    const buffer = fs.readFileSync(percorso);
    const mime = tipo.mime || 'application/octet-stream';
    return {
        id: riga.id,
        titolo: riga.titolo || riga.file_name,
        tipo: riga.tipo,
        mime_type: riga.mime_type,
        data_esame: riga.data_esame,
        note: riga.note || '',
        dimensione: statistiche.size,
        mime,
        immagine: tipo.immagine || percorso.endsWith('.webp'),
        data_url: `data:${mime};base64,${buffer.toString('base64')}`
    };
}

module.exports = {
    listByPaziente,
    upload,
    open,
    remove,
    contenuto,
    porzione,
    daDerivare,
    salvaDerivate,
    verificaIntegrita,
    tipoDi,
    TIPI,
    VISUALIZZABILI,
    DERIVABILI
};
