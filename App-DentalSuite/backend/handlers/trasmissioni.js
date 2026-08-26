'use strict';

const { pazienti } = require('../repositories/clinical');
const { trasmissioni } = require('../repositories/trasmissione');
const { pari, postazione } = require('../repositories/rete');
const seduta = require('../repositories/seduta_volatile');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riscontri = require('./riscontri');
const sedute = require('./sedute');
const lettura = require('../repositories/dossier');
const densitaDominio = require('../domain/densita');
const { componiDossier, improntaDi } = require('../domain/composizione_dossier');
const database = require('../kernel/database');
const protocollo = require('../rete/protocollo');
const trasporto = require('../rete/trasporto');
const identita = require('../rete/identita');
const scopertaMesh = require('../rete/scoperta_mesh');
const sorveglianza = require('../rete/sorveglianza');
const consegna = require('../rete/consegna');




async function destinazioni() {
    try {
        const mappa = new Map();

        const pariAccoppiate = pari.findAll({}).filter(voce =>
            !voce.is_deleted
            && voce.ruolo === protocollo.RUOLO_RIUNITO
            && voce.ultimo_indirizzo
        );

        for (const voce of pariAccoppiate) {
            mappa.set(voce.id, {
                sessione_id: voce.id,
                nome: voce.nome || 'Monitor Studio',
                impronta: voce.impronta || voce.id,
                indirizzo: `${voce.ultimo_indirizzo}:${voce.ultima_porta || protocollo.PORTA_SERVIZIO}`,
                ip: voce.ultimo_indirizzo,
                porta: Number(voce.ultima_porta) || protocollo.PORTA_SERVIZIO,
                ruolo: protocollo.RUOLO_RIUNITO,
                aperta_il: voce.ultimo_contatto || voce.last_modified || Date.now(),
                in_seduta: false,
                stato_osservato: false,
                tipo_connessione: 'accoppiata'
            });
        }

        const canaliLocali = trasporto.stato().canali.filter(voce => voce.ruolo === protocollo.RUOLO_RIUNITO);
        for (const voce of canaliLocali) {
            mappa.set(voce.sessione_id, {
                ...voce,
                stato_osservato: false,
                tipo_connessione: 'canale'
            });
        }

        const monitorLan = await scopertaMesh.scansionaMonitors(true);
        for (const m of monitorLan) {
            const idSessione = `lan-${m.ip}:${m.porta}`;
            const perImpronta = [...mappa.values()].find(voce => m.impronta && voce.impronta === m.impronta);
            if (perImpronta) {
                perImpronta.ip = m.ip;
                perImpronta.porta = m.porta;
                perImpronta.indirizzo = m.indirizzo;
                perImpronta.in_seduta = Boolean(m.in_seduta);
                perImpronta.stato_osservato = true;
                continue;
            }
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
                    stato_osservato: true,
                    tipo_connessione: 'diretto'
                });
            }
        }

        return [...mappa.values()].filter(raggiungibile);
    } catch (_) {
        return [];
    }
}

function raggiungibile(voce) {
    if (!voce) return false;
    if (voce.tipo_connessione === 'canale') return true;
    return Boolean(voce.ip && voce.porta);
}

async function postazioniDisponibili() {
    try {
        const dest = await destinazioni();
        const aperte = trasmissioni.findAll({ stato: 'aperta' });
        const chiuseInRiconciliazione = await sedute.riconcilia(aperte, dest);

        const vive = aperte.filter(riga => chiuseInRiconciliazione.indexOf(riga.id) === -1);
        const perSessione = new Map(vive.map(r => [r.sessione_id, r]));
        const perImpronta = new Map(vive.filter(r => r.impronta_postazione).map(r => [r.impronta_postazione, r]));

        const collegate = dest.map(voce => {
            const attiva = perSessione.get(voce.sessione_id)
                || (voce.impronta ? perImpronta.get(voce.impronta) : null);
            const paziente = attiva && attiva.paziente_id ? lettura.schedaPaziente(attiva.paziente_id) : null;
            const raggiungibileOra = voce.tipo_connessione === 'canale' || Boolean(voce.ip);
            return {
                sessione_id: voce.sessione_id,
                nome: voce.nome,
                impronta: voce.impronta,
                indirizzo: voce.indirizzo,
                tipo_connessione: voce.tipo_connessione,
                aperta_il: voce.aperta_il,
                online: raggiungibileOra,
                in_seduta: Boolean(voce.in_seduta || attiva),
                trasmissione_id: attiva ? attiva.id : null,
                paziente_nome: paziente ? `${paziente.cognome} ${paziente.nome}`.trim() : (attiva ? 'Paziente in consultazione' : null)
            };
        });

        const irraggiungibili = vive
            .filter(riga => !dest.some(voce =>
                voce.sessione_id === riga.sessione_id
                || (riga.impronta_postazione && voce.impronta === riga.impronta_postazione)))
            .map(riga => ({
                trasmissione_id: riga.id,
                nome: riga.postazione_nome || 'Monitor',
                motivo: 'monitor non raggiungibile'
            }));

        return { collegate, irraggiungibili, rete: trasporto.stato() };
    } catch (_) {
        return { collegate: [], irraggiungibili: [], rete: null };
    }
}

