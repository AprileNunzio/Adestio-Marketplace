import { el } from '../components/dom.js';
import { intestazione, pannello, bottone, distintivo, spaziatore, vuoto } from '../components/layout.js';
import { conferma } from '../components/modale.js';
import { esito } from '../components/notifica.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import { montaVista, elenco } from './shared/vista.js';
import { apriForm } from './shared/form_modale.js';
import { CAMPI_SEDE, CAMPI_SALA, CAMPI_POLTRONA } from './forms/struttura_form.js';

function rigaPoltrona(poltrona, permessi, azioni) {
    return el('div', { class: 'ds-toolbar' }, [
        el('span', { class: 'material-symbols-rounded' }, 'chair'),
        el('span', {}, poltrona.nome),
        poltrona.codice_unita ? el('span', { class: 'ds-muted' }, poltrona.codice_unita) : null,
        distintivo(poltrona.stato === 'attiva' ? 'Attiva' : 'Fuori servizio',
            poltrona.stato === 'attiva' ? 'success' : 'warning'),
        spaziatore(),
        permessi.modifica ? bottone({
            simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Modifica poltrona',
            onClick: () => azioni.poltrona(poltrona.sede_id, poltrona.sala_id, poltrona)
        }) : null,
        permessi.modifica ? bottone({
            simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Rimuovi poltrona',
            onClick: () => azioni.rimuoviPoltrona(poltrona)
        }) : null
    ].filter(Boolean));
}

function bloccoSala(sala, permessi, azioni) {
    return pannello({
        titolo: `${sala.nome} · ${sala.tipo_sala}`,
        azioni: permessi.modifica ? [
            bottone({
                etichetta: 'Poltrona', simbolo: 'add', variante: 'ghost', piccolo: true,
                onClick: () => azioni.poltrona(sala.sede_id, sala.id, null)
            }),
            bottone({
                simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Modifica sala',
                onClick: () => azioni.sala(sala.sede_id, sala)
            }),
            bottone({
                simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Rimuovi sala',
                onClick: () => azioni.rimuoviSala(sala)
            })
        ] : []
    }, sala.poltrone.length === 0
        ? el('p', { class: 'ds-muted' }, 'Nessuna poltrona in questa sala.')
        : sala.poltrone.map(poltrona => rigaPoltrona(poltrona, permessi, azioni)));
}

function bloccoSede(sede, permessi, azioni) {
    return pannello({
        titolo: `${sede.nome}${sede.citta ? ` · ${sede.citta}` : ''}`,
        azioni: [
            Number(sede.is_principale) === 1 ? distintivo('Sede principale', 'success') : null,
            ...(permessi.modifica ? [
                bottone({ etichetta: 'Sala', simbolo: 'add', variante: 'ghost', piccolo: true, onClick: () => azioni.sala(sede.id, null) }),
                bottone({ etichetta: 'Poltrona', simbolo: 'add', variante: 'ghost', piccolo: true, onClick: () => azioni.poltrona(sede.id, '', null) }),
                bottone({ simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Modifica sede', onClick: () => azioni.sede(sede) }),
                bottone({ simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Rimuovi sede', onClick: () => azioni.rimuoviSede(sede) })
            ] : [])
        ].filter(Boolean)
    }, [
        sede.indirizzo ? el('p', { class: 'ds-muted' }, [sede.indirizzo, sede.cap, sede.provincia].filter(Boolean).join(' · ')) : null,
        ...sede.sale.map(sala => bloccoSala({ ...sala, sede_id: sede.id }, permessi, azioni)),
        sede.poltrone_senza_sala.length > 0
            ? pannello({ titolo: 'Poltrone non assegnate a una sala' },
                sede.poltrone_senza_sala.map(poltrona => rigaPoltrona(poltrona, permessi, azioni)))
            : null
    ].filter(Boolean));
}

export default {
    rendi: async ({ indietro }) => {
        const permessi = { modifica: await can('struttura_edit') };

        return montaVista({
            accento: 'struttura',
            carica: async () => elenco(await call('struttura.tree', {})),
            disegna: (sedi, aggiorna) => {
                const salva = async (titolo, campi, valori, azione, extra = {}) => {
                    await apriForm({
                        titolo,
                        sezioni: [{ titolo: null, campi }],
                        valori: { ...valori, ...extra },
                        onSalva: stato => call(azione, { ...stato, ...extra, id: valori && valori.id })
                    });
                    await aggiorna();
                };

                const rimuovi = async (titolo, messaggio, azione, id) => {
                    const procedi = await conferma({ titolo, messaggio, etichettaConferma: 'Rimuovi', distruttiva: true });
                    if (!procedi) return;
                    if (esito(await call(azione, { id }), 'Elemento rimosso')) await aggiorna();
                };

                const azioni = {
                    sede: sede => salva(sede ? 'Modifica sede' : 'Nuova sede', CAMPI_SEDE, sede || {}, 'struttura.saveSede'),
                    sala: (sedeId, sala) => salva(sala ? 'Modifica sala' : 'Nuova sala', CAMPI_SALA, sala || {}, 'struttura.saveSala', { sede_id: sedeId }),
                    poltrona: (sedeId, salaId, poltrona) => salva(
                        poltrona ? 'Modifica poltrona' : 'Nuova poltrona',
                        CAMPI_POLTRONA,
                        poltrona || { stato: 'attiva' },
                        'struttura.savePoltrona',
                        { sede_id: sedeId, sala_id: salaId || '' }
                    ),
                    rimuoviSede: sede => rimuovi('Rimuovere la sede?', `"${sede.nome}" verrà archiviata.`, 'struttura.removeSede', sede.id),
                    rimuoviSala: sala => rimuovi('Rimuovere la sala?', `"${sala.nome}" verrà archiviata.`, 'struttura.removeSala', sala.id),
                    rimuoviPoltrona: poltrona => rimuovi('Rimuovere la poltrona?', `"${poltrona.nome}" verrà archiviata.`, 'struttura.removePoltrona', poltrona.id)
                };

                const poltroneTotali = sedi.reduce((somma, sede) =>
                    somma + sede.poltrone_senza_sala.length + sede.sale.reduce((s, sala) => s + sala.poltrone.length, 0), 0);

                return [
                    intestazione({
                        titolo: 'Sedi, Sale & Poltrone',
                        sottotitolo: `${sedi.length} sedi · ${poltroneTotali} poltrone operative`,
                        simbolo: 'domain',
                        indietro,
                        azioni: permessi.modifica
                            ? [bottone({ etichetta: 'Nuova sede', simbolo: 'add_home_work', onClick: () => azioni.sede(null) })]
                            : []
                    }),
                    ...(sedi.length === 0
                        ? [vuoto({
                            titolo: 'Nessuna sede configurata',
                            testo: 'Registra la sede dello studio, poi aggiungi sale operative e riuniti per abilitare l\'agenda.',
                            simbolo: 'domain'
                        })]
                        : sedi.map(sede => bloccoSede(sede, permessi, azioni)))
                ];
            }
        });
    }
};
