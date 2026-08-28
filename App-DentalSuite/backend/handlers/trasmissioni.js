'use strict';

const diario = require('../rete/diario');

const { trasmissioni } = require('../repositories/trasmissione');
const { postazione } = require('../repositories/rete');
const seduta = require('../repositories/seduta_volatile');
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
const riconciliazione = require('../domain/riconciliazione');
const presenza = require('../domain/rete/presenza');
const rilancio = require('../rete/rilancio');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');

function raggiungibile(voce) {
    if (!voce) return false;
    if (voce.tipo_connessione === 'canale') return true;
    return Boolean(voce.stato_osservato);
}

function nomiDi(righe) {
    const nomi = new Map();
    const ids = [...new Set(righe.map(riga => riga.paziente_id).filter(Boolean))];
    for (const pid of ids) {
        try {
            const scheda = lettura.schedaPaziente(pid);
            if (scheda) nomi.set(pid, `${scheda.cognome || ''} ${scheda.nome || ''}`.trim());
        } catch (errore) { diario.annota('trasmissioni:1', errore); }
    }
    return nomi;
}

async function destinazioni(forza = true) {
    const mappa = new Map();
    const monitorLan = await scopertaMesh.scansionaMonitors(forza);

    const canaliLocali = trasporto.stato().canali.filter(voce => voce.ruolo === protocollo.RUOLO_RIUNITO);
    for (const voce of canaliLocali) {
        mappa.set(voce.sessione_id, {
            ...voce,
            stato_osservato: true,
            tipo_connessione: 'canale'
        });
    }

    for (const m of monitorLan) {
        if (!m || !m.ip) continue;
        const porta = Number(m.porta) || protocollo.PORTA_SERVIZIO;
        const chiave = `${m.ip}:${porta}`;
        if (mappa.has(chiave)) continue;
        mappa.set(chiave, {
            sessione_id: `lan-${chiave}`,
            nome: m.nome || `Studio (${m.ip})`,
            poltrona_id: m.poltrona_id || '',
            poltrona_nome: m.poltrona_nome || '',
            etichetta: presenza.etichettaPostazione(m) || `Studio (${m.ip})`,
            impronta: m.impronta || m.id || chiave,
            indirizzo: chiave,
            ip: m.ip,
            porta,
            ruolo: protocollo.RUOLO_RIUNITO,
            aperta_il: Date.now(),
            occupato: Boolean(m.occupato),
            stato_osservato: true,
            tipo_connessione: 'diretto'
        });
    }

    return [...mappa.values()].filter(raggiungibile);
}

function componiCollegata(voce, riga, nomiPazienti) {
    const osservato = riconciliazione.osservabile(voce);
    const inSeduta = osservato ? Boolean(voce.occupato) : Boolean(riga);
    const nomeDaRiga = riga && riga.paziente_id ? nomiPazienti.get(riga.paziente_id) : null;

    return {
        sessione_id: voce.sessione_id,
        nome: voce.nome,
        poltrona_id: voce.poltrona_id || '',
        poltrona_nome: voce.poltrona_nome || '',
        etichetta: presenza.etichettaPostazione(voce) || voce.nome,
        impronta: voce.impronta,
        indirizzo: voce.indirizzo,
        ip: voce.ip || '',
        porta: voce.porta || 0,
        tipo_connessione: voce.tipo_connessione,
        aperta_il: voce.aperta_il,
        online: true,
        in_seduta: inSeduta,
        trasmissione_id: riga ? riga.id : null,
        paziente_nome: inSeduta ? (nomeDaRiga || 'Paziente in visita') : null
    };
}

function componiOrfana(riga, nomiPazienti) {
    const recapito = riconciliazione.recapitoRiga(riga);
    const etichetta = riga.poltrona_nome || riga.postazione_nome || 'Monitor dello studio';
    return {
        sessione_id: riga.sessione_id || riga.id,
        nome: riga.postazione_nome || 'Monitor dello studio',
        poltrona_id: riga.poltrona_id || '',
        poltrona_nome: riga.poltrona_nome || '',
        etichetta,
        impronta: riga.impronta_postazione || '',
        indirizzo: riga.indirizzo_consegna || 'Rete locale LAN',
        ip: recapito.ip,
        porta: recapito.ip ? recapito.porta : 0,
        tipo_connessione: 'diretto',
        aperta_il: riga.aperta_il || Date.now(),
        online: false,
        in_seduta: true,
        trasmissione_id: riga.id,
        paziente_nome: nomiPazienti.get(riga.paziente_id) || 'Paziente in visita'
    };
}

