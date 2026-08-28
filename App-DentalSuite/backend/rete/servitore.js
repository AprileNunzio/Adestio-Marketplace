'use strict';

const http = require('http');
const { URL } = require('url');
const cifratura = require('./cifratura');
const protocollo = require('./protocollo');
const accoppiamento = require('./accoppiamento');
const sessioni = require('./sessioni');
const canale = require('./canale');
const stretta = require('./stretta');
const identita = require('./identita');
const seduta = require('../repositories/seduta_volatile');
const presenza = require('../domain/rete/presenza');
const autenticazione = require('./autenticazione');
const rotte = require('./rotte');
const registroOperazioni = require('./registro_operazioni');

let servitore = null;
let portaAttiva = 0;
let alMessaggio = null;
let ultimoErrore = '';

function rispondi(risposta, codice, corpo) {
    const testo = JSON.stringify(corpo === undefined ? {} : corpo);
    risposta.writeHead(codice, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Content-Length': Buffer.byteLength(testo)
    });
    risposta.end(testo);
}

function leggiCorpo(richiesta) {
    return new Promise((risolvi, rifiuta) => {
        const pezzi = [];
        let dimensione = 0;
        richiesta.on('data', pezzo => {
            dimensione += pezzo.length;
            if (dimensione > protocollo.DIMENSIONE_MASSIMA_CORPO) {
                rifiuta(new Error('Corpo della richiesta troppo grande'));
                richiesta.destroy();
                return;
            }
            pezzi.push(pezzo);
        });
        richiesta.on('end', () => {
            try {
                risolvi(pezzi.length > 0 ? JSON.parse(Buffer.concat(pezzi).toString('utf8')) : {});
            } catch (errore) {
                rifiuta(new Error('Corpo della richiesta non è JSON valido'));
            }
        });
        richiesta.on('error', rifiuta);
    });
}

function indirizzoDi(richiesta) {
    const remoto = richiesta.socket && richiesta.socket.remoteAddress ? richiesta.socket.remoteAddress : '';
    return remoto.replace(/^::ffff:/, '');
}

function scheda() {
    const voce = identita.scheda();
    if (!voce) return null;
    return presenza.componi(voce, seduta.presente(), protocollo.VERSIONE);
}

async function gestisciAccoppiamento(richiesta, risposta) {
    const corpo = await leggiCorpo(richiesta);
    const locale = identita.riga();
    if (!locale) return rispondi(risposta, 503, { errore: 'Postazione non inizializzata' });

    const esito = await accoppiamento.verifica(locale.id, {
        ...corpo,
        indirizzo: indirizzoDi(richiesta)
    });
    if (!esito.esito) return rispondi(risposta, 403, { errore: esito.motivo });

    const conferma = accoppiamento.messaggioDi({
        id: locale.id,
        nome: locale.nome,
        ruolo: locale.ruolo,
        chiave_pubblica: locale.chiave_pubblica,
        nonce: corpo.nonce
    });

    return rispondi(risposta, 200, {
        id: locale.id,
        nome: locale.nome,
        ruolo: locale.ruolo,
        chiave_pubblica: locale.chiave_pubblica,
        impronta: locale.impronta,
        prova: cifratura.prova(esito.chiave, conferma)
    });
}

