'use strict';

const VERDE = 'verde';
const GIALLO = 'giallo';
const ROSSO = 'rosso';

const CADENZA_BASE_MS = 5000;
const CADENZA_TETTO_MS = 30000;
const SILENZIO_TOLLERATO_MS = 120000;

function cadenzaDa(fallimenti) {
    if (fallimenti <= 0) return CADENZA_BASE_MS;
    const esponenziale = CADENZA_BASE_MS * Math.pow(2, Math.min(fallimenti, 4));
    const limitata = Math.min(esponenziale, CADENZA_TETTO_MS);
    return Math.round(limitata * (0.8 + Math.random() * 0.4));
}

function statoDa({ contattoPerso, silenzioMs, fermo, tolleranzaMs = SILENZIO_TOLLERATO_MS }) {
    if (!contattoPerso) return VERDE;
    if (fermo) return GIALLO;
    return silenzioMs >= tolleranzaMs ? ROSSO : GIALLO;
}

function decidi({
    presente,
    raggiunta,
    sedutaChiusaDaSegreteria,
    silenzioMs,
    fermo,
    etaSedutaMs,
    graziaChiusuraMs = 30000,
    tolleranzaMs = SILENZIO_TOLLERATO_MS
}) {
    if (!presente) {
        return { stato: VERDE, azione: 'nessuna', motivo: '' };
    }

    if (raggiunta && sedutaChiusaDaSegreteria && etaSedutaMs >= graziaChiusuraMs) {
        return { stato: ROSSO, azione: 'svuota', motivo: 'seduta chiusa dalla segreteria' };
    }

    const stato = statoDa({ contattoPerso: !raggiunta, silenzioMs, fermo, tolleranzaMs });

    if (stato === ROSSO) {
        return { stato, azione: 'svuota', motivo: 'collegamento con la segreteria interrotto' };
    }
    if (stato === GIALLO) {
        return {
            stato,
            azione: 'avvisa',
            motivo: fermo
                ? 'collegamento assente, scheda mantenuta su richiesta del medico'
                : 'collegamento con la segreteria assente'
        };
    }
    return { stato: VERDE, azione: 'nessuna', motivo: '' };
}

module.exports = {
    VERDE,
    GIALLO,
    ROSSO,
    CADENZA_BASE_MS,
    CADENZA_TETTO_MS,
    SILENZIO_TOLLERATO_MS,
    cadenzaDa,
    statoDa,
    decidi
};
