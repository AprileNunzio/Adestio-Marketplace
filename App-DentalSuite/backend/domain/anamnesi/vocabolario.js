'use strict';

const vocabolario = require('../../../core/vocabolario_clinico.json');

const SEZIONI = ['patologie', 'allergie', 'intolleranze', 'stile_vita'];
const PESO_LIVELLO = { critica: 0, attenzione: 1, nota: 2 };
const PREFISSO_PERSONALIZZATO = 'custom_';

function attiva(valore) {
    if (valore === true) return true;
    return Boolean(valore && typeof valore === 'object' && valore.attivo === true);
}

function dettagliDi(valore) {
    if (!valore || typeof valore !== 'object') return '';
    return String(valore.dettagli || '').trim();
}

function etichettaPersonalizzata(chiave, dettagli) {
    if (dettagli) return dettagli;
    return chiave.replace(/^custom_[^_]+_/, '').replace(/_/g, ' ').trim();
}

function descrittoreDi(sezione, chiave) {
    const tabella = vocabolario[sezione];
    return tabella ? tabella[chiave] : null;
}

function vocePersonalizzata(chiave, dettagli) {
    return {
        chiave,
        etichetta: etichettaPersonalizzata(chiave, dettagli),
        livello: 'attenzione',
        gruppo: 'Voci aggiunte in studio',
        dettagli: '',
        personalizzata: true
    };
}

function voceCatalogata(chiave, descrittore, dettagli) {
    return {
        chiave,
        etichetta: descrittore.etichetta,
        livello: descrittore.livello,
        gruppo: descrittore.gruppo,
        dettagli,
        personalizzata: false
    };
}

function ordina(voci) {
    return voci.sort((prima, seconda) => {
        const peso = (PESO_LIVELLO[prima.livello] ?? 3) - (PESO_LIVELLO[seconda.livello] ?? 3);
        if (peso !== 0) return peso;
        return prima.etichetta.localeCompare(seconda.etichetta, 'it');
    });
}

function risolvi(sezione, mappa) {
    if (!mappa || typeof mappa !== 'object') return [];
    const voci = [];
    for (const [chiave, valore] of Object.entries(mappa)) {
        if (!attiva(valore)) continue;
        const dettagli = dettagliDi(valore);
        const descrittore = descrittoreDi(sezione, chiave);
        if (descrittore) {
            voci.push(voceCatalogata(chiave, descrittore, dettagli));
        } else if (chiave.startsWith(PREFISSO_PERSONALIZZATO)) {
            voci.push(vocePersonalizzata(chiave, dettagli));
        }
    }
    return ordina(voci);
}

function raggruppa(voci) {
    const gruppi = new Map();
    for (const voce of voci) {
        if (!gruppi.has(voce.gruppo)) gruppi.set(voce.gruppo, []);
        gruppi.get(voce.gruppo).push(voce);
    }
    return [...gruppi.entries()].map(([titolo, elementi]) => ({ titolo, voci: elementi }));
}

function descrizioneAsa(valore) {
    const voce = vocabolario.asa.find(riga => String(riga.valore) === String(valore));
    return voce ? { valore: voce.valore, titolo: voce.titolo, descrizione: voce.descrizione } : null;
}

module.exports = { SEZIONI, risolvi, raggruppa, descrizioneAsa };
