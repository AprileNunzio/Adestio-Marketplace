import { el, rimpiazza } from '../components/dom.js';
import { intestazione, pannello, spaziatore, bottone, distintivo, avviso, scheletro } from '../components/layout.js';
import { tabella, azioniRiga } from '../components/tabella.js';
import { paginatore } from '../components/paginatore.js';
import { conferma } from '../components/modale.js';
import { esito } from '../components/notifica.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import { montaVista, oggetto, pagina } from './shared/vista.js';
import { apriForm } from './shared/form_modale.js';
import { SEZIONI_PAZIENTE, PAZIENTE_VUOTO } from './forms/paziente_form.js';

const ATTESA_DIGITAZIONE = 250;

function etichette(riga) {
    return [
        riga.minore ? distintivo('Minore', 'warning') : null,
        Number(riga.is_deleted) === 1 ? distintivo('Archiviato', 'neutral') : null,
        Number(riga.consenso_privacy) !== 1 ? distintivo('Privacy mancante', 'danger') : null
    ].filter(Boolean);
}

function colonne(permessi, azioni) {
    return [
        {
            titolo: 'Paziente',
            rendi: riga => el('div', { class: 'ds-toolbar' }, [el('span', {}, riga.nominativo), ...etichette(riga)])
        },
        { titolo: 'Codice fiscale', campo: 'codice_fiscale' },
        { titolo: 'Età', numerica: true, rendi: riga => (riga.eta === null ? '—' : String(riga.eta)) },
        { titolo: 'Telefono', campo: 'telefono' },
        { titolo: 'Email', campo: 'email' },
        {
            titolo: '',
            rendi: riga => azioniRiga([
                permessi.trasmette && Number(riga.is_deleted) === 0 ? bottone({
                    simbolo: 'cast', variante: 'ghost', piccolo: true, titolo: 'Trasmetti al riunito',
                    onClick: () => azioni.trasmetti(riga)
                }) : null,
                permessi.modifica ? bottone({
                    simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Modifica anagrafica',
                    onClick: () => azioni.modifica(riga)
                }) : null,
                permessi.archivia ? bottone({
                    simbolo: Number(riga.is_deleted) === 1 ? 'unarchive' : 'archive',
                    variante: 'ghost', piccolo: true,
                    titolo: Number(riga.is_deleted) === 1 ? 'Ripristina cartella' : 'Archivia cartella',
                    onClick: () => azioni.archivia(riga)
                }) : null
            ])
        }
    ];
}