async function postazioniDisponibili(payload = {}) {
    const dest = await destinazioni(payload.forza !== false);
    const aperte = trasmissioni.findAll({ where: { stato: 'aperta' } });
    const chiuse = await sedute.riconcilia(aperte, dest);
    const vive = aperte.filter(riga => chiuse.indexOf(riga.id) === -1);
    const nomiPazienti = nomiDi(vive);

    const collegate = dest.map(voce => componiCollegata(
        voce,
        vive.find(riga => riconciliazione.corrisponde(riga, voce)) || null,
        nomiPazienti
    ));

    const orfane = vive.filter(riga => !dest.some(voce => riconciliazione.corrisponde(riga, voce)));
    for (const riga of orfane) {
        collegate.push(componiOrfana(riga, nomiPazienti));
    }

    return { collegate, irraggiungibili: orfane.map(riga => riga.id), rete: trasporto.stato() };
}

async function avvisaChiusuraNodi(recapiti, motivo, trasmissioneId) {
    const consegna = require('../rete/consegna');
    let avvisati = 0;
    let accodati = 0;

    for (const recapito of recapiti) {
        const esito = await consegna.conRitentativo(recapito.ip, recapito.porta, '/chiudi-diretto', {
            motivo,
            trasmissione_id: trasmissioneId || ''
        });
        if (esito.consegnato) {
            avvisati += 1;
            scopertaMesh.impostaStato(recapito.ip, false);
            continue;
        }
        await rilancio.accodaChiusura(recapito, motivo, trasmissioneId);
        accodati += 1;
    }

    return { avvisati, accodati };
}

async function chiudi(payload = {}) {
    const motivo = payload.motivo || 'seduta chiusa dalla segreteria';
    const riga = payload.id ? trasmissioni.findById(payload.id, { includeArchived: true }) : null;
    if (payload.id && !riga) throw notFoundError('Trasmissione non trovata');

    const dest = await destinazioni(true);
    const criterio = riconciliazione.criterioDaPayload(payload, riga);
    const nodo = riconciliazione.risolviNodo(dest, criterio);
    const recapiti = riconciliazione.recapitiDiChiusura(nodo, criterio);

    if (!riga && recapiti.length === 0) {
        throw validationError('Monitor da chiudere non identificabile');
    }

    const consegne = await avvisaChiusuraNodi(recapiti, motivo, riga ? riga.id : '');

    const aperte = trasmissioni.findAll({ where: { stato: 'aperta' } });
    const candidati = new Set([
        ...(nodo ? riconciliazione.righeDelNodo(aperte, nodo) : []),
        ...riconciliazione.righeDelNodo(aperte, riconciliazione.comeNodo(criterio))
    ].map(voce => voce.id));
    if (riga && riga.stato === 'aperta') candidati.add(riga.id);

    const chiuse = await sedute.chiudiRighe([...candidati], motivo);

    if (chiuse.length === 0 && consegne.avvisati === 0 && consegne.accodati === 0) {
        throw conflictError('Il monitor non ha risposto e non risulta alcuna seduta aperta da chiudere');
    }

    scopertaMesh.invalidaCache();
    scopertaMesh.diffondiStatoLive();

    return {
        id: (riga && riga.id) || payload.sessione_id || 'chiusura',
        stato: (chiuse.length > 0 || consegne.avvisati > 0) ? 'chiusa' : 'in_coda',
        schede_chiuse: chiuse.length,
        monitor_avvisati: consegne.avvisati,
        chiusure_in_coda: consegne.accodati
    };
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
        let righe = trasmissioni.findPage({
            ordina: 'aperta_il DESC',
            dimensione: Number(payload.dimensione) || 100
        }).righe;

        if (payload.data) {
            const dataStr = String(payload.data).slice(0, 10);
            righe = righe.filter(r => {
                const t = Number(r.aperta_il || 0);
                if (!t) return false;
                const d = new Date(t);
                const aaaa = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const gg = String(d.getDate()).padStart(2, '0');
                return `${aaaa}-${mm}-${gg}` === dataStr;
            });
        }

        if (payload.poltrona) {
            const cercaPoltrona = String(payload.poltrona).toLowerCase().trim();
            righe = righe.filter(r => (r.postazione_nome || '').toLowerCase().includes(cercaPoltrona));
        }

        if (payload.stato) {
            righe = righe.filter(r => r.stato === payload.stato);
        }

        const idsPazienti = [...new Set(righe.map(r => r.paziente_id).filter(Boolean))];
        const nomiPazienti = new Map();
        for (const pid of idsPazienti) {
            try {
                const p = lettura.schedaPaziente(pid);
                if (p) nomiPazienti.set(pid, `${p.cognome || ''} ${p.nome || ''}`.trim());
            } catch (errore) { diario.annota('trasmissioni:2', errore); }
        }
        return {
            righe: righe.map(riga => ({
                ...riga,
                paziente_nome: nomiPazienti.get(riga.paziente_id) || (riga.paziente_id || '-')
            }))
        };
    } catch (errore) {
        diario.annota('trasmissioni:101', errore);
        return { righe: [] };
    }
}

