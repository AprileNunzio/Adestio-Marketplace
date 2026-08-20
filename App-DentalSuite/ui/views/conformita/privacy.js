import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, avviso, coppie, vuoto } from '../../components/layout.js';
import { tabella } from '../../components/tabella.js';
import { apriModale } from '../../components/modale.js';
import { costruisciCampi } from '../../components/campi.js';
import { esito, errore, successo } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';

function elencoImpedimenti(valutazione) {
    return valutazione.impedimenti.map(voce => `${voce.descrizione}`);
}

async function mostraValutazione(pazienteId, onEseguita) {
    const valutazione = oggetto(await call('privacy.valutaCancellazione', { paziente_id: pazienteId }), null);
    if (!valutazione) {
        errore('Valutazione non riuscita');
        return;
    }

    const stato = { motivo: '' };
    const possibile = valutazione.anonimizzazione_possibile;

    const azioni = [{ etichetta: 'Chiudi', variante: 'ghost', esito: null }];
    if (possibile) {
        azioni.push({
            etichetta: 'Anonimizza',
            variante: 'danger',
            simbolo: 'person_remove',
            onAzione: async () => {
                if (!String(stato.motivo).trim()) {
                    errore('Indicare il motivo della richiesta');
                    return false;
                }
                const risultato = await call('privacy.anonimizzaPaziente', {
                    paziente_id: pazienteId,
                    motivo: stato.motivo
                });
                if (!esito(risultato, 'Dati identificativi cancellati')) return false;
                await onEseguita();
                return true;
            }
        });
    }

    await apriModale({
        titolo: `Diritto all'oblio · ${valutazione.nominativo}`,
        ampia: true,
        corpo: [
            valutazione.impedimenti.length > 0
                ? avviso({
                    tono: possibile ? 'warning' : 'danger',
                    simbolo: 'gavel',
                    titolo: possibile
                        ? 'Cancellazione totale non ammessa: si procede per anonimizzazione'
                        : 'Cancellazione e anonimizzazione non ammesse',
                    voci: elencoImpedimenti(valutazione)
                })
                : avviso({
                    tono: 'info',
                    simbolo: 'check_circle',
                    titolo: 'Nessun impedimento',
                    voci: ['Non risultano obblighi di conservazione né rapporti aperti.']
                }),
            riepilogoValutazione(valutazione),
            possibile
                ? el('div', { class: 'ds-grid ds-grid--form' }, costruisciCampi(
                    [{ campo: 'motivo', etichetta: 'Motivo della richiesta *', genere: 'area', ampio: true }],
                    stato,
                    (campo, valore) => { stato[campo] = valore; }
                ))
                : null
        ],
        azioni
    });
}

function riepilogoValutazione(valutazione) {
    return coppie([
        { etichetta: 'Atti clinici da conservare', valore: String(valutazione.atti_clinici_conservati) },
        { etichetta: 'Conservazione obbligatoria fino al', valore: valutazione.conservazione_fino_al ? fmt.data(valutazione.conservazione_fino_al) : 'nessun obbligo' },
        { etichetta: 'Campi identificativi da cancellare', valore: String(valutazione.campi_da_anonimizzare) }
    ]);
}

