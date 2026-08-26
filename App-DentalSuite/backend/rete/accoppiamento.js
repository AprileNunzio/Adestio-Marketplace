'use strict';

const crypto = require('crypto');
const { accoppiamenti, pari } = require('../repositories/rete');
const cifratura = require('./cifratura');
const protocollo = require('./protocollo');

function saleDi(idPostazione) {
    return crypto.createHash('sha256').update(String(idPostazione), 'utf8').digest('base64');
}

function messaggioDi(dati) {
    return [
        protocollo.VERSIONE,
        String(dati.id || ''),
        String(dati.nome || ''),
        String(dati.ruolo || ''),
        String(dati.chiave_pubblica || ''),
        String(dati.nonce || '')
    ].join('|');
}

function attivi(adesso) {
    return accoppiamenti.findAll({
        where: { consumato: 0 },
        filtri: [{ colonna: 'scade_il', operatore: 'gt', valore: adesso }]
    });
}

async function genera(idPostazione) {
    const codice = cifratura.codiceAccoppiamento();
    const sale = saleDi(idPostazione);
    const scadeIl = Date.now() + protocollo.SCADENZA_CODICE_MS;
    const id = await accoppiamenti.insert({
        impronta_codice: cifratura.improntaCodice(codice, sale),
        sale,
        scade_il: scadeIl,
        tentativi: 0,
        consumato: 0
    });
    return { id, codice, scade_il: scadeIl, durata_secondi: protocollo.SCADENZA_CODICE_MS / 1000 };
}

async function revoca(id) {
    await accoppiamenti.update(id, { consumato: 1 });
    return { id };
}

function codiciAperti() {
    return attivi(Date.now()).map(riga => ({
        id: riga.id,
        scade_il: Number(riga.scade_il),
        tentativi: Number(riga.tentativi)
    }));
}

async function consuma(riga, pariId) {
    await accoppiamenti.update(riga.id, { consumato: 1, pari_id: pariId });
}

async function registraTentativo(riga) {
    const tentativi = Number(riga.tentativi) + 1;
    await accoppiamenti.update(riga.id, {
        tentativi,
        consumato: tentativi >= protocollo.TENTATIVI_MASSIMI_CODICE ? 1 : 0
    });
    return tentativi;
}

function pariPerImpronta(impronta) {
    const righe = pari.findAll({
        includeArchived: true,
        filtri: [{ colonna: 'impronta', operatore: 'eq', valore: impronta }]
    });
    return righe.length > 0 ? righe[0] : null;
}

async function registraPari(dati) {
    const impronta = cifratura.improntaDi(dati.chiave_pubblica);
    const esistente = pariPerImpronta(impronta);
    const valori = {
        nome: String(dati.nome || '').slice(0, 60),
        ruolo: dati.ruolo === protocollo.RUOLO_RIUNITO ? protocollo.RUOLO_RIUNITO : protocollo.RUOLO_ARCHIVIO,
        chiave_pubblica: dati.chiave_pubblica,
        impronta,
        ultimo_indirizzo: String(dati.indirizzo || ''),
        ultima_porta: Number(dati.porta) || 0,
        ultimo_contatto: Date.now(),
        stato: 'accoppiata'
    };
    if (esistente) {
        await pari.update(esistente.id, valori);
        if (Number(esistente.is_deleted) === 1) await pari.restore(esistente.id);
        return pariPerImpronta(impronta);
    }
    const id = await pari.insert(valori);
    return pari.findById(id, { includeArchived: true });
}

async function verifica(idPostazione, richiesta) {
    const adesso = Date.now();
    const candidati = attivi(adesso);
    if (candidati.length === 0) {
        return { esito: false, motivo: 'Nessun codice di accoppiamento attivo su questa postazione' };
    }

    const sale = saleDi(idPostazione);
    const messaggio = messaggioDi(richiesta);

    for (const candidato of candidati) {
        const chiave = cifratura.chiaveDaCodice(richiesta.codice, sale);
        if (candidato.impronta_codice !== cifratura.improntaCodice(richiesta.codice, sale)) continue;
        if (!cifratura.provaValida(chiave, messaggio, richiesta.prova)) {
            const tentativi = await registraTentativo(candidato);
            return {
                esito: false,
                motivo: `Prova di accoppiamento non valida (tentativo ${tentativi} di ${protocollo.TENTATIVI_MASSIMI_CODICE})`
            };
        }
        const registrata = await registraPari(richiesta);
        await consuma(candidato, registrata.id);
        return { esito: true, pari: registrata, chiave };
    }

    const primo = candidati[0];
    const tentativi = await registraTentativo(primo);
    return {
        esito: false,
        motivo: `Codice errato (tentativo ${tentativi} di ${protocollo.TENTATIVI_MASSIMI_CODICE})`
    };
}

module.exports = {
    saleDi,
    messaggioDi,
    genera,
    revoca,
    codiciAperti,
    verifica,
    registraPari,
    pariPerImpronta
};
