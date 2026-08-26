'use strict';

const { pari } = require('../repositories/rete');
const { validationError, notFoundError, conflictError } = require('../kernel/errors');
const protocollo = require('../rete/protocollo');
const identita = require('../rete/identita');
const accoppiamento = require('../rete/accoppiamento');
const trasporto = require('../rete/trasporto');
const cliente = require('../rete/cliente');
const diagnosi = require('../rete/diagnosi');
const annuncio = require('../rete/annuncio');
const guida = require('../domain/guida_rete');

function scheda() {
    const voce = identita.scheda();
    if (!voce) return null;
    return { ...voce, etichetta_ruolo: protocollo.etichettaRuolo(voce.ruolo) };
}

async function profilo() {
    await identita.assicura();
    return { postazione: scheda(), ruoli: protocollo.RUOLI, porta_predefinita: protocollo.PORTA_SERVIZIO };
}

async function salvaProfilo(payload = {}) {
    if (payload.ruolo && !protocollo.RUOLI.includes(payload.ruolo)) {
        throw validationError(`Ruolo di postazione non valido: ${payload.ruolo}`);
    }
    if (payload.porta !== undefined) {
        const porta = Number(payload.porta);
        if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) {
            throw validationError('La porta di servizio deve essere un numero fra 1024 e 65535');
        }
    }
    if (payload.nome !== undefined && !String(payload.nome).trim()) {
        throw validationError('Il nome della postazione è obbligatorio');
    }

    await identita.aggiorna(payload);
    const esito = await trasporto.riavvia();
    return { postazione: scheda(), rete: esito };
}

function stato() {
    return trasporto.stato();
}

function situazione() {
    return guida.componi(trasporto.stato());
}

const TENTATIVI_PORTA = 4;

async function configura(payload = {}) {
    if (!guida.POSTI.some(voce => voce.id === payload.ruolo)) {
        throw validationError('Indicare dove si trova questo computer');
    }
    const nome = String(payload.nome || '').trim();
    if (!nome) throw validationError('Dai un nome a questo computer');

    const corrente = await identita.assicura();
    const partenza = Number(payload.porta) || Number(corrente.porta) || protocollo.PORTA_SERVIZIO;

    let esito = null;
    for (let scarto = 0; scarto < TENTATIVI_PORTA; scarto += 1) {
        await identita.aggiorna({ nome, ruolo: payload.ruolo, porta: partenza + scarto, attiva: true });
        esito = await trasporto.riavvia();
        if (esito.avviato) break;
        if (!String(esito.motivo || '').includes('EADDRINUSE')) break;
    }

    return { postazione: scheda(), rete: esito, situazione: situazione() };
}

function vicini() {
    return annuncio.vicini();
}

async function generaCodice() {
    const locale = await identita.assicura();
    if (locale.ruolo !== protocollo.RUOLO_ARCHIVIO) {
        throw conflictError('Solo la postazione di segreteria può generare un codice di accoppiamento');
    }
    if (!trasporto.stato().servizio.attivo) {
        throw conflictError('Il servizio di rete non è attivo: attivarlo prima di generare un codice');
    }
    return accoppiamento.genera(locale.id);
}

function codici() {
    return accoppiamento.codiciAperti();
}

async function revocaCodice(payload = {}) {
    if (!payload.id) throw validationError('Identificativo del codice mancante');
    return accoppiamento.revoca(payload.id);
}

async function accoppia(payload = {}) {
    const codice = String(payload.codice || '').replace(/\s+/g, '');
    if (!/^\d{8}$/.test(codice)) throw validationError('Il codice di accoppiamento è composto da otto cifre');
    if (!String(payload.indirizzo || '').trim()) {
        throw validationError('Indicare l\'indirizzo della postazione di segreteria');
    }

    const locale = await identita.assicura();
    if (locale.ruolo !== protocollo.RUOLO_RIUNITO) {
        throw conflictError('L\'accoppiamento si avvia dalla postazione riunito');
    }

    const esito = await cliente.accoppia({
        indirizzo: payload.indirizzo,
        porta: payload.porta,
        codice
    });
    await identita.aggiorna({ attiva: 1 });
    const rete = await trasporto.riavvia();
    return { ...esito, rete };
}

function elenco() {
    const righe = pari.findAll({});
    return righe.map(riga => ({
        ...riga,
        etichetta_ruolo: protocollo.etichettaRuolo(riga.ruolo),
        online: Date.now() - Number(riga.ultimo_contatto || 0) < protocollo.VITA_ANNUNCIO_MS
    }));
}

async function rimuovi(payload = {}) {
    const riga = pari.findById(payload.id, { includeArchived: true });
    if (!riga) throw notFoundError('Postazione accoppiata non trovata');
    await pari.archive(payload.id);
    return { id: payload.id };
}

async function attiva(payload = {}) {
    await identita.aggiorna({ attiva: payload.attiva !== false });
    const esito = payload.attiva === false ? await trasporto.ferma() : await trasporto.avvia();
    return { postazione: scheda(), rete: esito };
}

function verifica() {
    return diagnosi.esegui();
}

async function riallinea() {
    return trasporto.riallinea();
}

function poltroneDisponibili() {
    const { sedi, sale, poltrone } = require('../repositories/facility');
    const elencoSedi = sedi.findAll({});
    const elencoSale = sale.findAll({});
    const nomeSede = new Map(elencoSedi.map(voce => [voce.id, voce.nome]));
    const nomeSala = new Map(elencoSale.map(voce => [voce.id, voce.nome]));

    const unita = poltrone.findAll({}).filter(voce => String(voce.stato || 'attiva') !== 'dismessa');

    return {
        poltrone: unita.map(voce => ({
            id: voce.id,
            nome: voce.nome,
            sede_id: voce.sede_id,
            sede: nomeSede.get(voce.sede_id) || '',
            sala_id: voce.sala_id || '',
            sala: voce.sala_id ? (nomeSala.get(voce.sala_id) || '') : '',
            colore: voce.colore_agenda || '',
            stato: voce.stato || 'attiva'
        })),
        sedi_configurate: elencoSedi.length
    };
}

async function diagnosticaRete() {
    try {
        const scopertaMesh = require('../rete/scoperta_mesh');
        return await scopertaMesh.diagnosticaCompleta();
    } catch (e) {
        return { errore: e.message };
    }
}

module.exports = {
    poltroneDisponibili,
    profilo,
    situazione,
    configura,
    salvaProfilo,
    stato,
    vicini,
    generaCodice,
    codici,
    revocaCodice,
    accoppia,
    elenco,
    rimuovi,
    attiva,
    verifica,
    riallinea,
    diagnosticaRete
};
