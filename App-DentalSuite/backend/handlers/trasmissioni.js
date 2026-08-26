'use strict';

const crypto = require('crypto');
const lettura = require('../repositories/dossier');
const { pazienti } = require('../repositories/clinical');
const { trasmissioni } = require('../repositories/trasmissione');
const seduta = require('../repositories/seduta_volatile');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const dominio = require('../domain/dossier');
const densitaDominio = require('../domain/densita');
const denti = require('../domain/denti');
const { oggiIso } = require('../domain/rateizzazione');
const protocollo = require('../rete/protocollo');
const trasporto = require('../rete/trasporto');
const identita = require('../rete/identita');

const GIORNO_MS = 24 * 60 * 60 * 1000;

function inizioGiornata(riferimento) {
    const data = new Date(riferimento);
    data.setHours(0, 0, 0, 0);
    return data.getTime();
}

function improntaDi(dossier) {
    return crypto.createHash('sha256').update(JSON.stringify(dossier), 'utf8').digest('hex');
}

function componiDossier(pazienteId, dentizione, schermo) {
    const limiti = densitaDominio.limitiDa(schermo);
    const paziente = lettura.schedaPaziente(pazienteId);
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

function destinazioni() {
    return trasporto.stato().canali.filter(voce => voce.ruolo === protocollo.RUOLO_RIUNITO);
}

function postazioniDisponibili() {
    const aperte = trasmissioni.findAll({ stato: 'aperta' });
    const perSessione = new Map(aperte.map(r => [r.sessione_id, r]));

    return destinazioni().map(voce => {
        const attiva = perSessione.get(voce.sessione_id);
        const paziente = attiva && attiva.paziente_id ? lettura.schedaPaziente(attiva.paziente_id) : null;
        return {
            sessione_id: voce.sessione_id,
            nome: voce.nome,
            impronta: voce.impronta,
            indirizzo: voce.indirizzo,
            aperta_il: voce.aperta_il,
            online: true,
            in_seduta: Boolean(attiva),
            trasmissione_id: attiva ? attiva.id : null,
            paziente_nome: paziente ? `${paziente.cognome} ${paziente.nome}`.trim() : (attiva ? 'Paziente in consultazione' : null)
        };
    });
}

async function invia(payload = {}) {
    if (!payload.paziente_id) throw validationError('Selezionare il paziente da trasmettere');

    const aperte = destinazioni();
    if (aperte.length === 0) {
        throw conflictError('Nessun monitor collegato: verificare la rete di studio');
    }

    const sessioni = Array.isArray(payload.sessione_ids) && payload.sessione_ids.length > 0
        ? payload.sessione_ids
        : [payload.sessione_id || (aperte[0] && aperte[0].sessione_id)];

    const risultati = [];
    for (const sessioneId of sessioni) {
        const bersaglio = aperte.find(voce => voce.sessione_id === sessioneId);
        if (!bersaglio) continue;

        const dossier = componiDossier(payload.paziente_id, payload.dentizione, bersaglio.schermo);
        const impronta = improntaDi(dossier);

        const id = await trasmissioni.insert({
            paziente_id: payload.paziente_id,
            sessione_id: bersaglio.sessione_id,
            postazione_nome: bersaglio.nome,
            impronta_postazione: bersaglio.impronta,
            stato: 'aperta',
            aperta_il: Date.now(),
            impronta_dossier: impronta
        }, actor.stamp());

        const consegnato = trasporto.versoRiunito(bersaglio.sessione_id, protocollo.MESSAGGI.dossier, {
            trasmissione_id: id,
            dossier
        });

        if (!consegnato) {
            await trasmissioni.update(id, {
                stato: 'fallita',
                chiusa_il: Date.now(),
                motivo_chiusura: 'Canale non disponibile al momento dell\'invio'
            });
            throw conflictError(`Il canale verso "${bersaglio.nome}" si è chiuso durante l'invio`);
        }

        risultati.push({
            id,
            paziente: dossier.paziente.nominativo,
            postazione: bersaglio.nome,
            impronta_dossier: impronta
        });
    }

    if (risultati.length === 0) {
        throw notFoundError('Nessuna delle postazioni scelte è al momento collegata');
    }

    return risultati.length === 1
        ? risultati[0]
        : { inviati: risultati.length, dettagli: risultati, paziente: risultati[0].paziente, postazione: `${risultati.length} monitor` };
}

async function chiudi(payload = {}) {
    const riga = trasmissioni.requireById(payload.id, { includeArchived: true });
    if (riga.stato !== 'aperta') return { id: riga.id, stato: riga.stato };

    trasporto.versoRiunito(riga.sessione_id, protocollo.MESSAGGI.chiusura, {
        trasmissione_id: riga.id,
        motivo: payload.motivo || 'seduta chiusa dalla segreteria'
    });

    await trasmissioni.update(payload.id, {
        stato: 'chiusa',
        chiusa_il: Date.now(),
        motivo_chiusura: payload.motivo || 'seduta chiusa dalla segreteria'
    }, actor.stamp());

    return { id: payload.id, stato: 'chiusa' };
}

function elenco(payload = {}) {
    const filtri = [];
    if (payload.paziente_id) filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    if (payload.stato) filtri.push({ colonna: 'stato', operatore: 'eq', valore: payload.stato });
    const pagina = trasmissioni.findPage({ filtri, pagina: payload.pagina, dimensione: payload.dimensione || 25 });
    const anagrafiche = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(pagina.righe, 'paziente_id'));
    return {
        ...pagina,
        righe: pagina.righe.map(riga => ({
            ...riga,
            paziente_nome: anagrafiche.has(riga.paziente_id)
                ? `${anagrafiche.get(riga.paziente_id).cognome} ${anagrafiche.get(riga.paziente_id).nome}`.trim()
                : ''
        }))
    };
}