async function invia(payload = {}) {
    if (!payload.paziente_id) throw validationError('Selezionare il paziente da trasmettere');

    const dest = await destinazioni();
    if (dest.length === 0) {
        throw conflictError('Nessun monitor raggiungibile nello studio');
    }

    const sessioni = Array.isArray(payload.sessione_ids) && payload.sessione_ids.length > 0
        ? payload.sessione_ids
        : [payload.sessione_id || (dest[0] && dest[0].sessione_id)];

    const locale = identita.scheda();
    const origine = locale ? locale.nome : 'Segreteria';
    const riusciti = [];
    const falliti = [];

    for (const sessioneId of sessioni) {
        const bersaglio = dest.find(voce =>
            voce.sessione_id === sessioneId
            || (voce.impronta && (voce.impronta === sessioneId || String(sessioneId).includes(voce.impronta)))
            || (voce.ip && (String(sessioneId).includes(voce.ip) || (voce.sessione_id && voce.sessione_id.includes(voce.ip))))
        );
        if (!bersaglio) {
            falliti.push({ sessione_id: sessioneId, postazione: sessioneId, motivo: 'monitor non piu raggiungibile' });
            continue;
        }

        const dossier = componiDossier(payload.paziente_id, payload.dentizione, bersaglio.schermo);
        if (!dossier) {
            falliti.push({ sessione_id: sessioneId, postazione: bersaglio.nome, motivo: 'cartella clinica non componibile' });
            continue;
        }

        const impronta = improntaDi(dossier);
        const trasmissioneId = database.newId();
        const busta = {
            trasmissione_id: trasmissioneId,
            dossier,
            origine,
            origine_impronta: locale ? locale.impronta : '',
            origine_porta: locale ? locale.porta : protocollo.PORTA_SERVIZIO
        };

        let esito = { consegnato: false, motivo: 'nessun trasporto disponibile per questo monitor' };

        if (bersaglio.tipo_connessione === 'canale') {
            const inviato = trasporto.versoRiunito(bersaglio.sessione_id, protocollo.MESSAGGI.dossier, {
                trasmissione_id: trasmissioneId,
                dossier
            });
            esito = inviato
                ? { consegnato: true, motivo: '' }
                : { consegnato: false, motivo: 'canale cifrato non piu attivo' };
        } else if (bersaglio.ip && bersaglio.porta) {
            esito = await consegna.trasmettiDiretto(bersaglio.ip, bersaglio.porta, busta);
        }

        if (!esito.consegnato) {
            falliti.push({ sessione_id: sessioneId, postazione: bersaglio.nome, motivo: esito.motivo });
            continue;
        }

        await sedute.chiudiPrecedenti(bersaglio, trasmissioneId);

        await trasmissioni.insert({
            id: trasmissioneId,
            paziente_id: payload.paziente_id,
            sessione_id: bersaglio.sessione_id,
            postazione_nome: bersaglio.nome,
            impronta_postazione: bersaglio.impronta,
            stato: 'aperta',
            aperta_il: Date.now(),
            impronta_dossier: impronta,
            indirizzo_consegna: bersaglio.ip ? `${bersaglio.ip}:${bersaglio.porta}` : ''
        }, actor.stamp());

        riusciti.push({
            id: trasmissioneId,
            paziente: dossier.paziente.nominativo,
            postazione: bersaglio.nome,
            impronta_dossier: impronta
        });
    }

    if (riusciti.length === 0) {
        const motivo = falliti.length > 0
            ? falliti.map(voce => `${voce.postazione}: ${voce.motivo}`).join(' · ')
            : 'nessun monitor selezionato';
        throw conflictError(`Trasmissione non riuscita — ${motivo}`);
    }

    if (riusciti.length === 1 && falliti.length === 0) {
        return riusciti[0];
    }

    return {
        inviati: riusciti.length,
        non_riusciti: falliti.length,
        dettagli: riusciti,
        falliti,
        paziente: riusciti[0].paziente,
        postazione: falliti.length === 0
            ? `${riusciti.length} monitor`
            : `${riusciti.length} monitor su ${riusciti.length + falliti.length}`
    };
}

