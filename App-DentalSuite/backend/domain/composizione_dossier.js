'use strict';

const crypto = require('crypto');
const lettura = require('../repositories/dossier');
const dominio = require('../domain/dossier');
const densitaDominio = require('../domain/densita');
const denti = require('../domain/denti');
const { oggiIso } = require('../domain/rateizzazione');
const identita = require('../rete/identita');

const GIORNO_MS = 24 * 60 * 60 * 1000;

function inizioGiornata(istante) {
    const data = new Date(istante);
    data.setHours(0, 0, 0, 0);
    return data.getTime();
}

function improntaDi(dossier) {
    return crypto.createHash('sha256').update(JSON.stringify(dossier), 'utf8').digest('hex');
}

function componiDossier(pazienteId, dentizione, schermo) {
    const limiti = densitaDominio.limitiDa(schermo);
    const paziente = lettura.schedaPaziente(pazienteId);
    if (!paziente) return null;
    const trattamentiRecenti = lettura.trattamentiRecenti(pazienteId, limiti.trattamenti);
    const prescrizioniRecenti = lettura.prescrizioniRecenti(pazienteId, limiti.prescrizioni);
    const inizio = inizioGiornata(Date.now());
    const appuntamenti = lettura.appuntamentiDelGiorno(pazienteId, inizio, inizio + GIORNO_MS);
    const locale = identita.scheda();

    return dominio.componi({
        oggi: oggiIso(),
        origine: locale ? locale.nome : '',
        schermo,
        dentizione: dentizione || denti.PERMANENTE,
        paziente,
        anamnesi: lettura.schedaAnamnesi(pazienteId),
        denti: lettura.dentiRegistrati(pazienteId, dentizione || denti.PERMANENTE),
        rilevazioni: lettura.rilevazioniRecenti(pazienteId, limiti.rilevazioni),
        trattamenti: trattamentiRecenti,
        prescrizioni: prescrizioniRecenti,
        referti: lettura.refertiRecenti(pazienteId, limiti.referti),
        appuntamenti,
        consensi: lettura.consensiDi(pazienteId),
        nominativi: lettura.nominativiStaff([].concat(trattamentiRecenti, prescrizioniRecenti, appuntamenti)),
        catalogo: lettura.catalogoPrestazioni([].concat(trattamentiRecenti, appuntamenti))
    });
}

module.exports = { componiDossier, improntaDi };
