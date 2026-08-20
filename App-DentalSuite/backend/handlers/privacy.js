'use strict';

const fs = require('fs');
const path = require('path');
const { createRepository } = require('../kernel/repository');
const { pazienti, anamnesi, odontogramma, trattamenti, prescrizioni, allegati } = require('../repositories/clinical');
const { appuntamenti } = require('../repositories/facility');
const { preventivi, incassi, pianiRateali, rate, notifiche } = require('../repositories/financial');
const { consensiPaziente } = require('../repositories/compliance');
const { validationError, conflictError, storageError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const conservazione = require('../domain/conservazione');
const identita = require('../domain/identita');
const { oggiIso } = require('../domain/rateizzazione');

const cancellazioni = createRepository('registro_cancellazioni', [
    'paziente_id', 'nominativo_cancellato', 'motivo', 'campi_anonimizzati',
    'atti_clinici_conservati', 'conservazione_fino_al', 'esito'
], { label: 'Cancellazione', orderBy: 'created_at DESC', systemColumns: ['autore_id'] });

function electron() {
    return require('electron');
}

function raccogli(pazienteId) {
    const dove = { where: { paziente_id: pazienteId } };
    return {
        anamnesi: anamnesi.findAll(dove),
        odontogramma: odontogramma.findAll(dove),
        trattamenti: trattamenti.findAll(dove),
        prescrizioni: prescrizioni.findAll(dove),
        allegati: allegati.findAll(dove),
        appuntamenti: appuntamenti.findAll(dove),
        preventivi: preventivi.findAll(dove),
        incassi: incassi.findAll(dove),
        piani_rateali: pianiRateali.findAll(dove),
        rate: rate.findAll(dove),
        notifiche: notifiche.findAll(dove),
        consensi: consensiPaziente.findAll(dove)
    };
}

function contesto(pazienteId, oggi) {
    const dati = raccogli(pazienteId);
    return {
        dati,
        valutazione: conservazione.valuta({
            oggi,
            atti_clinici: [...dati.trattamenti, ...dati.prescrizioni, ...dati.allegati],
            rate_aperte: dati.rate.filter(riga => riga.stato !== 'pagata').length,
            appuntamenti_futuri: dati.appuntamenti.filter(riga =>
                Number(riga.data_ora_inizio) > Date.now() && riga.stato !== 'annullato').length
        })
    };
}

function valutaCancellazione(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const paziente = pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const { valutazione } = contesto(payload.paziente_id, payload.oggi || oggiIso());
    return { ...valutazione, nominativo: identita.nominativo(paziente) };
}

async function anonimizzaPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (!String(payload.motivo || '').trim()) {
        throw validationError('Indicare il motivo della richiesta di cancellazione');
    }
    const paziente = pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const oggi = payload.oggi || oggiIso();
    const { valutazione } = contesto(payload.paziente_id, oggi);

    if (!valutazione.anonimizzazione_possibile) {
        throw conflictError(valutazione.impedimenti.map(voce => voce.descrizione).join('. '));
    }

    const nominativo = identita.nominativo(paziente);
    await pazienti.update(payload.paziente_id, conservazione.payloadAnonimizzazione(), actor.stamp());
    await pazienti.archive(payload.paziente_id);

    const id = await cancellazioni.insert({
        paziente_id: payload.paziente_id,
        nominativo_cancellato: nominativo,
        motivo: payload.motivo,
        campi_anonimizzati: conservazione.CAMPI_IDENTIFICATIVI.length,
        atti_clinici_conservati: valutazione.atti_clinici_conservati,
        conservazione_fino_al: valutazione.conservazione_fino_al,
        esito: valutazione.obbligo_conservazione_attivo ? 'anonimizzata_con_conservazione' : 'anonimizzata'
    }, actor.stamp());

    return {
        id,
        campi_anonimizzati: conservazione.CAMPI_IDENTIFICATIVI.length,
        atti_clinici_conservati: valutazione.atti_clinici_conservati,
        conservazione_fino_al: valutazione.conservazione_fino_al
    };
}

function registroCancellazioni() {
    return cancellazioni.findAll({});
}

function componiEsportazione(pazienteId) {
    const paziente = pazienti.requireById(pazienteId, { includeArchived: true });
    const dati = raccogli(pazienteId);
    return {
        generato_il: new Date().toISOString(),
        formato: 'adestio-dental-suite/portabilita-1',
        interessato: { ...paziente, nominativo: identita.nominativo(paziente) },
        cartella_clinica: {
            anamnesi: dati.anamnesi,
            odontogramma: dati.odontogramma,
            trattamenti: dati.trattamenti,
            prescrizioni: dati.prescrizioni,
            referti: dati.allegati.map(riga => ({ ...riga, file_path: undefined }))
        },
        agenda: dati.appuntamenti,
        posizione_economica: {
            preventivi: dati.preventivi,
            incassi: dati.incassi,
            piani_rateali: dati.piani_rateali,
            rate: dati.rate
        },
        consensi: dati.consensi,
        comunicazioni: dati.notifiche
    };
}

function anteprimaEsportazione(payload = {}) {
    const documento = componiEsportazione(payload.paziente_id);
    return {
        nominativo: documento.interessato.nominativo,
        sezioni: [
            { etichetta: 'Trattamenti', totale: documento.cartella_clinica.trattamenti.length },
            { etichetta: 'Prescrizioni', totale: documento.cartella_clinica.prescrizioni.length },
            { etichetta: 'Referti', totale: documento.cartella_clinica.referti.length },
            { etichetta: 'Appuntamenti', totale: documento.agenda.length },
            { etichetta: 'Preventivi', totale: documento.posizione_economica.preventivi.length },
            { etichetta: 'Incassi', totale: documento.posizione_economica.incassi.length },
            { etichetta: 'Consensi', totale: documento.consensi.length }
        ]
    };
}

async function esportaPaziente(payload = {}) {
    const documento = componiEsportazione(payload.paziente_id);
    const { dialog, BrowserWindow } = electron();
    const finestra = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;

    const nomeFile = `portabilita_${documento.interessato.cognome || 'paziente'}_${oggiIso()}.json`
        .replace(/[^\w.\-]/g, '_');

    const scelta = await dialog.showSaveDialog(finestra, {
        title: 'Esporta i dati del paziente',
        defaultPath: nomeFile,
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (scelta.canceled || !scelta.filePath) return { annullato: true };

    try {
        fs.writeFileSync(scelta.filePath, JSON.stringify(documento, null, 2), 'utf8');
    } catch (errore) {
        throw storageError(`Scrittura del file non riuscita: ${errore.message}`);
    }

    return { annullato: false, percorso: path.basename(scelta.filePath) };
}

module.exports = {
    valutaCancellazione, anonimizzaPaziente, registroCancellazioni,
    anteprimaEsportazione, esportaPaziente
};