async function avvisaChiusura(riga, motivo) {
    const busta = { trasmissione_id: riga.id, motivo };

    const inviato = trasporto.versoRiunito(riga.sessione_id, protocollo.MESSAGGI.chiusura, busta);
    if (inviato) return { consegnato: true, motivo: '' };

    const memorizzato = consegna.recapitoDa(riga.indirizzo_consegna);
    if (memorizzato) {
        const esito = await consegna.conRitentativo(memorizzato.ip, memorizzato.porta, '/chiudi-diretto', busta);
        if (esito.consegnato) return esito;
    }

    const dest = await destinazioni();
    const bersaglio = dest.find(voce =>
        voce.sessione_id === riga.sessione_id
        || (riga.impronta_postazione && voce.impronta === riga.impronta_postazione)
    );

    if (bersaglio && bersaglio.ip && bersaglio.porta) {
        const gia = memorizzato && memorizzato.ip === bersaglio.ip && memorizzato.porta === bersaglio.porta;
        if (!gia) {
            return consegna.conRitentativo(bersaglio.ip, bersaglio.porta, '/chiudi-diretto', busta);
        }
    }

    return {
        consegnato: false,
        motivo: memorizzato
            ? `il monitor ${memorizzato.ip}:${memorizzato.porta} non ha risposto`
            : 'monitor non raggiungibile'
    };
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

    const motivo = payload.motivo || 'seduta chiusa dalla segreteria';
    const esito = await avvisaChiusura(riga, motivo);

    await trasmissioni.update(payload.id, {
        stato: 'chiusa',
        chiusa_il: Date.now(),
        motivo_chiusura: motivo
    }, actor.stamp());

    return {
        id: payload.id,
        stato: 'chiusa',
        monitor_avvisato: esito.consegnato,
        avviso_motivo: esito.motivo
    };
}

async function chiudiLocale(payload = {}) {
    const motivo = payload.motivo || 'seduta chiusa dal medico';
    const istantanea = seduta.estrai();
    const trasmissioneId = istantanea && istantanea.trasmissione_id ? istantanea.trasmissione_id : '';
    const mittente = seduta.mittente();

    seduta.svuota(motivo);

    const aperte = trasmissioni.findAll({ stato: 'aperta' });
    const locale = identita.scheda();
    for (const riga of aperte) {
        if (!locale || riga.sessione_id === locale.id || riga.impronta_postazione === locale.impronta) {
            await trasmissioni.update(riga.id, {
                stato: 'chiusa',
                chiusa_il: Date.now(),
                motivo_chiusura: motivo
            }, actor.stamp());
        }
    }

    let segreteriaAvvisata = false;
    if (mittente && mittente.ip && trasmissioneId) {
        const esito = await consegna.conRitentativo(mittente.ip, mittente.porta, '/seduta-chiusa', {
            trasmissione_id: trasmissioneId,
            motivo
        });
        segreteriaAvvisata = esito.consegnato;
    }

    return { chiuso: true, segreteria_avvisata: segreteriaAvvisata };
}

async function cambiaPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Selezionare il paziente da visualizzare');

    const dossier = componiDossier(payload.paziente_id, payload.dentizione);
    if (!dossier) throw notFoundError('Cartella clinica non disponibile su questa postazione');

    const istantanea = seduta.estrai();
    const trasmissioneId = istantanea && istantanea.trasmissione_id
        ? istantanea.trasmissione_id
        : database.newId();

    const locale = identita.scheda();
    const versione = seduta.riponi(dossier, {
        trasmissione_id: trasmissioneId,
        origine: locale ? locale.nome : 'Monitor'
    }, seduta.mittente());

    const mittente = seduta.mittente();
    if (mittente && mittente.ip) {
        consegna.conRitentativo(mittente.ip, mittente.porta, '/paziente-cambiato', {
            trasmissione_id: trasmissioneId,
            paziente_id: payload.paziente_id,
            paziente: dossier.paziente.nominativo
        }).catch(() => {});
    }

    return { versione, paziente: dossier.paziente.nominativo };
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
    try {
        if (payload.attendi === true) {
            const aggiornata = await seduta.attendi(payload.versione);
            return {
                presente: Boolean(aggiornata && aggiornata.presente && aggiornata.dossier),
                versione: (aggiornata && aggiornata.versione) || 0,
                trasmissione_id: (aggiornata && aggiornata.trasmissione_id) || '',
                origine: (aggiornata && aggiornata.origine) || '',
                dossier: (aggiornata && aggiornata.dossier) || null,
                motivo: (aggiornata && aggiornata.origine) || ''
            };
        }

        const locale = seduta.estrai();
        if (locale && locale.presente && locale.dossier) {
            return locale;
        }

        return {
            presente: false,
            versione: locale ? locale.versione : 0,
            motivo: sorveglianza.stato().raggiunta === false && seduta.silenzioDa() > 0
                ? 'Collegamento con la segreteria interrotto'
                : 'In attesa di trasmissione cartella clinica'
        };
    } catch (_) {
        return { presente: false, versione: 0 };
    }
}

async function scaricaAllegato(payload = {}) {
    try {
        const allegati = require('../repositories/allegati');
        if (!payload.id) return { successo: false, errore: 'ID allegato mancante' };
        const record = await allegati.get(payload.id);
        return { successo: Boolean(record), allegato: record };
    } catch (e) {
        return { successo: false, errore: e.message };
    }
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
    scaricaAllegato,
    attiva,
    diagnosticaRete,
    heartbeatPostazione,
    cambiaPaziente,
    chiudiPerRete: riscontri.chiudiPerRete,
    statoSeduta: riscontri.statoSeduta,
    segnalaChiusuraRemota: riscontri.segnalaChiusuraRemota,
    segnalaCambioPaziente: riscontri.segnalaCambioPaziente
};
