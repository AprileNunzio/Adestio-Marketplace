'use strict';

const http = require('http');
const os = require('os');
const protocollo = require('./protocollo');
const identita = require('./identita');

let _cacheMonitors = [];
let _ultimoScan = 0;
const CACHE_TTL_MS = 3000;

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

function sondaHttp(ip, porta, timeoutMs = 1200) {
    return new Promise((resolve) => {
        const t0 = Date.now();
        try {
            const req = http.get(`http://${ip}:${porta}${protocollo.ROTTE.stato}`, { timeout: timeoutMs }, (res) => {
                if (res.statusCode !== 200) return resolve(null);
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
            req.on('error', () => resolve(null));
            req.on('timeout', () => {
                try { req.destroy(); } catch (_) {}
                resolve(null);
            });
        } catch (_) {
            resolve(null);
        }
    });
}

async function scansionaMonitors(forza = false) {
    const adesso = Date.now();
    if (!forza && adesso - _ultimoScan < CACHE_TTL_MS && _cacheMonitors.length > 0) {
        return _cacheMonitors;
    }

    try {
        const subnets = ottieniSubnetLocali();
        const localiIps = identita.indirizziLocali();
        const schedeTrovate = [];

        const candidati = new Set();
        candidati.add('127.0.0.1');

        for (const sub of subnets) {
            for (let host = 1; host <= 254; host++) {
                if (host !== sub.mioHost) {
                    candidati.add(`${sub.prefisso}.${host}`);
                }
            }
        }

        const promesse = [];
        const porte = [protocollo.PORTA_SERVIZIO, protocollo.PORTA_SERVIZIO + 1];

        for (const ip of candidati) {
            for (const porta of porte) {
                promesse.push(
                    sondaHttp(ip, porta, 1000).then(res => {
                        if (res && res.ruolo === protocollo.RUOLO_RIUNITO) {
                            if (!localiIps.includes(res.ip)) {
                                schedeTrovate.push(res);
                            }
                        }
                    })
                );
            }
        }

        await Promise.all(promesse);
        _cacheMonitors = schedeTrovate;
        _ultimoScan = adesso;
        return schedeTrovate;
    } catch (_) {
        return _cacheMonitors;
    }
}

async function diagnosticaCompleta() {
    try {
        const locale = identita.scheda();
        const subnets = ottieniSubnetLocali();
        const monitorScansionati = await scansionaMonitors(true);

        return {
            postazione_locale: {
                ...locale,
                nome_pc: os.hostname(),
                interfacce: subnets
            },
            monitor_rilevati: monitorScansionati.map(m => ({
                id: m.id,
                nome: m.nome,
                indirizzo: m.indirizzo,
                ip: m.ip,
                porta: m.porta,
                ruolo: m.ruolo,
                in_seduta: Boolean(m.in_seduta),
                latenza_ms: m.latenza_ms,
                raggiungibile: true
            })),
            timestamp: Date.now()
        };
    } catch (e) {
        return {
            postazione_locale: null,
            monitor_rilevati: [],
            errore: e.message,
            timestamp: Date.now()
        };
    }
}

module.exports = {
    scansionaMonitors,
    diagnosticaCompleta,
    sondaHttp
};
