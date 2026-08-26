'use strict';

const crypto = require('crypto');
const lettura = require('../repositories/dossier');
const { pazienti } = require('../repositories/clinical');
const { trasmissioni } = require('../repositories/trasmissione');
const { postazione } = require('../repositories/rete');
const seduta = require('../repositories/seduta_volatile');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const dominio = require('../domain/dossier');
const densitaDominio = require('../domain/densita');
const denti = require('../domain/denti');
const { oggiIso } = require('../domain/rateizzazione');
const protocollo = require('../rete/protocollo');
const trasporto = require('../rete/trasporto');
const identita = require('../rete/identita');
const scopertaMesh = require('../rete/scoperta_mesh');
const http = require('http');

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

function trasmettiDiretto(ip, porta, payloadCorpo) {
    return new Promise((resolve) => {
        try {
            const data = JSON.stringify(payloadCorpo);
            const req = http.request({
                hostname: ip,
                port: porta,
                path: '/trasmetti-diretto',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                },
                timeout: 2500
            }, (res) => {
                if (res.statusCode === 200) resolve(true);
                else resolve(false);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { try { req.destroy(); } catch (_) {} resolve(false); });
            req.write(data);
            req.end();
        } catch (_) {
            resolve(false);
        }
    });
}

async function destinazioni() {
    try {
        const mappa = new Map();
        const locale = await identita.assicura();
        const postazioniDb = postazione.findAll({ includeArchived: true });

        for (const p of postazioniDb) {
            if (p.is_deleted) continue;
            if (locale && p.id === locale.id && p.ruolo !== protocollo.RUOLO_RIUNITO) continue;

            mappa.set(p.id, {
                sessione_id: p.id,
                nome: p.nome || 'Monitor Studio',
                impronta: p.impronta || p.id,
                indirizzo: p.indirizzo_archivio || 'Rete DAG Nodi',
                ip: '',
                porta: p.porta || protocollo.PORTA_SERVIZIO,
                ruolo: p.ruolo || protocollo.RUOLO_RIUNITO,
                aperta_il: p.last_modified || p.created_at || Date.now(),
                in_seduta: false,
                tipo_connessione: 'dag_mesh'
            });
        }

        const canaliLocali = trasporto.stato().canali.filter(voce => voce.ruolo === protocollo.RUOLO_RIUNITO);
        for (const voce of canaliLocali) {
            mappa.set(voce.sessione_id, {
                ...voce,
                tipo_connessione: 'canale'
            });
        }

        const monitorLan = await scopertaMesh.scansionaMonitors();
        for (const m of monitorLan) {
            const idSessione = `lan-${m.ip}:${m.porta}`;
            if (!mappa.has(idSessione)) {
                mappa.set(idSessione, {
                    sessione_id: idSessione,
                    nome: m.nome || `Studio (${m.ip})`,
                    impronta: m.impronta || m.id,
                    indirizzo: m.indirizzo,
                    ip: m.ip,
                    porta: m.porta,
                    ruolo: protocollo.RUOLO_RIUNITO,
                    aperta_il: Date.now(),
                    in_seduta: Boolean(m.in_seduta),
                    tipo_connessione: 'diretto'
                });
            }
        }

        return Array.from(mappa.values());
    } catch (_) {
        return [];
    }
}

async function postazioniDisponibili() {
    try {
        const aperte = trasmissioni.findAll({ stato: 'aperta' });
        const perSessione = new Map(aperte.map(r => [r.sessione_id, r]));
        const dest = await destinazioni();

        return dest.map(voce => {
            const attiva = perSessione.get(voce.sessione_id);
            const paziente = attiva && attiva.paziente_id ? lettura.schedaPaziente(attiva.paziente_id) : null;
            return {
                sessione_id: voce.sessione_id,
                nome: voce.nome,
                impronta: voce.impronta,
                indirizzo: voce.indirizzo,
                aperta_il: voce.aperta_il,
                online: true,
                in_seduta: Boolean(attiva || voce.in_seduta),
                trasmissione_id: attiva ? attiva.id : null,
                paziente_nome: paziente ? `${paziente.cognome} ${paziente.nome}`.trim() : (attiva ? 'Paziente in consultazione' : null)
            };
        });
    } catch (_) {
        return [];
    }
}