function postazioni() {
    return {
        collegate: postazioniDisponibili(),
        rete: trasporto.stato().postazione
    };
}

const BLOCCHI_MASSIMI = 120;

async function scaricaAllegato(payload = {}) {
    if (!payload.id) throw validationError('Identificativo del referto mancante');
    const istantanea = seduta.istantanea();
    if (!istantanea.presente) throw conflictError('Nessuna scheda paziente attiva su questa postazione');

    const appartiene = (istantanea.dossier.referti || []).some(voce => voce.id === payload.id);
    if (!appartiene) throw conflictError('Il referto non appartiene alla scheda in corso');

    const porzioni = [];
    let intestazione = null;
    let blocco = 0;

    while (blocco < BLOCCHI_MASSIMI) {
        const risposta = await trasporto.versoArchivio(protocollo.MESSAGGI.allegato, {
            id: payload.id,
            blocco,
            variante: payload.variante || 'visione'
        });
        if (!risposta || risposta.accettato !== true) {
            throw conflictError((risposta && risposta.motivo) || 'Referto non disponibile');
        }
        const porzione = risposta.porzione;
        if (!intestazione) intestazione = porzione;
        porzioni.push(porzione.dati);
        blocco += 1;
        if (blocco >= porzione.blocchi) break;
    }

    seduta.tocca();
    return {
        id: intestazione.id,
        titolo: intestazione.titolo,
        variante: intestazione.variante,
        mime: intestazione.mime,
        immagine: intestazione.immagine,
        dimensione: intestazione.dimensione_totale,
        blocchi: porzioni.length,
        contenuto: `data:${intestazione.mime};base64,${porzioni.join('')}`
    };
}

async function dichiaraSchermo(payload = {}) {
    const schermo = densitaDominio.normalizzaSchermo(payload);
    seduta.tocca();
    try {
        await trasporto.versoArchivio(protocollo.MESSAGGI.presenza, { schermo });
        return { ...densitaDominio.descrivi(schermo), dichiarato: true };
    } catch (errore) {
        return { ...densitaDominio.descrivi(schermo), dichiarato: false, messaggio: errore.message };
    }
}

function attiva(payload = {}) {
    seduta.tocca();
    if (payload.attendi === true) return seduta.attendi(payload.versione);
    return Promise.resolve(seduta.istantanea());
}

async function chiudiLocale(payload = {}) {
    const istantanea = seduta.istantanea();
    if (istantanea.presente && istantanea.trasmissione_id) {
        try {
            await trasporto.versoArchivio(protocollo.MESSAGGI.chiusura, {
                trasmissione_id: istantanea.trasmissione_id,
                motivo: payload.motivo || 'seduta chiusa dal riunito'
            });
        } catch (errore) {
            seduta.svuota(errore.message);
            return { versione: seduta.istantanea().versione, riallineato: false };
        }
    }
    const versione = seduta.svuota(payload.motivo || 'seduta chiusa dal riunito');
    return { versione, riallineato: true };
}

function accogli(messaggio) {
    if (messaggio.tipo === protocollo.MESSAGGI.dossier) {
        const contenuto = messaggio.contenuto || {};
        seduta.riponi(contenuto.dossier || null, {
            trasmissione_id: contenuto.trasmissione_id || '',
            origine: contenuto.dossier ? contenuto.dossier.origine : ''
        });
        return { accettato: true };
    }
    if (messaggio.tipo === protocollo.MESSAGGI.chiusura) {
        seduta.svuota((messaggio.contenuto && messaggio.contenuto.motivo) || 'chiusura dalla segreteria');
        return { accettato: true };
    }
    return { accettato: false, motivo: `Messaggio non gestito dal riunito: ${messaggio.tipo}` };
}

async function chiudiPerSessione(sessioneId, motivo) {
    const aperte = trasmissioni.findAll({ where: { stato: 'aperta', sessione_id: sessioneId } });
    for (const riga of aperte) {
        await trasmissioni.update(riga.id, {
            stato: 'chiusa',
            chiusa_il: Date.now(),
            motivo_chiusura: motivo || 'canale chiuso'
        });
    }
    return aperte.length;
}

module.exports = {
    invia,
    dichiaraSchermo,
    scaricaAllegato,
    chiudi,
    elenco,
    postazioni,
    attiva,
    chiudiLocale,
    accogli,
    chiudiPerSessione,
    componiDossier
};
