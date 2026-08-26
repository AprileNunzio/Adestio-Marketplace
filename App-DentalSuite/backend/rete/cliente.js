'use strict';

const cifratura = require('./cifratura');
const protocollo = require('./protocollo');
const accoppiamento = require('./accoppiamento');
const identita = require('./identita');
const richiesta = require('./richiesta');
const stretta = require('./stretta');

const RITARDI_RICONNESSIONE = [1000, 2000, 5000, 10000, 20000, 30000];

let sessione = null;
let flusso = null;
let alPacchetto = null;
let bersaglioCorrente = null;
let tentativi = 0;
let riconnessione = null;
let ultimoErrore = '';
let sequenzaInvio = 0;
let ultimaRicevuta = -1;

function bersaglioDa(testo, portaPredefinita) {
    const grezzo = String(testo || '').trim();
    if (!grezzo) throw new Error('Indirizzo della postazione di segreteria non configurato');
    const parti = grezzo.split(':');
    return {
        indirizzo: parti[0],
        porta: Number(parti[1]) || Number(portaPredefinita) || protocollo.PORTA_SERVIZIO
    };
}

async function scheda(bersaglio) {
    return richiesta.esegui(bersaglio, 'GET', protocollo.ROTTE.stato);
}

async function accoppia({ indirizzo, porta, codice }) {
    const locale = await identita.assicura();
    const bersaglio = bersaglioDa(indirizzo, porta);
    const remota = await scheda(bersaglio);
    if (!remota || !remota.id) throw new Error('La postazione remota non espone una scheda valida');

    const sale = accoppiamento.saleDi(remota.id);
    const chiave = cifratura.chiaveDaCodice(String(codice || '').replace(/\s+/g, ''), sale);
    const nonce = cifratura.nonce();
    const dati = {
        id: locale.id,
        nome: locale.nome,
        ruolo: locale.ruolo,
        chiave_pubblica: locale.chiave_pubblica,
        nonce
    };

    const esito = await richiesta.esegui(bersaglio, 'POST', protocollo.ROTTE.accoppia, {
        ...dati,
        codice: String(codice || '').replace(/\s+/g, ''),
        prova: cifratura.prova(chiave, accoppiamento.messaggioDi(dati))
    });

    const conferma = accoppiamento.messaggioDi({
        id: esito.id,
        nome: esito.nome,
        ruolo: esito.ruolo,
        chiave_pubblica: esito.chiave_pubblica,
        nonce
    });
    if (!cifratura.provaValida(chiave, conferma, esito.prova)) {
        throw new Error('La postazione remota non ha superato la verifica del codice');
    }

    const pari = await accoppiamento.registraPari({
        nome: esito.nome,
        ruolo: esito.ruolo,
        chiave_pubblica: esito.chiave_pubblica,
        indirizzo: bersaglio.indirizzo,
        porta: bersaglio.porta
    });

    await identita.aggiorna({ indirizzo_archivio: `${bersaglio.indirizzo}:${bersaglio.porta}` });
    return { pari_id: pari.id, nome: pari.nome, impronta: pari.impronta };
}

async function apriSessione(bersaglio) {
    const locale = identita.riga();
    if (!locale) throw new Error('Postazione non inizializzata');

    const effimera = cifratura.coppiaEffimera();
    const nonce = cifratura.nonce();
    const messaggio = stretta.messaggioAvvio({
        impronta: locale.impronta,
        effimera: effimera.pubblica,
        nonce
    });

    const esito = await richiesta.esegui(bersaglio, 'POST', protocollo.ROTTE.avvio, {
        impronta: locale.impronta,
        effimera: effimera.pubblica,
        nonce,
        firma: cifratura.firma(locale.chiave_privata, messaggio)
    });

    const pari = accoppiamento.pariPerImpronta(String(esito.impronta || ''));
    if (!pari) throw new Error('La postazione remota non risulta accoppiata su questa macchina');

    const attesa = stretta.messaggioRisposta({
        impronta: esito.impronta,
        effimera: esito.effimera,
        nonce: esito.nonce,
        nonce_cliente: nonce,
        sessione: esito.sessione
    });
    if (!cifratura.verificaFirma(pari.chiave_pubblica, attesa, esito.firma)) {
        throw new Error('Firma della postazione remota non valida');
    }

    const segreto = cifratura.segretoCondiviso(effimera.privata, esito.effimera);
    return {
        id: esito.sessione,
        chiave: cifratura.chiaveDiSessione(segreto, stretta.saleDa(nonce, esito.nonce)),
        pari,
        nome: esito.nome,
        impronta: esito.impronta
    };
}