export default {
    rendi: async ({ naviga }) => {
        const puoEsportare = await can('privacy_export');
        const puoCancellare = await can('privacy_erase');
        const contenitore = el('div', { class: 'ds-root' });

        if (!puoEsportare && !puoCancellare) {
            return vuoto({
                titolo: 'Operazioni sui diritti degli interessati non accessibili',
                testo: 'Servono i permessi di esportazione o di cancellazione dei dati.',
                simbolo: 'lock'
            });
        }

        const disegna = async () => {
            const registro = puoCancellare
                ? elenco(await call('privacy.registroCancellazioni', {}))
                : [];

            const esporta = async () => {
                const pazienteId = await selettorePaziente();
                if (!pazienteId) return;
                const anteprima = oggetto(await call('privacy.anteprimaEsportazione', { paziente_id: pazienteId }), null);
                if (!anteprima) {
                    errore('Anteprima non disponibile');
                    return;
                }
                const procedi = await apriModale({
                    titolo: `Portabilità dei dati · ${anteprima.nominativo}`,
                    corpo: [
                        el('p', { class: 'ds-muted' }, 'Il file conterrà l\'intera posizione dell\'interessato in formato leggibile.'),
                        el('div', { class: 'ds-toolbar' }, anteprima.sezioni.map(voce =>
                            distintivo(`${voce.etichetta}: ${voce.totale}`, 'info')))
                    ],
                    azioni: [
                        { etichetta: 'Annulla', variante: 'ghost', esito: null },
                        { etichetta: 'Esporta', simbolo: 'download', esito: true }
                    ]
                });
                if (procedi !== true) return;
                const risultato = await call('privacy.esportaPaziente', { paziente_id: pazienteId });
                if (!risultato.success) {
                    errore(risultato.error);
                    return;
                }
                if (risultato.data && risultato.data.annullato) return;
                successo(`Dati esportati in ${risultato.data.percorso}`);
            };

            const cancella = async () => {
                const pazienteId = await selettorePaziente();
                if (!pazienteId) return;
                await mostraValutazione(pazienteId, disegna);
            };

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Cancellazioni registrate', valore: String(registro.length) }),
                    statistica({
                        etichetta: 'Con conservazione clinica attiva',
                        valore: String(registro.filter(riga => riga.esito === 'anonimizzata_con_conservazione').length)
                    })
                ]),
                pannello({
                    titolo: 'Diritti dell\'interessato',
                    azioni: [
                        puoEsportare ? bottone({ etichetta: 'Esporta dati paziente', simbolo: 'download', variante: 'ghost', onClick: esporta }) : null,
                        puoCancellare ? bottone({ etichetta: 'Richiesta di cancellazione', simbolo: 'person_remove', variante: 'danger', onClick: cancella }) : null
                    ].filter(Boolean)
                }, el('p', { class: 'ds-muted' },
                    'La cancellazione totale non è quasi mai ammessa: gli atti clinici vanno conservati dieci anni dall\'ultima prestazione. Si procede per anonimizzazione dei dati identificativi, conservando gli atti in forma non riferibile.')),
                puoCancellare ? pannello({ titolo: 'Registro delle cancellazioni', flush: true }, tabella({
                    colonne: [
                        { titolo: 'Data', rendi: riga => fmt.dataOra(riga.created_at) },
                        { titolo: 'Interessato', campo: 'nominativo_cancellato' },
                        { titolo: 'Motivo', campo: 'motivo' },
                        { titolo: 'Campi cancellati', numerica: true, campo: 'campi_anonimizzati' },
                        { titolo: 'Atti conservati', numerica: true, campo: 'atti_clinici_conservati' },
                        {
                            titolo: 'Conservazione fino al',
                            rendi: riga => (riga.conservazione_fino_al ? fmt.data(riga.conservazione_fino_al) : '—')
                        },
                        {
                            titolo: 'Esito',
                            rendi: riga => distintivo(fmt.etichettaStato(riga.esito),
                                riga.esito === 'anonimizzata' ? 'success' : 'warning')
                        },
                        {
                            titolo: '',
                            rendi: riga => bottone({
                                simbolo: 'folder_open', variante: 'ghost', piccolo: true, titolo: 'Apri cartella',
                                onClick: () => naviga('paziente', { id: riga.paziente_id })
                            })
                        }
                    ],
                    righe: registro,
                    vuotoTitolo: 'Nessuna cancellazione richiesta',
                    vuotoTesto: 'Le richieste di cancellazione evase compariranno qui, con l\'indicazione di cosa è stato conservato e perché.',
                    vuotoSimbolo: 'gavel'
                })) : null
            ]);
        };

        await disegna();
        return contenitore;
    }
};