async function dichiaraSchermo(payload = {}) {
    try {
        const id = densitaDominio.identifica(payload);
        return { id, profilo: densitaDominio.trova(id) };
    } catch (errore) {
        diario.annota('trasmissioni:102', errore);
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
                servitore_info: (aggiornata && aggiornata.servitore_info) || null,
                dossier: (aggiornata && aggiornata.dossier) || null,
                motivo: (aggiornata && aggiornata.origine) || ''
            };
        }

        const locale = seduta.estrai();

        if ((payload.ricarica === true || payload.forza === true) && locale && locale.dossier && locale.dossier.paziente && locale.dossier.paziente.id) {
            try {
                const comp = require('../domain/composizione_dossier');
                const dentizione = locale.dossier.odontogramma ? locale.dossier.odontogramma.dentizione : null;
                const nuovoDossier = comp.componiDossier(locale.dossier.paziente.id, dentizione);
                if (nuovoDossier) {
                    seduta.riponi(nuovoDossier, {
                        trasmissione_id: locale.trasmissione_id || `tx-${Date.now()}`,
                        origine: locale.origine || 'ricarica'
                    }, seduta.mittente());
                    return seduta.estrai();
                }
            } catch (errore) { diario.annota('trasmissioni:3', errore); }
        }

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
    } catch (errore) {
        diario.annota('trasmissioni:103', errore);
        return { presente: false, versione: 0 };
    }
}

async function applicaDossierAggiornato(payload = {}) {
    try {
        if (!payload.dossier) return { successo: false };
        const locale = seduta.estrai();
        seduta.riponi(payload.dossier, {
            trasmissione_id: locale ? locale.trasmissione_id : '',
            origine: 'aggiornato da remoto'
        }, seduta.mittente());
        return { successo: true };
    } catch (errore) {
        diario.annota('trasmissioni:104', errore);
        return { successo: false };
    }
}

async function scaricaAllegato(payload = {}) {
    try {
        const allegatiHandler = require('./allegati');
        if (!payload.id) return { successo: false, errore: 'ID allegato mancante' };

        try {
            const locale = await allegatiHandler.contenuto({ id: payload.id });
            if (locale && locale.data_url) {
                return { successo: true, ...locale };
            }
        } catch (errore) { diario.annota('trasmissioni:4', errore); }

        const http = require('http');
        const fetchNode = (ip, porta) => new Promise(resolve => {
            try {
                const req = http.request({
                    hostname: ip,
                    port: Number(porta) || protocollo.PORTA_SERVIZIO,
                    path: '/allegato-contenuto',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 4500
                }, res => {
                    if (res.statusCode !== 200) return resolve(null);
                    let body = '';
                    res.on('data', c => body += c);
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(body);
                            resolve(json && json.data_url ? json : null);
                        } catch (errore) { diario.annota('trasmissioni:201', errore);
                            resolve(null);
                        }
                    });
                });
                req.on('error', () => resolve(null));
                req.on('timeout', () => { try { req.destroy(); } catch (errore) { diario.annota('trasmissioni:5', errore); } resolve(null); });
                req.write(JSON.stringify({ id: payload.id }));
                req.end();
            } catch (errore) { diario.annota('trasmissioni:202', errore);
                resolve(null);
            }
        });

        const mitt = seduta.mittente();
        if (mitt && mitt.ip) {
            const res = await fetchNode(mitt.ip, mitt.porta);
            if (res) return { successo: true, ...res };
        }

        if (payload.server && payload.server.ip) {
            const res = await fetchNode(payload.server.ip, payload.server.porta);
            if (res) return { successo: true, ...res };
        }

        const stazioni = await scopertaMesh.scansionaStazioni(true);
        for (const s of (stazioni || [])) {
            if (!s.ip) continue;
            const res = await fetchNode(s.ip, s.porta);
            if (res) return { successo: true, ...res };
        }

        return { successo: false, errore: 'File non presente sui nodi dello studio' };
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
    } catch (errore) {
        diario.annota('trasmissioni:105', errore);
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
    applicaDossierAggiornato,
    diagnosticaRete,
    heartbeatPostazione,
    cambiaPaziente: invio.cambiaPaziente,
    ripristinaSeduta: invio.ripristinaSeduta,
    propagaAggiornamentoDossier: invio.propagaAggiornamentoDossier,
    chiudiPerRete: riscontri.chiudiPerRete,
    statoSeduta: riscontri.statoSeduta,
    segnalaChiusuraRemota: riscontri.segnalaChiusuraRemota,
    segnalaCambioPaziente: riscontri.segnalaCambioPaziente
};
