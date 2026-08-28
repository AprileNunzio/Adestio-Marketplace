'use strict';

const diario = require('./diario');

const http = require('http');
const os = require('os');
const protocollo = require('./protocollo');
const identita = require('./identita');
const annuncio = require('./annuncio');
const presenza = require('../domain/rete/presenza');

let _cacheStazioni = [];
let _ultimoScan = 0;
let _inAggiornamento = false;
let _scansioneSubnetInCorso = false;
let _ultimoScanSubnet = 0;
let _timerBackground = null;

const CACHE_TTL_MS = 4000;
const CADENZA_ATTIVA_MS = 2500;
const CADENZA_RIPOSO_MS = 20000;
const ATTENZIONE_CONSOLE_MS = 30000;
let _ultimaRichiestaConsole = 0;
const SONDE_PARALLELE = 128;

function ottieniSubnetLocali() {
    try {
        const interfacce = os.networkInterfaces();
        const subnets = [];
        for (const nome of Object.keys(interfacce)) {
            for (const iface of interfacce[nome]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const parti = iface.address.split('.');
                    if (parti.length === 4) {
                        subnets.push({
                            ip: iface.address,
                            prefisso: `${parti[0]}.${parti[1]}.${parti[2]}`,
                            mioHost: parseInt(parti[3], 10)
                        });
                    }
                }
            }
        }
        return subnets;
    } catch (errore) {
        diario.annota('scoperta_mesh:101', errore);
        return [];
    }
}

function sondaHttp(ip, porta, timeoutMs = 350) {
    return new Promise((resolve) => {
        const t0 = Date.now();
        try {
            const req = http.get(`http://${ip}:${porta}${protocollo.ROTTE.stato}`, { timeout: timeoutMs, agent: false }, (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    return resolve(null);
                }
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json && (json.applicazione === 'adestio_dental_suite' || json.ruolo || json.versione_protocollo)) {
                            resolve({
                                ...json,
                                applicazione: 'adestio_dental_suite',
                                indirizzo: `${ip}:${porta}`,
                                ip,
                                porta,
                                latenza_ms: Date.now() - t0,
                                raggiungibile: true
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (errore) { diario.annota('scoperta_mesh:201', errore);
                        resolve(null);
                    }
                });
            });
            req.on('error', () => {
                try { req.destroy(); } catch (errore) { diario.annota('scoperta_mesh:1', errore); }
                resolve(null);
            });
            req.on('timeout', () => {
                try { req.destroy(); } catch (errore) { diario.annota('scoperta_mesh:2', errore); }
                resolve(null);
            });
        } catch (errore) { diario.annota('scoperta_mesh:202', errore);
            resolve(null);
        }
    });
}

async function _inLotti(compiti, ampiezza) {
    try {
        const risultati = [];
        for (let indice = 0; indice < compiti.length; indice += ampiezza) {
            const lotto = compiti.slice(indice, indice + ampiezza);
            const esiti = await Promise.all(lotto.map(compito => compito()));
            for (const esito of esiti) {
                if (esito) risultati.push(esito);
            }
        }
        return risultati;
    } catch (errore) {
        diario.annota('scoperta_mesh:102', errore);
        return [];
    }
}

function _bersagliDaVicini() {
    try {
        return annuncio.vicini().map(voce => ({
            ip: voce.indirizzo,
            porta: Number(voce.porta) || protocollo.PORTA_SERVIZIO
        }));
    } catch (errore) {
        diario.annota('scoperta_mesh:103', errore);
        return [];
    }
}

function _bersagliDaSubnet(subnets, porta) {
    try {
        const bersagli = [{ ip: '127.0.0.1', porta }];
        for (const sub of subnets) {
            for (let host = 1; host <= 254; host += 1) {
                if (host === sub.mioHost) continue;
                bersagli.push({ ip: `${sub.prefisso}.${host}`, porta });
            }
        }
        return bersagli;
    } catch (errore) {
        diario.annota('scoperta_mesh:104', errore);
        return [];
    }
}

function _seStesso(scheda, marchioLocale, ipsLocali) {
    if (!scheda) return false;

    const locale = identita.scheda();
    if (locale && scheda.impronta && locale.impronta) {
        return scheda.impronta === locale.impronta;
    }
    if (locale && scheda.id && locale.id) {
        return scheda.id === locale.id;
    }

    if (!scheda.ip) return false;
    if (scheda.ip === '127.0.0.1' || scheda.ip === 'localhost') return true;
    if (Array.isArray(ipsLocali) && ipsLocali.includes(scheda.ip)) {
        const portaLocale = Number(locale ? locale.porta : 0) || protocollo.PORTA_SERVIZIO;
        const portaScheda = Number(scheda.porta || 0) || protocollo.PORTA_SERVIZIO;
        return portaLocale === portaScheda;
    }
    return false;
}

