'use strict';

const { trasmissioni } = require('../repositories/trasmissione');
const seduta = require('../repositories/seduta_volatile');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const sedute = require('./sedute');
const { componiDossier, improntaDi } = require('../domain/composizione_dossier');
const database = require('../kernel/database');
const protocollo = require('../rete/protocollo');
const trasporto = require('../rete/trasporto');
const identita = require('../rete/identita');
const scopertaMesh = require('../rete/scoperta_mesh');
const consegna = require('../rete/consegna');

async function invia(payload = {}, ottieniDestinazioni) {
    try {
        if (!payload.paziente_id) throw validationError('Selezionare il paziente da trasmettere');

        const dest = await ottieniDestinazioni();
        if (dest.length === 0) {
            throw conflictError('Nessun monitor raggiungibile nello studio');
        }

        const sessioni = Array.isArray(payload.sessione_ids) && payload.sessione_ids.length > 0
            ? payload.sessione_ids
            : [payload.sessione_id || (dest[0] && dest[0].sessione_id)];

        const locale = identita.scheda();
        const origine = locale ? locale.nome : 'Segreteria';
        const riusciti = [];
        const falliti = [];

        for (const sessioneId of sessioni) {
            const bersaglio = dest.find(voce =>
                voce.sessione_id === sessioneId
                || (voce.impronta && (voce.impronta === sessioneId || String(sessioneId).includes(voce.impronta)))
                || (voce.ip && (String(sessioneId).includes(voce.ip) || (voce.sessione_id && voce.sessione_id.includes(voce.ip))))
            );
            if (!bersaglio) {
                falliti.push({ sessione_id: sessioneId, postazione: sessioneId, motivo: 'monitor non piu raggiungibile' });
                continue;
            }

            const dossier = componiDossier(payload.paziente_id, payload.dentizione, bersaglio.schermo);
            if (!dossier) {
                falliti.push({ sessione_id: sessioneId, postazione: bersaglio.nome, motivo: 'cartella clinica non componibile' });
                continue;
            }

            const impronta = improntaDi(dossier);
            const trasmissioneId = database.newId();
            const busta = {
                trasmissione_id: trasmissioneId,
                dossier,
                origine,
                origine_impronta: locale ? locale.impronta : '',
                origine_porta: locale ? locale.porta : protocollo.PORTA_SERVIZIO
            };

            let esito = { consegnato: false, motivo: 'nessun trasporto disponibile per questo monitor' };

            if (bersaglio.tipo_connessione === 'canale') {
                const inviato = trasporto.versoRiunito(bersaglio.sessione_id, protocollo.MESSAGGI.dossier, {
                    trasmissione_id: trasmissioneId,
                    dossier
                });
                esito = inviato
                    ? { consegnato: true, motivo: '' }
                    : { consegnato: false, motivo: 'canale cifrato non piu attivo' };
            } else if (bersaglio.ip && bersaglio.porta) {
                esito = await consegna.trasmettiDiretto(bersaglio.ip, bersaglio.porta, busta);
            }

            if (!esito.consegnato) {
                falliti.push({ sessione_id: sessioneId, postazione: bersaglio.nome, motivo: esito.motivo });
                continue;
            }

            await sedute.chiudiPrecedenti(bersaglio, trasmissioneId);

            await trasmissioni.insert({
                id: trasmissioneId,
                paziente_id: payload.paziente_id,
                sessione_id: bersaglio.sessione_id,
                postazione_nome: bersaglio.nome,
                impronta_postazione: bersaglio.impronta,
                stato: 'aperta',
                aperta_il: Date.now(),
                impronta_dossier: impronta,
                indirizzo_consegna: bersaglio.ip ? `${bersaglio.ip}:${bersaglio.porta}` : ''
            }, actor.stamp());

            if (bersaglio.ip) {
                scopertaMesh.impostaStato(bersaglio.ip, true);
            }

            riusciti.push({
                id: trasmissioneId,
                paziente: dossier.paziente.nominativo,
                postazione: bersaglio.nome,
                impronta_dossier: impronta
            });
        }

        if (riusciti.length === 0) {
            const motivo = falliti.length > 0
                ? falliti.map(voce => `${voce.postazione}: ${voce.motivo}`).join(' · ')
                : 'nessun monitor selezionato';
            throw conflictError(`Trasmissione non riuscita — ${motivo}`);
        }

        if (riusciti.length === 1 && falliti.length === 0) {
            return riusciti[0];
        }

        return {
            inviati: riusciti.length,
            non_riusciti: falliti.length,
            dettagli: riusciti,
            falliti,
            paziente: riusciti[0].paziente,
            postazione: falliti.length === 0
                ? `${riusciti.length} monitor`
                : `${riusciti.length} monitor su ${riusciti.length + falliti.length}`
        };
    } catch (e) {
        throw e;
    }
}