export default {
    rendi: async ({ naviga, indietro }) => {
        const permessi = {
            modifica: await can('pazienti_edit'),
            archivia: await can('pazienti_delete'),
            trasmette: await can('trasmissione_invia')
        };
        const ricerca = { termine: '', archiviati: false, pagina: 1 };
        let attesa = null;

        return montaVista({
            accento: 'pazienti',
            carica: async () => oggetto(await call('pazienti.riepilogo', {}), {
                attivi: 0, archiviati: 0, senza_privacy: 0
            }),
            disegna: (riepilogo, aggiorna) => {
                const contenutoTabella = el('div', {}, scheletro(4));
                const piedeTabella = el('div', {});

                const azioni = {
                    modifica: async riga => {
                        await apriForm({
                            titolo: `Modifica ${riga.nominativo}`,
                            sezioni: SEZIONI_PAZIENTE,
                            valori: { ...PAZIENTE_VUOTO, ...riga },
                            ampia: true,
                            onSalva: stato => call('pazienti.update', { ...stato, id: riga.id })
                        });
                        await aggiorna();
                    },
                    archivia: async riga => {
                        const archiviato = Number(riga.is_deleted) === 1;
                        const procedi = await conferma({
                            titolo: archiviato ? 'Ripristinare la cartella?' : 'Archiviare la cartella?',
                            messaggio: archiviato
                                ? `La cartella di ${riga.nominativo} tornerà tra i pazienti attivi.`
                                : `La cartella di ${riga.nominativo} resterà consultabile ma esclusa dagli elenchi attivi. Nessun dato clinico viene eliminato.`,
                            etichettaConferma: archiviato ? 'Ripristina' : 'Archivia',
                            distruttiva: !archiviato
                        });
                        if (!procedi) return;
                        const risultato = await call(archiviato ? 'pazienti.restore' : 'pazienti.archive', { id: riga.id });
                        if (esito(risultato, archiviato ? 'Cartella ripristinata' : 'Cartella archiviata')) await aggiorna();
                    },
                    trasmetti: riga => naviga('trasmissione', { paziente_id: riga.id, modo: 'invio' })
                };

                const caricaPagina = async () => {
                    const stato = pagina(await call('pazienti.list', {
                        includeArchived: ricerca.archiviati,
                        term: ricerca.termine,
                        pagina: ricerca.pagina,
                        dimensione: 50
                    }));
                    rimpiazza(contenutoTabella, tabella({
                        colonne: colonne(permessi, azioni),
                        righe: stato.righe,
                        onRiga: riga => naviga('paziente', { id: riga.id }),
                        vuotoTitolo: ricerca.termine ? 'Nessun paziente trovato' : 'Nessuna cartella in archivio',
                        vuotoTesto: ricerca.termine
                            ? 'Nessuna cartella corrisponde ai criteri di ricerca.'
                            : 'Crea la prima cartella clinica per iniziare a gestire lo studio.',
                        vuotoSimbolo: 'person_search'
                    }));
                    rimpiazza(piedeTabella, stato.totale > 0
                        ? paginatore({
                            stato,
                            onVai: numero => {
                                ricerca.pagina = numero;
                                caricaPagina();
                            }
                        })
                        : null);
                };

                const campoRicerca = el('input', {
                    class: 'ds-input',
                    type: 'search',
                    value: ricerca.termine,
                    placeholder: 'Cerca per cognome, codice fiscale, telefono o email…',
                    onInput: evento => {
                        ricerca.termine = evento.target.value;
                        ricerca.pagina = 1;
                        if (attesa) clearTimeout(attesa);
                        attesa = setTimeout(caricaPagina, ATTESA_DIGITAZIONE);
                    }
                });

                caricaPagina();

                return [
                    intestazione({
                        titolo: 'Pazienti & Cartelle Cliniche',
                        sottotitolo: `${riepilogo.attivi} cartelle attive · ${riepilogo.archiviati} archiviate`,
                        simbolo: 'person_search',
                        indietro,
                        azioni: permessi.modifica ? [bottone({
                            etichetta: 'Nuovo paziente',
                            simbolo: 'person_add',
                            onClick: async () => {
                                await apriForm({
                                    titolo: 'Nuova cartella paziente',
                                    sezioni: SEZIONI_PAZIENTE,
                                    valori: { ...PAZIENTE_VUOTO },
                                    ampia: true,
                                    etichettaSalva: 'Crea cartella',
                                    onSalva: stato => call('pazienti.create', stato)
                                });
                                await aggiorna();
                            }
                        })] : []
                    }),
                    riepilogo.senza_privacy > 0
                        ? avviso({
                            tono: 'warning',
                            simbolo: 'privacy_tip',
                            titolo: 'Consensi privacy da acquisire',
                            voci: [`${riepilogo.senza_privacy} cartelle attive risultano prive del consenso GDPR registrato.`]
                        })
                        : null,
                    pannello({
                        titolo: 'Elenco pazienti',
                        azioni: [
                            campoRicerca,
                            el('label', { class: 'ds-check' }, [
                                el('input', {
                                    type: 'checkbox',
                                    checked: ricerca.archiviati,
                                    onChange: evento => {
                                        ricerca.archiviati = evento.target.checked;
                                        ricerca.pagina = 1;
                                        caricaPagina();
                                    }
                                }),
                                el('span', {}, 'Archiviati')
                            ]),
                            spaziatore()
                        ],
                        flush: true
                    }, [contenutoTabella, piedeTabella])
                ];
            }
        });
    }
};