async function invia(payload = {}) {
    if (!payload.paziente_id) throw validationError('Selezionare il paziente da trasmettere');

    const dest = await destinazioni();
    if (dest.length === 0) {
        throw conflictError('Nessun monitor rilevato nello studio');
    }

    const sessioni = Array.isArray(payload.sessione_ids) && payload.sessione_ids.length > 0
        ? payload.sessione_ids
        : [payload.sessione_id || (dest[0] && dest[0].sessione_id)];

    const risultati = [];
    const locale = identita.scheda();

    for (const sessioneId of sessioni) {
        const bersaglio = dest.find(voce => voce.sessione_id === sessioneId);
        if (!bersaglio) continue;

        const dossier = componiDossier(payload.paziente_id, payload.dentizione, bersaglio.schermo);
        if (!dossier) continue;
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

        seduta.riponi(dossier, {
            trasmissione_id: id,
            origine: locale ? locale.nome : 'Segreteria'
        });

        if (bersaglio.ip && bersaglio.porta) {
            trasmettiDiretto(bersaglio.ip, bersaglio.porta, {
                trasmissione_id: id,
                dossier,
                origine: locale ? locale.nome : 'Segreteria'
            }).catch(() => {});
        } else if (bersaglio.tipo_connessione === 'canale') {
            trasporto.versoRiunito(bersaglio.sessione_id, protocollo.MESSAGGI.dossier, {
                trasmissione_id: id,
                dossier
            });
        }

        risultati.push({
            id,
            paziente: dossier.paziente.nominativo,
            postazione: bersaglio.nome,
            impronta_dossier: impronta
        });
    }

    if (risultati.length === 0) {
        throw notFoundError('Impossibile completare la trasmissione ai monitor selezionati');
    }

    return risultati.length === 1
        ? risultati[0]
        : { inviati: risultati.length, dettagli: risultati, paziente: risultati[0].paziente, postazione: `${risultati.length} monitor` };
}

async function diagnosticaRete() {
    try {
        return await scopertaMesh.diagnosticaCompleta();
    } catch (e) {
        return { errore: e.message };
    }
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

async function chiudiLocale(payload = {}) {
    seduta.svuota(payload.motivo || 'chiusura dal monitor');
    const aperte = trasmissioni.findAll({ stato: 'aperta' });
    const locale = identita.scheda();
    for (const riga of aperte) {
        if (!locale || riga.sessione_id === locale.id || riga.impronta_postazione === locale.impronta) {
            await trasmissioni.update(riga.id, {
                stato: 'chiusa',
                chiusa_il: Date.now(),
                motivo_chiusura: payload.motivo || 'chiusura dal monitor'
            }, actor.stamp());
        }
    }
    return { chiuso: true };
}

async function elencoTrasmissioni(payload = {}) {
    const righe = trasmissioni.findAll({
        orderBy: 'aperta_il DESC',
        limit: Number(payload.dimensione) || 20
    });
    return {
        righe: righe.map(riga => {
            const paziente = riga.paziente_id ? lettura.schedaPaziente(riga.paziente_id) : null;
            return {
                ...riga,
                paziente_nome: paziente ? `${paziente.cognome} ${paziente.nome}`.trim() : (riga.paziente_id || '-')
            };
        })
    };
}

async function dichiaraSchermo(payload = {}) {
    const id = densitaDominio.identifica(payload);
    return { id, profilo: densitaDominio.trova(id) };
}

async function attiva(payload = {}) {
    const locale = seduta.estrai();
    if (locale && locale.presente && locale.dossier) {
        return locale;
    }

    const aperte = trasmissioni.findAll({
        stato: 'aperta',
        orderBy: 'aperta_il DESC',
        limit: 1
    });

    if (aperte.length > 0) {
        const riga = aperte[0];
        const dossier = componiDossier(riga.paziente_id);
        if (dossier) {
            return {
                presente: true,
                versione: riga.aperta_il || riga.last_modified || Date.now(),
                trasmissione_id: riga.id,
                origine: riga.postazione_nome || 'Segreteria',
                dossier
            };
        }
    }

    return {
        presente: false,
        versione: 0,
        motivo: 'In attesa di trasmissione cartella clinica'
    };
}

async function heartbeatPostazione(payload = {}) {
    try {
        const locale = await identita.assicura();
        if (locale) {
            await postazione.update(locale.id, {
                attiva: 1,
                last_modified: Date.now()
            });
        }
        return { successo: true };
    } catch (_) {
        return { successo: false };
    }
}

module.exports = {
    destinazioni,
    postazioni: postazioniDisponibili,
    invia,
    chiudi,
    chiudiLocale,
    elenco: elencoTrasmissioni,
    dichiaraSchermo,
    attiva,
    diagnosticaRete,
    heartbeatPostazione
};
