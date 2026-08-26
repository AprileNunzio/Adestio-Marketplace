'use strict';

const net = require('net');
const protocollo = require('./protocollo');
const identita = require('./identita');
const servitore = require('./servitore');
const annuncio = require('./annuncio');
const cliente = require('./cliente');
const { tableExists } = require('../kernel/database');

const ATTESA_SONDA_MS = 2500;
const TABELLE_RICHIESTE = ['rete_postazione', 'rete_pari', 'rete_accoppiamenti', 'rete_coda', 'trasmissioni'];

function comandoFirewall(porta) {
    return [
        `netsh advfirewall firewall add rule name="Adestio DentalSuite (servizio)" dir=in action=allow protocol=TCP localport=${porta}`,
        `netsh advfirewall firewall add rule name="Adestio DentalSuite (scoperta)" dir=in action=allow protocol=UDP localport=${protocollo.PORTA_ANNUNCIO}`
    ];
}

function tabelleMancanti() {
    return TABELLE_RICHIESTE.filter(nome => !tableExists(nome));
}

function sonda(indirizzo, porta) {
    return new Promise(risolvi => {
        const presa = new net.Socket();
        const chiudi = esito => {
            try {
                presa.destroy();
            } catch (e) {
                risolvi(esito);
                return;
            }
            risolvi(esito);
        };
        presa.setTimeout(ATTESA_SONDA_MS);
        presa.once('connect', () => chiudi({ raggiungibile: true, motivo: '' }));
        presa.once('timeout', () => chiudi({
            raggiungibile: false,
            motivo: 'Nessuna risposta entro il tempo previsto: porta chiusa dal firewall o postazione spenta'
        }));
        presa.once('error', errore => chiudi({ raggiungibile: false, motivo: errore.message }));
        presa.connect(Number(porta), String(indirizzo));
    });
}

async function verificaArchivio(locale) {
    if (locale.ruolo !== protocollo.RUOLO_RIUNITO) return null;
    if (!locale.indirizzo_archivio) {
        return { configurato: false, motivo: 'Indirizzo della postazione di segreteria non impostato' };
    }
    const bersaglio = cliente.bersaglioDa(locale.indirizzo_archivio, locale.porta);
    const esito = await sonda(bersaglio.indirizzo, bersaglio.porta);
    let scheda = null;
    if (esito.raggiungibile) {
        try {
            scheda = await cliente.scheda(bersaglio);
        } catch (errore) {
            esito.raggiungibile = false;
            esito.motivo = errore.message;
        }
    }
    return {
        configurato: true,
        bersaglio: `${bersaglio.indirizzo}:${bersaglio.porta}`,
        ...esito,
        scheda
    };
}

function problemiDiAvvio(locale, servizio, scoperta) {
    const problemi = [];

    if (!locale.attiva) {
        problemi.push({
            causa: 'disattivata',
            testo: 'La rete di studio è disattivata su questa postazione: nulla si mette in ascolto finché non la attivi.',
            rimedio: 'Premi "Attiva la rete adesso", oppure spunta "Rete di studio attiva su questa postazione" nel profilo e salva.'
        });
        return problemi;
    }

    if (locale.ruolo === protocollo.RUOLO_ARCHIVIO && !servizio.attivo) {
        problemi.push({
            causa: 'servizio',
            testo: servizio.ultimo_errore
                ? `Il servizio non è riuscito a mettersi in ascolto sulla porta ${locale.porta}: ${servizio.ultimo_errore}`
                : `Il servizio non è in ascolto sulla porta ${locale.porta}.`,
            rimedio: servizio.ultimo_errore && servizio.ultimo_errore.includes('EADDRINUSE')
                ? 'La porta è già occupata da un altro programma: cambia porta nel profilo e salva.'
                : 'Salva di nuovo il profilo per far ripartire il servizio.'
        });
    }

    if (!scoperta.attivo) {
        problemi.push({
            causa: 'scoperta',
            testo: scoperta.ultimo_errore
                ? `La scoperta automatica non è attiva: ${scoperta.ultimo_errore}`
                : 'La scoperta automatica non è attiva.',
            rimedio: `Le postazioni si collegano comunque indicando l'indirizzo a mano. Per l'annuncio automatico serve la porta UDP ${protocollo.PORTA_ANNUNCIO} libera e consentita.`
        });
    }

    return problemi;
}

async function esegui() {
    const locale = identita.scheda();
    const mancanti = tabelleMancanti();

    if (mancanti.length > 0) {
        return {
            pronta: false,
            postazione: locale,
            schema_incompleto: mancanti,
            problemi: [
                `L'aggiornamento del database non è stato applicato: mancano le tabelle ${mancanti.join(', ')}.`,
                'Chiudi Adestio, riaprilo e riapri DentalSuite: le migrazioni vengono applicate all\'avvio dell\'applicazione.'
            ],
            comandi_firewall: comandoFirewall(protocollo.PORTA_SERVIZIO)
        };
    }

    if (!locale) {
        return {
            pronta: false,
            postazione: null,
            problemi: ['Postazione non inizializzata: apri Postazioni & Rete, dai un nome alla postazione e salva il profilo.'],
            comandi_firewall: comandoFirewall(protocollo.PORTA_SERVIZIO)
        };
    }

    const servizio = servitore.stato();
    const scoperta = annuncio.stato();
    const archivio = await verificaArchivio(locale);
    const diagnosi = problemiDiAvvio(locale, servizio, scoperta);

    if (archivio && !archivio.configurato) {
        diagnosi.push({ causa: 'archivio', testo: archivio.motivo, rimedio: 'Indica l\'indirizzo della segreteria e accoppia la postazione.' });
    }
    if (archivio && archivio.configurato && !archivio.raggiungibile) {
        diagnosi.push({
            causa: 'archivio',
            testo: `Segreteria non raggiungibile su ${archivio.bersaglio}: ${archivio.motivo}`,
            rimedio: 'Verifica che la segreteria sia accesa, con la rete attiva e la porta consentita dal firewall.'
        });
    }

    return {
        pronta: diagnosi.length === 0,
        attiva: locale.attiva,
        postazione: locale,
        servizio,
        scoperta,
        archivio,
        diagnosi,
        problemi: diagnosi.map(voce => voce.testo),
        rimedi: diagnosi.map(voce => voce.rimedio).filter(Boolean),
        comandi_firewall: comandoFirewall(locale.porta)
    };
}

module.exports = { esegui, sonda, comandoFirewall, tabelleMancanti };
