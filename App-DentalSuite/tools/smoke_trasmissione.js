'use strict';

const http = require('http');
const { creaHost, creaBroker } = require('./host_stub');
const { verifica, riepiloga } = require('./verifiche');

const PERMESSI = require('../core/permissions.json').map(v => v.id);
const IP = '127.0.0.1';
const PORTA = 7399;
const IMPRONTA = 'impronta-monitor-prova';

let inSeduta = false;
let pazienteRemoto = null;
let trasmissioneRemota = null;
let chiusureRicevute = 0;

function avviaMonitorFinto() {
    return new Promise(risolvi => {
        const srv = http.createServer((req, res) => {
            if (req.method === 'POST' && req.url === '/chiudi-diretto') {
                chiusureRicevute += 1;
                inSeduta = false;
                pazienteRemoto = null;
                trasmissioneRemota = null;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ successo: true, chiusa: true }));
            }
            res.writeHead(404);
            res.end('{}');
        });
        srv.listen(PORTA, IP, () => risolvi(srv));
    });
}

function stubDiscovery() {
    const mesh = require('../backend/rete/scoperta_mesh');
    mesh.scansionaMonitors = async () => ([{
        id: 'nodo-prova',
        nome: 'Poltrone Prova',
        impronta: IMPRONTA,
        ip: IP,
        porta: PORTA,
        ruolo: 'riunito',
        occupato: inSeduta,
        poltrona_id: 'plt-prova',
        poltrona_nome: 'Poltrona Prova'
    }]);
    mesh.impostaStato = () => {};
    mesh.diffondiStatoLive = async () => true;
    mesh.invalidaCache = () => {};
}

function nuovaRiga(trasmissioni, database, apertaIl) {
    const id = database.newId();
    return trasmissioni.insert({
        id,
        paziente_id: 'paziente-x',
        sessione_id: `lan-${IP}:${PORTA}`,
        postazione_nome: 'Poltrone Prova',
        impronta_postazione: IMPRONTA,
        stato: 'aperta',
        aperta_il: apertaIl,
        impronta_dossier: 'h',
        indirizzo_consegna: `${IP}:${PORTA}`
    }, { autore_id: 'dott-rossi' }).then(() => id);
}

async function main() {
    const host = creaHost({ utenteId: 'dott-rossi' });
    const broker = creaBroker();
    const backend = require('../backend.js');
    host.concedi(PERMESSI);
    backend.registerBackendHandlers(broker.registerApi, host.electronApp, host.adestioDb);
    stubDiscovery();

    const srv = await avviaMonitorFinto();
    const chiama = (a, p) => broker.invoca(a, p);
    const { trasmissioni } = require('../backend/repositories/trasmissione');
    const database = require('../backend/kernel/database');
    const stato = id => trasmissioni.findById(id, { includeArchived: true }).stato;
    const nodoDi = r => ((r.data && r.data.collegate) || []).find(v => v.ip === IP);

    const idFantasma = await nuovaRiga(trasmissioni, database, Date.now() - 3600000);
    verifica('Riga fantasma aperta a DB', stato(idFantasma) === 'aperta');

    const n1 = nodoDi(await chiama('trasmissioni.postazioni', { forza: true }));
    verifica('Il monitor viene rilevato', Boolean(n1), JSON.stringify(n1 || {}));
    verifica('Il monitor risulta online', Boolean(n1) && n1.online === true);
    verifica('NIENTE paziente fantasma: il monitor dice libero',
        Boolean(n1) && n1.in_seduta === false && !n1.paziente_nome,
        `in_seduta=${n1 && n1.in_seduta} paziente=${n1 && n1.paziente_nome}`);
    verifica('La riga fantasma è stata riconciliata e chiusa', stato(idFantasma) === 'chiusa', stato(idFantasma));

    const idRecente = await nuovaRiga(trasmissioni, database, Date.now());
    const n2 = nodoDi(await chiama('trasmissioni.postazioni', { forza: true }));
    verifica('Una seduta appena aperta è protetta dal periodo di grazia', stato(idRecente) === 'aperta');
    verifica('Il monitor resta dichiarato libero finché non conferma', n2.in_seduta === false);

    inSeduta = true;
    pazienteRemoto = 'Marino Giulia';
    trasmissioneRemota = idRecente;
    const n3 = nodoDi(await chiama('trasmissioni.postazioni', { forza: true }));
    verifica('Con seduta reale il monitor risulta in seduta', n3.in_seduta === true);
    verifica('La seduta viva NON viene riconciliata', stato(idRecente) === 'aperta');
    verifica('Il nome paziente arriva dalla scheda locale', Boolean(n3.paziente_nome), n3.paziente_nome);

    const r = await chiama('trasmissioni.chiudi', {
        sessione_id: n3.sessione_id,
        impronta: n3.impronta,
        ip: n3.ip,
        porta: n3.porta,
        indirizzo: n3.indirizzo
    });
    verifica('Chiudi Seduta risponde con successo', r.success === true, JSON.stringify(r));
    verifica('Il monitor ha ricevuto /chiudi-diretto', chiusureRicevute === 1, `chiusure=${chiusureRicevute}`);
    verifica('La scheda è chiusa a DB', stato(idRecente) === 'chiusa', stato(idRecente));
    verifica('Risposta con conteggi espliciti',
        r.data.schede_chiuse === 1 && r.data.monitor_avvisati === 1, JSON.stringify(r.data));

    const n4 = nodoDi(await chiama('trasmissioni.postazioni', { forza: true }));
    verifica('Dopo la chiusura la card torna libera', n4.in_seduta === false && !n4.paziente_nome);

    const ko = await chiama('trasmissioni.chiudi', { sessione_id: 'lan-10.99.99.99:7345' });
    verifica('Chiusura su nodo irraggiungibile finisce in coda, non persa',
        ko.success === true && ko.data.stato === 'in_coda' && ko.data.chiusure_in_coda === 1,
        JSON.stringify(ko.data));
    verifica('La coda di rilancio conserva la chiusura',
        require('../backend/rete/rilancio').stato().in_attesa >= 1,
        JSON.stringify(require('../backend/rete/rilancio').stato()));

    const ko2 = await chiama('trasmissioni.chiudi', {});
    verifica('Chiusura senza identificativi rifiutata', ko2.success === false, JSON.stringify(ko2));


    const presenza = require('../backend/domain/rete/presenza');
    const pacchettoPresenza = presenza.componi(
        { id: 'n', nome: 'PC-SALA', poltrona_nome: 'Poltrona Prova', ruolo: 'riunito', porta: 7345, impronta: 'AB' },
        true,
        1
    );
    verifica('Il pacchetto di presenza non contiene dati del paziente',
        !presenza.contieneDatiPaziente(pacchettoPresenza),
        JSON.stringify(Object.keys(pacchettoPresenza)));
    verifica('Il pacchetto di presenza porta il nome della poltrona',
        pacchettoPresenza.poltrona_nome === 'Poltrona Prova');
    verifica('Un pacchetto sporco viene depurato',
        !presenza.contieneDatiPaziente(presenza.depura({ ...pacchettoPresenza, paziente_nome: 'Marino Giulia' })));

    srv.close();
    riepiloga();
    process.exit(0);
}

main().catch(e => { console.error('INTERROTTO:', e); process.exit(1); });
