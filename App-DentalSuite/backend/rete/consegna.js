'use strict';

const diario = require('./diario');

const http = require('http');
const autenticazione = require('./autenticazione');
const crypto = require('crypto');

const _agenteKeepAlive = new http.Agent({
    keepAlive: true,
    maxSockets: 64,
    maxFreeSockets: 32,
    keepAliveMsecs: 30000
});

const ATTESA_BASE_MS = 4000;
const ATTESA_PER_MB_MS = 3000;
const TENTATIVI_CONSEGNA = 5;
const ARRETRAMENTO_BASE_MS = 400;
const ARRETRAMENTO_TETTO_MS = 8000;

function attendi(ms) {
    return new Promise(risolvi => setTimeout(risolvi, ms));
}

function attesaDi(tentativo) {
    const esponenziale = Math.min(ARRETRAMENTO_BASE_MS * Math.pow(2, tentativo - 1), ARRETRAMENTO_TETTO_MS);
    return Math.round(esponenziale * (0.7 + Math.random() * 0.6));
}

function postDiretto(ip, porta, rotta, payloadCorpo) {
    return new Promise((resolve) => {
        try {
            const data = JSON.stringify(autenticazione.imbusta('POST', rotta, payloadCorpo));
            const byte = Buffer.byteLength(data);
            const attesa = ATTESA_BASE_MS + Math.ceil(byte / (1024 * 1024)) * ATTESA_PER_MB_MS;
            const req = http.request({
                hostname: ip,
                port: porta,
                path: rotta,
                method: 'POST',
                agent: _agenteKeepAlive,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': byte
                },
                timeout: attesa
            }, (res) => {
                let corpo = '';
                res.on('data', pezzo => { corpo += pezzo; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        let dati = null;
                        try { dati = JSON.parse(corpo); } catch (errore) { diario.annota('consegna:1', errore); }
                        return resolve({ consegnato: true, motivo: '', dati });
                    }
                    const definitivo = res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429;
                    let dettaglio = `risposta HTTP ${res.statusCode}`;
                    try {
                        const json = JSON.parse(corpo);
                        if (json && json.errore) dettaglio = json.errore;
                    } catch (errore) { diario.annota('consegna:2', errore); }
                    resolve({ consegnato: false, motivo: dettaglio, definitivo, codice: res.statusCode });
                });
            });
            req.on('error', errore => resolve({ consegnato: false, motivo: errore.message }));
            req.on('timeout', () => {
                try { req.destroy(); } catch (errore) { diario.annota('consegna:3', errore); }
                resolve({ consegnato: false, motivo: `il monitor non ha risposto entro ${Math.round(attesa / 1000)} secondi` });
            });
            req.write(data);
            req.end();
        } catch (errore) {
            resolve({ consegnato: false, motivo: errore.message });
        }
    });
}

async function conRitentativo(ip, porta, rotta, payloadCorpo) {
    const corpo = { operazione_id: crypto.randomUUID(), ...(payloadCorpo || {}) };
    let ultimo = { consegnato: false, motivo: 'nessun tentativo eseguito' };

    for (let tentativo = 1; tentativo <= TENTATIVI_CONSEGNA; tentativo += 1) {
        ultimo = await postDiretto(ip, porta, rotta, corpo);
        if (ultimo.consegnato) return ultimo;
        if (ultimo.definitivo) return ultimo;
        if (tentativo < TENTATIVI_CONSEGNA) await attendi(attesaDi(tentativo));
    }
    return ultimo;
}

function trasmettiDiretto(ip, porta, payloadCorpo) {
    return conRitentativo(ip, porta, '/trasmetti-diretto', payloadCorpo);
}

async function interroga(ip, porta, rotta, payloadCorpo) {
    try {
        if (!ip) return { raggiunto: false, dati: null };
        const esito = await postDiretto(ip, porta, rotta, payloadCorpo);
        return { raggiunto: esito.consegnato, dati: esito.dati || null };
    } catch (e) {
        return { raggiunto: false, dati: null };
    }
}

function recapitoDa(indirizzo) {
    const grezzo = String(indirizzo || '').trim();
    if (!grezzo) return null;
    const taglio = grezzo.lastIndexOf(':');
    if (taglio <= 0) return null;
    const ip = grezzo.slice(0, taglio);
    const porta = Number(grezzo.slice(taglio + 1));
    return ip && Number.isFinite(porta) ? { ip, porta } : null;
}

module.exports = { postDiretto, conRitentativo, trasmettiDiretto, interroga, recapitoDa };
