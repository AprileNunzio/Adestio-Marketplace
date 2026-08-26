'use strict';

const http = require('http');
const protocollo = require('./protocollo');

const ATTESA_MS = 8000;

function opzioniDi(bersaglio, metodo, percorso, lunghezza) {
    return {
        host: bersaglio.indirizzo,
        port: Number(bersaglio.porta) || protocollo.PORTA_SERVIZIO,
        method: metodo,
        path: percorso,
        headers: lunghezza
            ? { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': lunghezza }
            : { Accept: 'application/json' }
    };
}

function esegui(bersaglio, metodo, percorso, corpo) {
    const testo = corpo === undefined ? null : JSON.stringify(corpo);
    const opzioni = opzioniDi(bersaglio, metodo, percorso, testo ? Buffer.byteLength(testo) : 0);

    return new Promise((risolvi, rifiuta) => {
        const richiesta = http.request(opzioni, risposta => {
            const pezzi = [];
            let dimensione = 0;
            risposta.on('data', pezzo => {
                dimensione += pezzo.length;
                if (dimensione > protocollo.DIMENSIONE_MASSIMA_CORPO) {
                    richiesta.destroy();
                    rifiuta(new Error('Risposta troppo grande'));
                    return;
                }
                pezzi.push(pezzo);
            });
            risposta.on('end', () => {
                let dati = {};
                try {
                    dati = pezzi.length > 0 ? JSON.parse(Buffer.concat(pezzi).toString('utf8')) : {};
                } catch (errore) {
                    rifiuta(new Error('Risposta non conforme al protocollo'));
                    return;
                }
                if (risposta.statusCode >= 400) {
                    rifiuta(new Error(dati.errore || `Errore ${risposta.statusCode} dalla postazione`));
                    return;
                }
                risolvi(dati);
            });
        });
        richiesta.setTimeout(ATTESA_MS, () => {
            richiesta.destroy();
            rifiuta(new Error('La postazione non risponde entro il tempo previsto'));
        });
        richiesta.on('error', errore => rifiuta(new Error(errore.message)));
        if (testo) richiesta.write(testo);
        richiesta.end();
    });
}

function flusso(bersaglio, percorso) {
    const opzioni = opzioniDi(bersaglio, 'GET', percorso, 0);
    opzioni.headers = { Accept: 'text/event-stream' };

    return new Promise((risolvi, rifiuta) => {
        const richiesta = http.request(opzioni, risposta => {
            if (risposta.statusCode !== 200) {
                richiesta.destroy();
                rifiuta(new Error(`Canale rifiutato dalla postazione (codice ${risposta.statusCode})`));
                return;
            }
            risposta.setEncoding('utf8');
            risolvi({ risposta, chiudi: () => richiesta.destroy() });
        });
        richiesta.on('error', errore => rifiuta(new Error(errore.message)));
        richiesta.end();
    });
}

function eventi(risposta, alPacchetto) {
    let tampone = '';
    risposta.on('data', porzione => {
        tampone += porzione;
        let taglio = tampone.indexOf('\n\n');
        while (taglio >= 0) {
            const blocco = tampone.slice(0, taglio);
            tampone = tampone.slice(taglio + 2);
            blocco
                .split('\n')
                .filter(riga => riga.startsWith('data:'))
                .forEach(riga => {
                    try {
                        alPacchetto(JSON.parse(riga.slice(5).trim()));
                    } catch (e) {
                        alPacchetto(null);
                    }
                });
            taglio = tampone.indexOf('\n\n');
        }
    });
}

module.exports = { esegui, flusso, eventi };