async function avvisaChiusura(riga, motivo, ottieniDestinazioni) {
    try {
        const busta = { trasmissione_id: riga.id, motivo };

        const inviato = trasporto.versoRiunito(riga.sessione_id, protocollo.MESSAGGI.chiusura, busta);
        if (inviato) return { consegnato: true, motivo: '' };

        const memorizzato = consegna.recapitoDa(riga.indirizzo_consegna);
        if (memorizzato) {
            const esito = await consegna.conRitentativo(memorizzato.ip, memorizzato.porta, '/chiudi-diretto', busta);
            if (esito.consegnato) return esito;
        }

        const dest = await ottieniDestinazioni();
        const bersaglio = dest.find(voce =>
            voce.sessione_id === riga.sessione_id
            || (riga.impronta_postazione && voce.impronta === riga.impronta_postazione)
        );

        if (bersaglio && bersaglio.ip && bersaglio.porta) {
            const gia = memorizzato && memorizzato.ip === bersaglio.ip && memorizzato.porta === bersaglio.porta;
            if (!gia) {
                return consegna.conRitentativo(bersaglio.ip, bersaglio.porta, '/chiudi-diretto', busta);
            }
        }

        return {
            consegnato: false,
            motivo: memorizzato
                ? `il monitor ${memorizzato.ip}:${memorizzato.porta} non ha risposto`
                : 'monitor non raggiungibile'
        };
    } catch (_) {
        return { consegnato: false, motivo: 'errore chiusura' };
    }
}

async function chiudiLocale(payload = {}) {
    try {
        const motivo = payload.motivo || 'seduta chiusa dal medico';
        const istantanea = seduta.estrai();
        const trasmissioneId = istantanea && istantanea.trasmissione_id ? istantanea.trasmissione_id : '';
        const mittente = seduta.mittente();

        seduta.svuota(motivo);

        const aperte = trasmissioni.findAll({ stato: 'aperta' });
        const locale = identita.scheda();
        for (const riga of aperte) {
            if (!locale || riga.sessione_id === locale.id || riga.impronta_postazione === locale.impronta) {
                await trasmissioni.update(riga.id, {
                    stato: 'chiusa',
                    chiusa_il: Date.now(),
                    motivo_chiusura: motivo
                }, actor.stamp());
            }
        }

        let segreteriaAvvisata = false;
        if (mittente && mittente.ip && trasmissioneId) {
            const esito = await consegna.conRitentativo(mittente.ip, mittente.porta, '/seduta-chiusa', {
                trasmissione_id: trasmissioneId,
                motivo
            });
            segreteriaAvvisata = esito.consegnato;
        }

        return { chiuso: true, segreteria_avvisata: segreteriaAvvisata };
    } catch (e) {
        throw e;
    }
}

async function cambiaPaziente(payload = {}) {
    try {
        if (!payload.paziente_id) throw validationError('Selezionare il paziente da visualizzare');

        const dossier = componiDossier(payload.paziente_id, payload.dentizione);
        if (!dossier) throw notFoundError('Cartella clinica non disponibile su questa postazione');

        const istantanea = seduta.estrai();
        const trasmissioneId = istantanea && istantanea.trasmissione_id
            ? istantanea.trasmissione_id
            : database.newId();

        const locale = identita.scheda();
        const versione = seduta.riponi(dossier, {
            trasmissione_id: trasmissioneId,
            origine: locale ? locale.nome : 'Monitor'
        }, seduta.mittente());

        const mittente = seduta.mittente();
        if (mittente && mittente.ip) {
            consegna.conRitentativo(mittente.ip, mittente.porta, '/paziente-cambiato', {
                trasmissione_id: trasmissioneId,
                paziente_id: payload.paziente_id,
                paziente: dossier.paziente.nominativo
            }).catch(() => {});
        }

        return { versione, paziente: dossier.paziente.nominativo };
    } catch (e) {
        throw e;
    }
}

async function propagaAggiornamentoDossier(pazienteId) {
    try {
        if (!pazienteId) return 0;
        const aperte = trasmissioni.findAll({ where: { paziente_id: pazienteId, stato: 'aperta' } });
        if (!aperte || aperte.length === 0) return 0;

        const locale = identita.scheda();
        const origine = locale ? locale.nome : 'Segreteria';
        let propagati = 0;

        for (const riga of aperte) {
            const memorizzato = consegna.recapitoDa(riga.indirizzo_consegna);
            if (!memorizzato || !memorizzato.ip || !memorizzato.porta) continue;

            const dossier = componiDossier(pazienteId);
            if (!dossier) continue;

            const busta = {
                trasmissione_id: riga.id,
                dossier,
                origine,
                origine_impronta: locale ? locale.impronta : '',
                origine_porta: locale ? locale.porta : protocollo.PORTA_SERVIZIO
            };

            await consegna.postDiretto(memorizzato.ip, memorizzato.porta, '/trasmetti-diretto', busta);
            propagati += 1;
        }

        return propagati;
    } catch (_) {
        return 0;
    }
}

module.exports = {
    invia,
    avvisaChiusura,
    chiudiLocale,
    cambiaPaziente,
    propagaAggiornamentoDossier
};