function _accettabile(scheda, marchioLocale, ipsLocali) {
    try {
        if (!scheda || !scheda.ip) return false;
        if (scheda.applicazione && scheda.applicazione !== 'adestio_dental_suite') return false;
        return !_seStesso(scheda, marchioLocale, ipsLocali);
    } catch (errore) {
        diario.annota('scoperta_mesh:105', errore);
        return false;
    }
}

async function _eseguiSonda(forza = false) {
    if (_inAggiornamento) return _cacheStazioni;
    _inAggiornamento = true;
    const adesso = Date.now();

    try {
        const marchioLocale = typeof identita.marchioNodo === 'function' ? identita.marchioNodo() : null;
        const ipsLocali = identita.indirizziLocali();
        const trovati = new Map();

        const registra = scheda => {
            try {
                if (!_accettabile(scheda, marchioLocale, ipsLocali)) return;
                const chiave = `${scheda.ip}:${scheda.porta || 7345}`;
                const precedente = trovati.get(chiave);
                if (!precedente || scheda.latenza_ms < precedente.latenza_ms) {
                    trovati.set(chiave, scheda);
                }
            } catch (errore) { diario.annota('scoperta_mesh:3', errore); }
        };

        const vicini = _bersagliDaVicini();
        if (vicini.length > 0) {
            const esiti = await _inLotti(
                vicini.map(b => () => sondaHttp(b.ip, b.porta, 400)),
                SONDE_PARALLELE
            );
            esiti.forEach(registra);
        }

        const deveScansionareSubnet = forza || trovati.size === 0;
        if (deveScansionareSubnet && !_scansioneSubnetInCorso) {
            _scansioneSubnetInCorso = true;
            _ultimoScanSubnet = adesso;
            const subnets = ottieniSubnetLocali();
            const porte = [protocollo.PORTA_SERVIZIO, protocollo.PORTA_SERVIZIO + 1];
            const bersagli = porte.reduce(
                (tutti, porta) => tutti.concat(_bersagliDaSubnet(subnets, porta)),
                []
            );
            const esiti = await _inLotti(
                bersagli.map(b => () => sondaHttp(b.ip, b.porta, 400)),
                SONDE_PARALLELE
            );
            esiti.forEach(registra);
            _scansioneSubnetInCorso = false;
        }

        _cacheStazioni = [...trovati.values()];
        _ultimoScan = adesso;
        _inAggiornamento = false;
        return _cacheStazioni;
    } catch (errore) { diario.annota('scoperta_mesh:203', errore);
        _ultimoScan = adesso;
        _inAggiornamento = false;
        _scansioneSubnetInCorso = false;
        return _cacheStazioni;
    }
}

async function scansionaStazioni(forza = false) {
    try {
        const adesso = Date.now();
        if (forza) {
            return await _eseguiSonda(true);
        }
        if (adesso - _ultimoScan > CACHE_TTL_MS && !_inAggiornamento) {
            _eseguiSonda(false).catch(errore => diario.annota('scoperta_mesh:301', errore));
        }
        return _cacheStazioni;
    } catch (errore) {
        diario.annota('scoperta_mesh:106', errore);
        return _cacheStazioni;
    }
}

async function scansionaMonitors(forza = false) {
    try {
        const stazioni = await scansionaStazioni(forza);
        return (stazioni || []).filter(voce => Boolean(voce && (voce.raggiungibile || voce.ip)));
    } catch (errore) {
        diario.annota('scoperta_mesh:107', errore);
        return [];
    }
}

function _voceStazione(m) {
    if (!m) return null;
    return {
        id: m.id,
        nome: m.nome,
        poltrona_id: m.poltrona_id || '',
        poltrona_nome: m.poltrona_nome || '',
        etichetta: presenza.etichettaPostazione(m),
        indirizzo: m.indirizzo,
        ip: m.ip,
        porta: m.porta,
        ruolo: m.ruolo,
        etichetta_ruolo: protocollo.etichettaRuolo(m.ruolo),
        occupato: Boolean(m.occupato),
        latenza_ms: m.latenza_ms,
        raggiungibile: true
    };
}

async function diagnosticaCompleta() {
    try {
        const locale = identita.scheda();
        const subnets = ottieniSubnetLocali();
        const stazioni = await scansionaStazioni(true);
        const monitorScansionati = (stazioni || []).filter(v => v && v.ruolo === protocollo.RUOLO_RIUNITO);

        const diarioRete = require('./diario');
        const autenticazione = require('./autenticazione');
        const rilancioCoda = require('./rilancio');
        const sorveglianzaStato = require('./sorveglianza');

        return {
            postazione_locale: {
                ...locale,
                nome_pc: os.hostname(),
                interfacce: subnets,
                scoperta: annuncio.stato()
            },
            monitor_rilevati: monitorScansionati.map(_voceStazione).filter(Boolean),
            stazioni_rilevate: (stazioni || []).map(_voceStazione).filter(Boolean),
            sicurezza: {
                modo_autenticazione: autenticazione.modoCorrente(),
                rotte_pubbliche: [...autenticazione.ROTTE_PUBBLICHE]
            },
            vigilanza: sorveglianzaStato.stato(),
            coda_rilancio: rilancioCoda.stato(),
            guasti: diarioRete.riepilogo(),
            guasti_recenti: diarioRete.recenti(20),
            timestamp: Date.now()
        };
    } catch (e) {
        return {
            postazione_locale: null,
            monitor_rilevati: [],
            stazioni_rilevate: [],
            errore: e.message,
            timestamp: Date.now()
        };
    }
}

