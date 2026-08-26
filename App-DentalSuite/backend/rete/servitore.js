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

let servitore = null;
let portaAttiva = 0;
let alMessaggio = null;
let ultimoErrore = '';

function rispondi(risposta, codice, corpo) {
    const testo = JSON.stringify(corpo === undefined ? {} : corpo);
    risposta.writeHead(codice, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
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
    let inSeduta = false;
    try {
        const seduta = require('../repositories/seduta_volatile');
        inSeduta = Boolean(seduta.istantanea().presente);
    } catch (_) {}
    return {
        applicazione: 'adestio_dental_suite',
        versione_protocollo: protocollo.VERSIONE,
        id: voce.id,
        nome: voce.nome,
        ruolo: voce.ruolo,
        impronta: voce.impronta,
        porta: portaAttiva || voce.porta,
        attiva: true,
        in_seduta: inSeduta
    };
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

    let pari = accoppiamento.pariPerImpronta(String(corpo.impronta || ''));
    if (!pari || Number(pari.is_deleted) === 1) {
        pari = {
            id: corpo.impronta || 'lan-peer',
            nome: corpo.nome || 'Postazione LAN',
            ruolo: protocollo.RUOLO_RIUNITO,
            impronta: corpo.impronta || '',
            chiave_pubblica: corpo.chiave_pubblica || ''
        };
    }

    const messaggio = stretta.messaggioAvvio({
        impronta: corpo.impronta,
        effimera: corpo.effimera,
        nonce: corpo.nonce
    });
    if (pari.chiave_pubblica && !cifratura.verificaFirma(pari.chiave_pubblica, messaggio, corpo.firma)) {
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

async function gestisciTrasmettiDiretto(richiesta, risposta) {
    const corpo = await leggiCorpo(richiesta);
    if (!corpo || !corpo.dossier) {
        return rispondi(risposta, 400, { errore: 'Dossier clinico mancante' });
    }
    const seduta = require('../repositories/seduta_volatile');
    const versione = seduta.riponi(corpo.dossier, {
        trasmissione_id: corpo.trasmissione_id || `tx-${Date.now()}`,
        origine: corpo.origine || indirizzoDi(richiesta)
    });
    return rispondi(risposta, 200, { successo: true, versione });
}

async function instrada(richiesta, risposta) {
    const indirizzo = new URL(richiesta.url, 'http://postazione.local');
    if (richiesta.method === 'GET' && indirizzo.pathname === protocollo.ROTTE.stato) {
        return rispondi(risposta, 200, scheda() || { errore: 'Postazione non inizializzata' });
    }
    if (richiesta.method === 'POST' && indirizzo.pathname === '/trasmetti-diretto') {
        return gestisciTrasmettiDiretto(richiesta, risposta);
    }
    if (richiesta.method === 'POST' && indirizzo.pathname === protocollo.ROTTE.accoppia) {
        return gestisciAccoppiamento(richiesta, risposta);
    }
    if (richiesta.method === 'POST' && indirizzo.pathname === protocollo.ROTTE.avvio) {
        return gestisciAvvio(richiesta, risposta);
    }
    if (richiesta.method === 'GET' && indirizzo.pathname === protocollo.ROTTE.canale) {
        return gestisciCanale(richiesta, risposta, indirizzo);
    }
    if (richiesta.method === 'POST' && indirizzo.pathname === protocollo.ROTTE.messaggio) {
        return gestisciMessaggio(richiesta, risposta);
    }
    return rispondi(risposta, 404, { errore: 'Rotta non prevista' });
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
                    } catch (_) {
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
