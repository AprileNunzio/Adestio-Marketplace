'use strict';

const http = require('http');
const os = require('os');
const protocollo = require('./protocollo');
const identita = require('./identita');
const annuncio = require('./annuncio');

let _cacheStazioni = [];
let _ultimoScan = 0;
let _inAggiornamento = false;
let _scansioneSubnetInCorso = false;
let _ultimoScanSubnet = 0;
let _timerBackground = null;

const CACHE_TTL_MS = 4000;
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
    } catch (_) {
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
                        if (json && json.applicazione === 'adestio_dental_suite') {
                            resolve({
                                ...json,
                                indirizzo: `${ip}:${porta}`,
                                ip,
                                porta,
                                latenza_ms: Date.now() - t0,
                                raggiungibile: true
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (_) {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => {
                try { req.destroy(); } catch (_) {}
                resolve(null);
            });
            req.on('timeout', () => {
                try { req.destroy(); } catch (_) {}
                resolve(null);
            });
        } catch (_) {
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
    } catch (_) {
        return [];
    }
}

function _bersagliDaVicini() {
    try {
        return annuncio.vicini().map(voce => ({
            ip: voce.indirizzo,
            porta: Number(voce.porta) || protocollo.PORTA_SERVIZIO
        }));
    } catch (_) {
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
    } catch (_) {
        return [];
    }
}

function _seStesso(scheda, marchioLocale, ipsLocali) {
    try {
        if (marchioLocale && scheda.nodo) return scheda.nodo === marchioLocale;
        if (scheda.ip === '127.0.0.1') return true;
        return ipsLocali.indexOf(scheda.ip) !== -1;
    } catch (_) {
        return false;
    }
}

function _accettabile(scheda, marchioLocale, ipsLocali) {
    try {
        if (!scheda || scheda.applicazione !== 'adestio_dental_suite') return false;
        return !_seStesso(scheda, marchioLocale, ipsLocali);
    } catch (_) {
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
                const chiave = scheda.id || scheda.indirizzo;
                const precedente = trovati.get(chiave);
                if (!precedente || scheda.latenza_ms < precedente.latenza_ms) {
                    trovati.set(chiave, scheda);
                }
            } catch (_) {}
        };

        const vicini = _bersagliDaVicini();
        if (vicini.length > 0) {
            const esiti = await _inLotti(
                vicini.map(b => () => sondaHttp(b.ip, b.porta, 350)),
                SONDE_PARALLELE
            );
            esiti.forEach(registra);
        }

        if (forza && trovati.size === 0) {
            if (!_scansioneSubnetInCorso) {
                _scansioneSubnetInCorso = true;
                _ultimoScanSubnet = adesso;
                const subnets = ottieniSubnetLocali();
                const porte = [protocollo.PORTA_SERVIZIO, protocollo.PORTA_SERVIZIO + 1];
                const bersagli = porte.reduce(
                    (tutti, porta) => tutti.concat(_bersagliDaSubnet(subnets, porta)),
                    []
                );
                const esiti = await _inLotti(
                    bersagli.map(b => () => sondaHttp(b.ip, b.porta, 200)),
                    SONDE_PARALLELE
                );
                esiti.forEach(registra);
                _scansioneSubnetInCorso = false;
            }
        }

        _cacheStazioni = [...trovati.values()];
        _ultimoScan = adesso;
        _inAggiornamento = false;
        return _cacheStazioni;
    } catch (_) {
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
            _eseguiSonda(false).catch(() => {});
        }
        return _cacheStazioni;
    } catch (_) {
        return _cacheStazioni;
    }
}

async function scansionaMonitors(forza = false) {
    try {
        const stazioni = await scansionaStazioni(forza);
        return (stazioni || []).filter(voce => voce && voce.ruolo === protocollo.RUOLO_RIUNITO);
    } catch (_) {
        return [];
    }
}

function _voceStazione(m) {
    try {
        return {
            id: m.id,
            nome: m.nome,
            indirizzo: m.indirizzo,
            ip: m.ip,
            porta: m.porta,
            ruolo: m.ruolo,
            etichetta_ruolo: protocollo.etichettaRuolo(m.ruolo),
            in_seduta: Boolean(m.in_seduta),
            latenza_ms: m.latenza_ms,
            raggiungibile: true
        };
    } catch (_) {
        return null;
    }
}

async function diagnosticaCompleta() {
    try {
        const locale = identita.scheda();
        const subnets = ottieniSubnetLocali();
        const stazioni = await scansionaStazioni(true);
        const monitorScansionati = (stazioni || []).filter(v => v && v.ruolo === protocollo.RUOLO_RIUNITO);

        return {
            postazione_locale: {
                ...locale,
                nome_pc: os.hostname(),
                interfacce: subnets,
                scoperta: annuncio.stato()
            },
            monitor_rilevati: monitorScansionati.map(_voceStazione).filter(Boolean),
            stazioni_rilevate: (stazioni || []).map(_voceStazione).filter(Boolean),
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

function impostaStato(ip, inSeduta, pazienteNome = null) {
    try {
        if (!ip) return;
        const trovato = _cacheStazioni.find(s => s.ip === ip || (s.indirizzo && s.indirizzo.includes(ip)));
        if (trovato) {
            trovato.in_seduta = Boolean(inSeduta);
            if (pazienteNome !== null) trovato.paziente_nome = pazienteNome;
            _ultimoScan = Date.now();
        }
    } catch (_) {}
}

function invalidaCache() {
    try {
        _ultimoScan = 0;
        _eseguiSonda(false).catch(() => {});
    } catch (_) {}
}

function avviaDiscoveryBackground() {
    try {
        if (_timerBackground) return;
        _timerBackground = setInterval(() => {
            try {
                _eseguiSonda(false).catch(() => {});
            } catch (_) {}
        }, 4000);
        if (_timerBackground && typeof _timerBackground.unref === 'function') {
            _timerBackground.unref();
        }
        _eseguiSonda(false).catch(() => {});
    } catch (_) {}
}

avviaDiscoveryBackground();

module.exports = {
    scansionaMonitors,
    scansionaStazioni,
    diagnosticaCompleta,
    sondaHttp,
    impostaStato,
    invalidaCache
};
