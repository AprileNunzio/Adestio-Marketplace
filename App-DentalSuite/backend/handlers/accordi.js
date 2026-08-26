'use strict';

const { accordi } = require('../repositories/compensi');
const { staff, prestazioni } = require('../repositories/organization');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const dominio = require('../domain/accordi');

function decora(riga, catalogo) {
    const prestazione = catalogo.get(riga.riferimento);
    let bersaglio = 'Tutte le prestazioni';
    if (riga.ambito === 'prestazione') bersaglio = prestazione ? prestazione.nome : riga.riferimento;
    if (riga.ambito === 'categoria') bersaglio = `Categoria: ${riga.riferimento}`;
    if (riga.ambito === 'branca') bersaglio = `Branca: ${riga.riferimento}`;
    return { ...riga, bersaglio };
}

function listByStaff(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const righe = accordi.findAll({ where: { staff_id: payload.staff_id } });
    const catalogo = riferimenti.mappaPerId(prestazioni, riferimenti.raccogli(righe, 'riferimento'));
    return righe.map(riga => decora(riga, catalogo));
}

function valida(payload) {
    const errori = [];
    if (!payload.staff_id) errori.push('Collaboratore mancante');
    if (!dominio.RUOLI.includes(payload.ruolo)) errori.push(`Ruolo non valido: ${payload.ruolo}`);
    if (!dominio.AMBITI.includes(payload.ambito)) errori.push(`Ambito non valido: ${payload.ambito}`);
    if (!dominio.TIPI.includes(payload.tipo)) errori.push(`Tipo di compenso non valido: ${payload.tipo}`);
    if (payload.ambito !== 'tutte' && !String(payload.riferimento || '').trim()) {
        errori.push('Indicare la prestazione, la categoria o la branca a cui si applica');
    }
    const valore = Number(payload.valore);
    if (!Number.isFinite(valore) || valore < 0) errori.push('Valore del compenso non valido');
    if (payload.tipo === 'percentuale' && valore > 100) errori.push('La percentuale non può superare 100');
    if (payload.valido_dal && payload.valido_al && payload.valido_al < payload.valido_dal) {
        errori.push('La data finale precede quella iniziale');
    }
    if (errori.length > 0) throw validationError(errori.join('. '));
}

async function salva(payload = {}) {
    valida(payload);
    staff.requireById(payload.staff_id, { includeArchived: true });
    const id = payload.id
        ? await accordi.update(payload.id, payload, actor.stamp())
        : await accordi.insert(payload, actor.stamp());
    return { id };
}

async function rimuovi(payload = {}) {
    accordi.requireById(payload.id, { includeArchived: true });
    await accordi.archive(payload.id);
    return { id: payload.id };
}

function simula(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const collaboratore = staff.requireById(payload.staff_id, { includeArchived: true });
    const attivi = accordi.findAll({ where: { staff_id: payload.staff_id } });
    const importo = Number(payload.importo) || 0;
    const catalogo = prestazioni.findAll({});

    return catalogo.map(prestazione => {
        const base = importo > 0 ? importo : Number(prestazione.prezzo_paziente || 0);
        const accordo = dominio.risolvi(attivi, prestazione, payload.ruolo || 'medico', payload.data);
        const quota = dominio.applica(accordo, base);
        return {
            prestazione_id: prestazione.id,
            prestazione: prestazione.nome,
            categoria: prestazione.categoria,
            importo: base,
            accordo_applicato: accordo ? accordo.etichetta || accordo.ambito : 'nessun accordo',
            ambito: accordo ? accordo.ambito : '',
            quota: quota === null ? null : quota,
            fallback_percentuale_default: quota === null ? Number(collaboratore.percentuale_default || 0) : null
        };
    });
}

module.exports = { listByStaff, salva, rimuovi, simula };
