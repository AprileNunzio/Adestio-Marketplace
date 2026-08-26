'use strict';

const crypto = require('crypto');
const { createRepository } = require('../kernel/repository');
const { pazienti } = require('../repositories/clinical');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const { oggiIso } = require('../domain/rateizzazione');

const TIPI = ['consenso', 'piano_cura', 'preventivo', 'prescrizione', 'informativa', 'altro'];
const RUOLI = ['paziente', 'tutore', 'medico', 'testimone'];
const METODI = ['grafometrica', 'cartacea_scansionata', 'digitale_remota'];
const FIRMA_MASSIMA_BYTE = 512 * 1024;

const documenti = createRepository('documenti_firmati', [
    'paziente_id', 'tipo_documento', 'riferimento_id', 'titolo', 'testo',
    'impronta_testo', 'firmatario', 'ruolo_firmatario', 'firma_immagine',
    'metodo_firma', 'data_firma', 'impronta_documento'
], { label: 'Documento firmato', orderBy: 'data_firma DESC', systemColumns: ['autore_id'] });

function improntaDi(valore) {
    return crypto.createHash('sha256').update(String(valore || '')).digest('hex');
}

function senzaImmagine(riga) {
    const { firma_immagine: immagine, ...resto } = riga;
    return { ...resto, ha_firma: Boolean(immagine) };
}

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    return documenti
        .findAll({ where: { paziente_id: payload.paziente_id } })
        .map(senzaImmagine);
}

function get(payload = {}) {
    return documenti.requireById(payload.id, { includeArchived: true });
}

async function registra(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (!TIPI.includes(payload.tipo_documento)) {
        throw validationError(`Tipo documento non valido: ${payload.tipo_documento}`);
    }
    if (!RUOLI.includes(payload.ruolo_firmatario || 'paziente')) {
        throw validationError(`Ruolo del firmatario non valido: ${payload.ruolo_firmatario}`);
    }
    if (payload.metodo_firma && !METODI.includes(payload.metodo_firma)) {
        throw validationError(`Metodo di firma non valido: ${payload.metodo_firma}`);
    }
    if (!String(payload.firmatario || '').trim()) {
        throw validationError('Indicare il nominativo di chi firma');
    }
    if (!String(payload.testo || '').trim()) {
        throw validationError('Il documento da firmare non può essere vuoto');
    }
    const immagine = String(payload.firma_immagine || '');
    if (!immagine.startsWith('data:image/')) {
        throw validationError('Firma grafometrica mancante o in formato non riconosciuto');
    }
    if (immagine.length > FIRMA_MASSIMA_BYTE) {
        throw validationError('Immagine della firma troppo grande');
    }

    pazienti.requireById(payload.paziente_id, { includeArchived: true });

    const dataFirma = payload.data_firma || oggiIso();
    const improntaTesto = improntaDi(payload.testo);
    const improntaDocumento = improntaDi([
        payload.paziente_id,
        payload.tipo_documento,
        payload.riferimento_id || '',
        improntaTesto,
        payload.firmatario,
        payload.ruolo_firmatario || 'paziente',
        dataFirma,
        immagine
    ].join('|'));

    const id = await documenti.insert({
        ...payload,
        ruolo_firmatario: payload.ruolo_firmatario || 'paziente',
        metodo_firma: payload.metodo_firma || 'grafometrica',
        data_firma: dataFirma,
        impronta_testo: improntaTesto,
        impronta_documento: improntaDocumento
    }, actor.stamp());

    return { id, impronta_documento: improntaDocumento };
}

function verifica(payload = {}) {
    const riga = documenti.requireById(payload.id, { includeArchived: true });
    const improntaTesto = improntaDi(riga.testo);
    const improntaAttesa = improntaDi([
        riga.paziente_id,
        riga.tipo_documento,
        riga.riferimento_id || '',
        improntaTesto,
        riga.firmatario,
        riga.ruolo_firmatario,
        riga.data_firma,
        riga.firma_immagine
    ].join('|'));

    const testoIntegro = improntaTesto === riga.impronta_testo;
    const documentoIntegro = improntaAttesa === riga.impronta_documento;

    return {
        id: riga.id,
        integro: testoIntegro && documentoIntegro,
        testo_integro: testoIntegro,
        documento_integro: documentoIntegro,
        impronta_registrata: riga.impronta_documento,
        impronta_ricalcolata: improntaAttesa
    };
}

async function revoca(payload = {}) {
    const riga = documenti.requireById(payload.id, { includeArchived: true });
    if (Number(riga.is_deleted) === 1) throw conflictError('Documento già annullato');
    await documenti.archive(payload.id);
    return { id: payload.id };
}

module.exports = { listByPaziente, get, registra, verifica, revoca, TIPI, RUOLI, METODI };