async function gestisciAvvio(richiesta, risposta) {
    const corpo = await leggiCorpo(richiesta);
    const locale = identita.riga();
    if (!locale) return rispondi(risposta, 503, { errore: 'Postazione non inizializzata' });

    const pari = accoppiamento.pariPerImpronta(String(corpo.impronta || ''));
    if (!pari || Number(pari.is_deleted) === 1 || !pari.chiave_pubblica) {
        return rispondi(risposta, 403, { errore: 'Nodo non accoppiato: autorizzalo dalla segreteria prima di collegarti' });
    }

    const messaggio = stretta.messaggioAvvio({
        impronta: corpo.impronta,
        effimera: corpo.effimera,
        nonce: corpo.nonce
    });
    if (!cifratura.verificaFirma(pari.chiave_pubblica, messaggio, corpo.firma)) {
        return rispondi(risposta, 403, { errore: 'Firma di avvio sessione non valida' });
    }

    const effimera = cifratura.coppiaEffimera();
    const nonce = cifratura.nonce();
    const segreto = cifratura.segretoCondiviso(effimera.privata, corpo.effimera);
    const chiave = cifratura.chiaveDiSessione(segreto, stretta.saleDa(corpo.nonce, nonce));

    const sessioneId = sessioni.apri({
        chiave,
        pariId: pari.id,
        impronta: pari.impronta,
        nome: pari.nome,
        ruolo: pari.ruolo,
        indirizzo: indirizzoDi(richiesta)
    });

    const risposta_firmata = stretta.messaggioRisposta({
        impronta: locale.impronta,
        effimera: effimera.pubblica,
        nonce,
        nonce_cliente: corpo.nonce,
        sessione: sessioneId
    });

    return rispondi(risposta, 200, {
        sessione: sessioneId,
        impronta: locale.impronta,
        nome: locale.nome,
        ruolo: locale.ruolo,
        effimera: effimera.pubblica,
        nonce,
        firma: cifratura.firma(locale.chiave_privata, risposta_firmata)
    });
}

function gestisciCanale(richiesta, risposta, indirizzo) {
    const sessioneId = indirizzo.searchParams.get('sessione');
    const sessione = sessioni.trova(sessioneId);
    if (!sessione) return rispondi(risposta, 403, { errore: 'Sessione non valida o scaduta' });

    risposta.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive'
    });
    risposta.write(': canale aperto\n\n');
    canale.collega(sessioneId, risposta);
    richiesta.on('close', () => canale.stacca(sessioneId));
    return null;
}

async function gestisciMessaggio(richiesta, risposta) {
    const corpo = await leggiCorpo(richiesta);
    const sessione = sessioni.trova(corpo.sessione);
    if (!sessione) return rispondi(risposta, 403, { errore: 'Sessione non valida o scaduta' });

    let contenuto;
    try {
        contenuto = cifratura.decifra(sessione.chiave, corpo.pacchetto);
    } catch (errore) {
        return rispondi(risposta, 400, { errore: 'Pacchetto non decifrabile' });
    }
    if (!sessioni.accettaSequenza(sessione, corpo.pacchetto.sequenza)) {
        return rispondi(risposta, 409, { errore: 'Sequenza già ricevuta' });
    }

    let esito = { accettato: true };
    if (typeof alMessaggio === 'function') {
        esito = await alMessaggio({
            tipo: contenuto.tipo,
            contenuto: contenuto.contenuto,
            sessione,
            indirizzo: indirizzoDi(richiesta)
        });
    }

    return rispondi(risposta, 200, {
        pacchetto: cifratura.cifra(sessione.chiave, sessioni.prossimaSequenzaRisposta(sessione), {
            tipo: protocollo.MESSAGGI.riscontro,
            contenuto: esito || { accettato: true },
            istante: Date.now()
        })
    });
}

function preflight(risposta) {
    risposta.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return risposta.end();
}

function statoPubblico(risposta) {
    const locale = identita.scheda();
    if (!locale) return rispondi(risposta, 503, { errore: 'Postazione non inizializzata' });
    return rispondi(risposta, 200, presenza.componi(locale, seduta.presente(), protocollo.VERSIONE));
}

async function instradaProtette(richiesta, risposta, percorso) {
    const gestore = rotte.trova(percorso);
    if (!gestore) return rispondi(risposta, 404, { errore: 'Rotta non prevista' });

    const corpo = await leggiCorpo(richiesta);
    const mittente = indirizzoDi(richiesta);
    const controllo = autenticazione.verifica('POST', percorso, corpo, mittente);

    if (!controllo.valida) {
        return rispondi(risposta, controllo.codice || 403, { errore: controllo.motivo });
    }

    const contenuto = controllo.contenuto || {};
    const firmatario = controllo.pari ? controllo.pari.impronta : mittente;
    const ripetuta = registroOperazioni.precedente(firmatario, contenuto.operazione_id);
    if (ripetuta) return rispondi(risposta, ripetuta.codice, { ...ripetuta.corpo, ripetuta: true });

    const esito = await gestore(contenuto, {
        indirizzo: mittente,
        percorso,
        pari: controllo.pari,
        sconosciuto: Boolean(controllo.sconosciuto)
    });

    registroOperazioni.ricorda(firmatario, contenuto.operazione_id, esito);
    return rispondi(risposta, esito.codice, esito.corpo);
}

