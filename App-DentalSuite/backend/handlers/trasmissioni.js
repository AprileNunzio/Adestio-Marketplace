'use strict';

const { trasmissioni } = require('../repositories/trasmissione');
const { pari, postazione } = require('../repositories/rete');
const seduta = require('../repositories/seduta_volatile');
const actor = require('../kernel/actor');
const riscontri = require('./riscontri');
const sedute = require('./sedute');
const lettura = require('../repositories/dossier');
const densitaDominio = require('../domain/densita');
const protocollo = require('../rete/protocollo');
const trasporto = require('../rete/trasporto');
const identita = require('../rete/identita');
const scopertaMesh = require('../rete/scoperta_mesh');
const sorveglianza = require('../rete/sorveglianza');
const invio = require('./trasmissioni_invio');

function raggiungibile(voce) {
    try {
        if (!voce) return false;
        if (voce.tipo_connessione === 'canale') return true;
        return Boolean(voce.ip && voce.porta);
    } catch (_) {
        return false;
    }
}

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

        const monitorLan = await scopertaMesh.scansionaMonitors(false);
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

async function postazioniDisponibili() {
    try {
        const dest = await destinazioni();
        const aperte = trasmissioni.findAll({ stato: 'aperta' });
        const chiuseInRiconciliazione = await sedute.riconcilia(aperte, dest);
        const vive = aperte.filter(riga => chiuseInRiconciliazione.indexOf(riga.id) === -1);

        const idsPazienti = [...new Set(vive.map(r => r.paziente_id).filter(Boolean))];
        const nomiPazienti = new Map();
        for (const pid of idsPazienti) {
            try {
                const p = lettura.schedaPaziente(pid);
                if (p) nomiPazienti.set(pid, `${p.cognome || ''} ${p.nome || ''}`.trim());
            } catch (_) {}
        }

        const collegate = dest.map(voce => {
            const attiva = vive.find(r =>
                r.sessione_id === voce.sessione_id
                || (voce.impronta && r.impronta_postazione === voce.impronta)
                || (voce.ip && r.indirizzo_consegna && r.indirizzo_consegna.includes(voce.ip))
            );
            const inSedutaEffettiva = voce.stato_osservato ? Boolean(voce.in_seduta) : Boolean(attiva);
            const pazienteNome = (inSedutaEffettiva && attiva && attiva.paziente_id)
                ? (nomiPazienti.get(attiva.paziente_id) || null)
                : null;
            const raggiungibileOra = voce.tipo_connessione === 'canale' || Boolean(voce.ip);
            return {
                sessione_id: voce.sessione_id,
                nome: voce.nome,
                impronta: voce.impronta,
                indirizzo: voce.indirizzo,
                tipo_connessione: voce.tipo_connessione,
                aperta_il: voce.aperta_il,
                online: raggiungibileOra,
                in_seduta: inSedutaEffettiva,
                trasmissione_id: inSedutaEffettiva && attiva ? attiva.id : null,
                paziente_nome: pazienteNome
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

async function chiudi(payload = {}) {
    try {
        const riga = trasmissioni.requireById(payload.id, { includeArchived: true });
        if (riga.stato !== 'aperta') return { id: riga.id, stato: riga.stato };

        const motivo = payload.motivo || 'seduta chiusa dalla segreteria';
        const esito = await invio.avvisaChiusura(riga, motivo, destinazioni);

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
    } catch (e) {
        throw e;
    }
}

async function diagnosticaRete() {
    try {
        return await scopertaMesh.diagnosticaCompleta();
    } catch (e) {
        return { errore: e.message };
    }
}

async function elencoTrasmissioni(payload = {}) {
    try {
        const righe = trasmissioni.findAll({
            orderBy: 'aperta_il DESC',
            limit: Number(payload.dimensione) || 20
        });
        const idsPazienti = [...new Set(righe.map(r => r.paziente_id).filter(Boolean))];
        const nomiPazienti = new Map();
        for (const pid of idsPazienti) {
            try {
                const p = lettura.schedaPaziente(pid);
                if (p) nomiPazienti.set(pid, `${p.cognome || ''} ${p.nome || ''}`.trim());
            } catch (_) {}
        }
        return {
            righe: righe.map(riga => ({
                ...riga,
                paziente_nome: nomiPazienti.get(riga.paziente_id) || (riga.paziente_id || '-')
            }))
        };
    } catch (_) {
        return { righe: [] };
    }
}

async function dichiaraSchermo(payload = {}) {
    try {
        const id = densitaDominio.identifica(payload);
        return { id, profilo: densitaDominio.trova(id) };
    } catch (_) {
        return { id: 'compatto', profilo: null };
    }
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
    invia: (p) => invio.invia(p, destinazioni),
    chiudi,
    chiudiLocale: invio.chiudiLocale,
    elenco: elencoTrasmissioni,
    dichiaraSchermo,
    scaricaAllegato,
    attiva,
    diagnosticaRete,
    heartbeatPostazione,
    cambiaPaziente: invio.cambiaPaziente,
    propagaAggiornamentoDossier: invio.propagaAggiornamentoDossier,
    chiudiPerRete: riscontri.chiudiPerRete,
    statoSeduta: riscontri.statoSeduta,
    segnalaChiusuraRemota: riscontri.segnalaChiusuraRemota,
    segnalaCambioPaziente: riscontri.segnalaCambioPaziente
};
