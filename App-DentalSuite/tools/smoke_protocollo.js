'use strict';

const http = require('http');
const path = require('path');
const { creaHost, creaBroker } = require('./host_stub');
const { verifica, riepiloga } = require('./verifiche');

const APP_ROOT = path.join(__dirname, '..');
const PORTA = 7411;
const IP = '127.0.0.1';

function chiama(rotta, corpo, metodo = 'POST') {
    return new Promise(risolvi => {
        const dati = JSON.stringify(corpo === undefined ? {} : corpo);
        const intestazioni = metodo === 'GET'
            ? {}
            : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dati) };
        const req = http.request({
            hostname: IP,
            port: PORTA,
            path: rotta,
            method: metodo,
            headers: intestazioni,
            timeout: 8000
        }, res => {
            let testo = '';
            res.on('data', pezzo => { testo += pezzo; });
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(testo); } catch (_) { json = null; }
                risolvi({ codice: res.statusCode, dati: json, grezzo: testo });
            });
        });
        req.on('error', errore => risolvi({ codice: 0, dati: null, grezzo: errore.message }));
        req.on('timeout', () => { req.destroy(); risolvi({ codice: 0, dati: null, grezzo: 'timeout' }); });
        if (metodo !== 'GET') req.write(dati);
        req.end();
    });
}