async function instrada(richiesta, risposta) {
    if (richiesta.method === 'OPTIONS') return preflight(risposta);

    const indirizzo = new URL(richiesta.url, 'http://postazione.local');
    const percorso = indirizzo.pathname;

    if (richiesta.method === 'GET' && percorso === protocollo.ROTTE.stato) {
        return statoPubblico(risposta);
    }
    if (richiesta.method === 'GET' && percorso === protocollo.ROTTE.canale) {
        return gestisciCanale(richiesta, risposta, indirizzo);
    }
    if (richiesta.method !== 'POST') {
        return rispondi(risposta, 404, { errore: 'Rotta non prevista' });
    }
    if (percorso === protocollo.ROTTE.accoppia) {
        return gestisciAccoppiamento(richiesta, risposta);
    }
    if (percorso === protocollo.ROTTE.avvio) {
        return gestisciAvvio(richiesta, risposta);
    }
    if (percorso === protocollo.ROTTE.messaggio) {
        return gestisciMessaggio(richiesta, risposta);
    }

    return instradaProtette(richiesta, risposta, percorso);
}


function provaAscolto(istanza, portaPartenza, tentativi = 4) {
    return new Promise((risolvi, rifiuta) => {
        let portaCorrente = portaPartenza;
        let tentativiRimasti = tentativi;

        const tenta = () => {
            const onError = (errore) => {
                istanza.removeListener('listening', onListening);
                if (errore.code === 'EADDRINUSE' && tentativiRimasti > 1) {
                    tentativiRimasti--;
                    portaCorrente++;
                    try {
                        istanza.close(() => {
                            istanza.once('error', onError);
                            istanza.once('listening', onListening);
                            istanza.listen(portaCorrente);
                        });
                    } catch (errore) { diario.annota('servitore:201', errore);
                        istanza.once('error', onError);
                        istanza.once('listening', onListening);
                        istanza.listen(portaCorrente);
                    }
                } else {
                    ultimoErrore = errore.message;
                    servitore = null;
                    portaAttiva = 0;
                    rifiuta(errore);
                }
            };

            const onListening = () => {
                istanza.removeListener('error', onError);
                servitore = istanza;
                portaAttiva = portaCorrente;
                ultimoErrore = '';
                risolvi({ porta: portaCorrente });
            };

            istanza.once('error', onError);
            istanza.once('listening', onListening);
            istanza.listen(portaCorrente);
        };

        tenta();
    });
}

function avvia(opzioni = {}) {
    if (servitore) return Promise.resolve({ porta: portaAttiva });
    alMessaggio = typeof opzioni.alMessaggio === 'function' ? opzioni.alMessaggio : null;
    const porta = Number(opzioni.porta) || protocollo.PORTA_SERVIZIO;

    const istanza = http.createServer((richiesta, risposta) => {
        instrada(richiesta, risposta).catch(errore => {
            ultimoErrore = errore.message;
            rispondi(risposta, 500, { errore: errore.message });
        });
    });

    return provaAscolto(istanza, porta);
}

function ferma() {
    canale.chiudiTutti();
    sessioni.chiudiTutte();
    if (!servitore) return Promise.resolve(true);
    const istanza = servitore;
    servitore = null;
    portaAttiva = 0;
    return new Promise(risolvi => istanza.close(() => risolvi(true)));
}

function stato() {
    return { attivo: Boolean(servitore), porta: portaAttiva, ultimo_errore: ultimoErrore };
}

module.exports = { avvia, ferma, stato };