function programmaRiconnessione() {
    if (riconnessione || !bersaglioCorrente) return;
    const ritardo = RITARDI_RICONNESSIONE[Math.min(tentativi, RITARDI_RICONNESSIONE.length - 1)];
    tentativi += 1;
    riconnessione = setTimeout(() => {
        riconnessione = null;
        collega(bersaglioCorrente, alPacchetto).catch(() => programmaRiconnessione());
    }, ritardo);
    if (typeof riconnessione.unref === 'function') riconnessione.unref();
}

function consegna(pacchetto) {
    if (!pacchetto || !sessione) return;
    let contenuto;
    try {
        contenuto = cifratura.decifra(sessione.chiave, pacchetto);
    } catch (errore) {
        ultimoErrore = 'Pacchetto ricevuto non decifrabile';
        return;
    }
    const sequenza = Number(pacchetto.sequenza);
    if (!Number.isFinite(sequenza) || sequenza <= ultimaRicevuta) return;
    ultimaRicevuta = sequenza;
    if (contenuto.tipo === protocollo.MESSAGGI.battito) return;
    if (typeof alPacchetto === 'function') alPacchetto(contenuto);
}

async function collega(indirizzo, gestore) {
    const locale = await identita.assicura();
    bersaglioCorrente = bersaglioDa(indirizzo || locale.indirizzo_archivio, locale.porta);
    if (typeof gestore === 'function') alPacchetto = gestore;

    stacca(false);
    sessione = await apriSessione(bersaglioCorrente);
    sequenzaInvio = 0;
    ultimaRicevuta = -1;

    const apertura = await richiesta.flusso(
        bersaglioCorrente,
        `${protocollo.ROTTE.canale}?sessione=${encodeURIComponent(sessione.id)}`
    );
    flusso = apertura;
    richiesta.eventi(apertura.risposta, consegna);
    apertura.risposta.on('end', () => {
        flusso = null;
        programmaRiconnessione();
    });
    apertura.risposta.on('error', errore => {
        ultimoErrore = errore.message;
        flusso = null;
        programmaRiconnessione();
    });

    tentativi = 0;
    ultimoErrore = '';
    return { sessione: sessione.id, postazione: sessione.nome, impronta: sessione.impronta };
}

async function invia(tipo, contenuto) {
    if (!sessione) throw new Error('Nessuna sessione aperta verso la segreteria');
    sequenzaInvio += 1;
    const esito = await richiesta.esegui(bersaglioCorrente, 'POST', protocollo.ROTTE.messaggio, {
        sessione: sessione.id,
        pacchetto: cifratura.cifra(sessione.chiave, sequenzaInvio, { tipo, contenuto, istante: Date.now() })
    });
    const risposta = cifratura.decifra(sessione.chiave, esito.pacchetto);
    return risposta.contenuto;
}

function stacca(dimentica = true) {
    if (riconnessione) {
        clearTimeout(riconnessione);
        riconnessione = null;
    }
    if (flusso) {
        try {
            flusso.chiudi();
        } catch (e) {
            flusso = null;
        }
        flusso = null;
    }
    sessione = null;
    if (dimentica) {
        bersaglioCorrente = null;
        tentativi = 0;
    }
    return true;
}

function stato() {
    return {
        collegato: Boolean(sessione && flusso),
        sessione: sessione ? sessione.id : '',
        postazione: sessione ? sessione.nome : '',
        impronta: sessione ? sessione.impronta : '',
        bersaglio: bersaglioCorrente ? `${bersaglioCorrente.indirizzo}:${bersaglioCorrente.porta}` : '',
        tentativi,
        ultimo_errore: ultimoErrore
    };
}

module.exports = { accoppia, collega, invia, stacca, stato, scheda, bersaglioDa };