function impostaStato(ip, occupato) {
    if (!ip) return;
    const trovato = _cacheStazioni.find(voce => voce.ip === ip || (voce.indirizzo && voce.indirizzo.includes(ip)));
    if (!trovato) return;
    trovato.occupato = Boolean(occupato);
    _ultimoScan = Date.now();
}

function riceviStatoGossip(dati) {
    const pulito = presenza.depura(dati);
    if (!pulito || !dati || !dati.ip) return false;
    const marchioLocale = typeof identita.marchioNodo === 'function' ? identita.marchioNodo() : null;
    const ipsLocali = identita.indirizziLocali();
    if (!_accettabile({ ...pulito, ip: dati.ip }, marchioLocale, ipsLocali)) return false;

    const chiave = `${dati.ip}:${pulito.porta || protocollo.PORTA_SERVIZIO}`;
    const esistente = _cacheStazioni.find(voce => `${voce.ip}:${voce.porta || protocollo.PORTA_SERVIZIO}` === chiave);
    if (!esistente) return false;

    Object.assign(esistente, {
        nome: pulito.nome || esistente.nome,
        poltrona_id: pulito.poltrona_id || esistente.poltrona_id || '',
        poltrona_nome: pulito.poltrona_nome || esistente.poltrona_nome || '',
        ruolo: pulito.ruolo || esistente.ruolo,
        occupato: Boolean(pulito.occupato),
        ultimo_aggiornamento: Date.now()
    });
    _ultimoScan = Date.now();
    return true;
}

async function diffondiStatoLive() {
    try {
        annuncio.diffondi();
        const locale = identita.scheda();
        if (!locale) return false;

        let occupato = false;
        try {
            const seduta = require('../repositories/seduta_volatile');
            occupato = seduta.presente();
        } catch (errore) {
            occupato = false;
        }

        const pacchetto = presenza.componi(locale, occupato, protocollo.VERSIONE);
        if (!pacchetto) return false;

        const ipsLocali = identita.indirizziLocali();
        const destinatari = _cacheStazioni
            .map(s => s.ip)
            .filter(ip => ip && ip !== '127.0.0.1' && ip !== 'localhost' && !ipsLocali.includes(ip));

        const http = require('http');

        destinatari.forEach(ip => {
            try {
                const req = http.request({
                    hostname: ip,
                    port: protocollo.PORTA_SERVIZIO,
                    path: '/mesh-stato-broadcast',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 1200
                });
                req.on('error', () => {});
                req.on('timeout', () => { try { req.destroy(); } catch (errore) { diario.annota('scoperta_mesh:4', errore); } });
                req.write(JSON.stringify({ ...pacchetto, ip: ipsLocali[0] || '127.0.0.1' }));
                req.end();
            } catch (errore) { diario.annota('scoperta_mesh:5', errore); }
        });
        return true;
    } catch (errore) {
        diario.annota('scoperta_mesh:108', errore);
        return false;
    }
}

function invalidaCache() {
    try {
        _ultimoScan = 0;
        _eseguiSonda(false).catch(errore => diario.annota('scoperta_mesh:302', errore));
    } catch (errore) { diario.annota('scoperta_mesh:6', errore); }
}

function cadenzaAdattiva() {
    if (Date.now() - _ultimaRichiestaConsole < ATTENZIONE_CONSOLE_MS) return CADENZA_ATTIVA_MS;
    return CADENZA_RIPOSO_MS;
}

function segnalaInteresse() {
    _ultimaRichiestaConsole = Date.now();
}

function avviaDiscoveryBackground() {
    if (_timerBackground) return;
    const battito = () => {
        _eseguiSonda(false).catch(errore => diario.annota('scoperta_mesh:303', errore));
        diffondiStatoLive().catch(errore => diario.annota('scoperta_mesh:304', errore));
        _timerBackground = setTimeout(battito, cadenzaAdattiva());
        if (typeof _timerBackground.unref === 'function') _timerBackground.unref();
    };
    _timerBackground = setTimeout(battito, CADENZA_ATTIVA_MS);
    if (typeof _timerBackground.unref === 'function') _timerBackground.unref();
    _eseguiSonda(false).catch(errore => diario.annota('scoperta_mesh:305', errore));
}

avviaDiscoveryBackground();

module.exports = {
    scansionaMonitors,
    segnalaInteresse,
    cadenzaAdattiva,
    scansionaStazioni,
    diagnosticaCompleta,
    sondaHttp,
    impostaStato,
    riceviStatoGossip,
    diffondiStatoLive,
    invalidaCache
};