async function main() {
    const host = creaHost({ utenteId: 'dott-rossi' });
    const broker = creaBroker();
    host.concedi(require(path.join(APP_ROOT, 'core', 'permissions.json')).map(voce => voce.id));
    require(path.join(APP_ROOT, 'backend.js'))
        .registerBackendHandlers(broker.registerApi, host.electronApp, host.adestioDb);

    const identita = require(path.join(APP_ROOT, 'backend', 'rete', 'identita'));
    const autenticazione = require(path.join(APP_ROOT, 'backend', 'rete', 'autenticazione'));
    const servitore = require(path.join(APP_ROOT, 'backend', 'rete', 'servitore'));
    const sigillo = require(path.join(APP_ROOT, 'backend', 'rete', 'sigillo'));
    const busta = require(path.join(APP_ROOT, 'backend', 'domain', 'rete', 'busta'));
    const seduta = require(path.join(APP_ROOT, 'backend', 'repositories', 'seduta_volatile'));

    await identita.assicura();

    await servitore.ferma();
    await servitore.avvia({ porta: PORTA });

    const statoPubblico = await chiama('/stato', undefined, 'GET');
    verifica('GET /stato risponde senza firma', statoPubblico.codice === 200);
    verifica('GET /stato non espone dati del paziente',
        !/paziente/i.test(statoPubblico.grezzo), statoPubblico.grezzo.slice(0, 120));

    const senzaFirma = await chiama('/seduta-stato', { trasmissione_id: 'x' });
    verifica('Richiesta priva di firma respinta', senzaFirma.codice === 403,
        `HTTP ${senzaFirma.codice} ${senzaFirma.dati && senzaFirma.dati.errore}`);

    const firmata = autenticazione.imbusta('POST', '/seduta-stato', { trasmissione_id: 'x' });
    const conFirma = await chiama('/seduta-stato', firmata);
    verifica('Richiesta firmata accettata', conFirma.codice === 200,
        `HTTP ${conFirma.codice}`);

    const manomessa = { ...firmata, trasmissione_id: 'ALTRO' };
    const conManomissione = await chiama('/seduta-stato', manomessa);
    verifica('Corpo alterato dopo la firma respinto', conManomissione.codice === 403,
        conManomissione.dati && conManomissione.dati.errore);

    const scaduta = autenticazione.imbusta('POST', '/seduta-stato', { trasmissione_id: 'y' });
    scaduta[busta.CAMPO_BUSTA].istante = Date.now() - (busta.FINESTRA_MS * 3);
    const conScadenza = await chiama('/seduta-stato', scaduta);
    verifica('Richiesta scaduta respinta', conScadenza.codice === 403,
        conScadenza.dati && conScadenza.dati.errore);

    autenticazione.impostaModo(autenticazione.MODO_STRETTO);
    const sconosciuto = autenticazione.imbusta('POST', '/seduta-stato', { trasmissione_id: 'z' });
    sconosciuto[busta.CAMPO_BUSTA].mittente = 'IMPRONTA-MAI-VISTA';
    const conSconosciuto = await chiama('/seduta-stato', sconosciuto);
    verifica('In modo stretto un nodo non accoppiato è respinto', conSconosciuto.codice === 403,
        conSconosciuto.dati && conSconosciuto.dati.errore);
    autenticazione.impostaModo(autenticazione.MODO_APPRENDIMENTO);

    const chiave = await chiama('/chiave-effimera', {});
    verifica('/chiave-effimera fornisce una chiave firmata',
        chiave.codice === 200 && Boolean(chiave.dati && chiave.dati.effimera && chiave.dati.firma));

    const dossier = {
        paziente: { id: 'p1', nominativo: 'Marino Giulia', codice_fiscale: 'RSSMRA85T10A562S' },
        anamnesi: { farmaci_abituali: 'Cardioaspirina 100mg' }
    };

    const bustaSigillata = sigillo.sigilla(chiave.dati.effimera, { dossier });
    const grezzoSigillo = JSON.stringify(bustaSigillata);
    verifica('La busta sigillata non contiene il nominativo', !grezzoSigillo.includes('Marino'));
    verifica('La busta sigillata non contiene il codice fiscale', !grezzoSigillo.includes('RSSMRA85T10A562S'));
    verifica('La busta sigillata non contiene i farmaci', !grezzoSigillo.includes('Cardioaspirina'));

    const invio = autenticazione.imbusta('POST', '/trasmetti-diretto', {
        trasmissione_id: 'tx-prova',
        sigillo: bustaSigillata
    });
    const consegnato = await chiama('/trasmetti-diretto', invio);
    verifica('Il dossier sigillato viene accettato', consegnato.codice === 200,
        `HTTP ${consegnato.codice} ${consegnato.grezzo.slice(0, 140)}`);

    const istantanea = seduta.istantanea();
    verifica('Il monitor apre il sigillo e mostra il paziente',
        istantanea.presente && istantanea.dossier && istantanea.dossier.paziente.nominativo === 'Marino Giulia',
        istantanea.dossier ? istantanea.dossier.paziente.nominativo : 'assente');

    const sigilloRiusato = await chiama('/trasmetti-diretto', autenticazione.imbusta('POST', '/trasmetti-diretto', {
        trasmissione_id: 'tx-prova-2',
        sigillo: bustaSigillata
    }));
    verifica('La chiave effimera non è riutilizzabile', sigilloRiusato.codice !== 200,
        `HTTP ${sigilloRiusato.codice}`);

    const rotteProtette = require(path.join(APP_ROOT, 'backend', 'rete', 'rotte')).percorsi()
        .filter(voce => voce !== '/chiave-effimera');
    let respinte = 0;
    for (const rotta of rotteProtette) {
        const esito = await chiama(rotta, { sonda: true });
        if (esito.codice === 403) respinte += 1;
    }
    verifica('Tutte le rotte protette rifiutano richieste non firmate',
        respinte === rotteProtette.length, `${respinte}/${rotteProtette.length}`);

    const ordinamento = require(path.join(APP_ROOT, 'backend', 'domain', 'rete', 'ordinamento'));
    const finalita = require(path.join(APP_ROOT, 'backend', 'domain', 'dossier', 'finalita'));

    async function inviaDossier(contenuto, operazioneId) {
        const offerta = await chiama('/chiave-effimera', {});
        const corpo = { trasmissione_id: 'tx-ord', sigillo: sigillo.sigilla(offerta.dati.effimera, contenuto) };
        if (operazioneId) corpo.operazione_id = operazioneId;
        return chiama('/trasmetti-diretto', autenticazione.imbusta('POST', '/trasmetti-diretto', corpo));
    }

    const dossierA = { paziente: { id: 'pA', nominativo: 'Alfa Uno' } };
    const dossierB = { paziente: { id: 'pB', nominativo: 'Beta Due' } };

    const recente = await inviaDossier({
        dossier: dossierB,
        marca: ordinamento.marca(9, Date.now()),
        impronta_dossier: ordinamento.improntaDossier(dossierB)
    });
    verifica('Un dossier nuovo viene accettato', recente.codice === 200);

    const vecchio = await inviaDossier({
        dossier: dossierA,
        marca: ordinamento.marca(1, Date.now() - 60000),
        impronta_dossier: ordinamento.improntaDossier(dossierA)
    });
    verifica('Un dossier più vecchio viene scartato, non mostrato',
        vecchio.codice === 409, String(vecchio.codice));
    verifica('A schermo resta il paziente corretto',
        seduta.istantanea().dossier.paziente.nominativo === 'Beta Due',
        seduta.istantanea().dossier.paziente.nominativo);

    const alterato = await inviaDossier({
        dossier: dossierA,
        marca: ordinamento.marca(99, Date.now()),
        impronta_dossier: 'impronta-che-non-corrisponde'
    });
    verifica('Un dossier con impronta errata viene rifiutato', alterato.codice === 409);

    const operazione = 'op-idempotente-1';
    const primaVolta = await chiama('/chiudi-diretto', autenticazione.imbusta('POST', '/chiudi-diretto', {
        operazione_id: operazione, motivo: 'prova idempotenza'
    }));
    const secondaVolta = await chiama('/chiudi-diretto', autenticazione.imbusta('POST', '/chiudi-diretto', {
        operazione_id: operazione, motivo: 'prova idempotenza'
    }));
    verifica('La prima esecuzione riesce', primaVolta.codice === 200);
    verifica('La ripetizione non riesegue ma restituisce lo stesso esito',
        secondaVolta.codice === 200 && secondaVolta.dati.ripetuta === true,
        JSON.stringify(secondaVolta.dati));

    const completo = { versione: 2, generato_il: 1, origine: 'x', densita: {}, paziente: {}, anamnesi: {}, odontogramma: {}, rilevazioni: [], trattamenti: [], prescrizioni: [], referti: [], consensi: {}, seduta: null };
    const igiene = finalita.proietta(completo, 'igiene');
    verifica('La finalità igiene non trasporta prescrizioni e consensi',
        igiene.prescrizioni === undefined && igiene.consensi === undefined,
        Object.keys(igiene).join(','));
    verifica('La finalità visita trasporta il quadro completo',
        finalita.proietta(completo, 'visita').prescrizioni !== undefined);

    await servitore.ferma();
    riepiloga();
    process.exit(0);
}

main().catch(errore => {
    console.error('INTERROTTO:', errore);
    process.exit(1);
});
