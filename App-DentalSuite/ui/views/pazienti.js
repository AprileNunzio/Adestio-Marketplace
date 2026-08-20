import { el, rimpiazza } from '../components/dom.js';
import { intestazione, pannello, spaziatore, bottone, distintivo, avviso } from '../components/layout.js';
import { tabella, azioniRiga } from '../components/tabella.js';
import { conferma } from '../components/modale.js';
import { esito } from '../components/notifica.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import { montaVista, elenco } from './shared/vista.js';
import { apriForm } from './shared/form_modale.js';
import { SEZIONI_PAZIENTE, PAZIENTE_VUOTO } from './forms/paziente_form.js';

function filtra(righe, termine, mostraArchiviati) {
    const cercato = termine.trim().toLowerCase();
    return righe
        .filter(riga => mostraArchiviati || Number(riga.is_deleted) === 0)
        .filter(riga => !cercato || `${riga.nominativo} ${riga.codice_fiscale} ${riga.telefono}`
            .toLowerCase().includes(cercato));
}

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
            archivia: await can('pazienti_delete')
        };
        let termine = '';
        let mostraArchiviati = false;

        return montaVista({
            accento: 'pazienti',
            carica: async () => elenco(await call('pazienti.list', { includeArchived: true })),
            disegna: (righe, aggiorna) => {
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
                    }
                };

                const contenutoTabella = el('div', {});
                const contatore = el('span', { class: 'ds-muted' }, '');

                const disegnaTabella = () => {
                    const visibili = filtra(righe, termine, mostraArchiviati);
                    contatore.textContent = `${visibili.length} di ${righe.length}`;
                    rimpiazza(contenutoTabella, tabella({
                        colonne: colonne(permessi, azioni),
                        righe: visibili,
                        onRiga: riga => naviga('paziente', { id: riga.id }),
                        vuotoTitolo: termine ? 'Nessun paziente trovato' : 'Nessuna cartella in archivio',
                        vuotoTesto: termine
                            ? 'Nessuna cartella corrisponde ai criteri di ricerca.'
                            : 'Crea la prima cartella clinica per iniziare a gestire lo studio.',
                        vuotoSimbolo: 'person_search'
                    }));
                };

                const ricerca = el('input', {
                    class: 'ds-input',
                    type: 'search',
                    placeholder: 'Cerca per cognome, codice fiscale o telefono…',
                    onInput: evento => {
                        termine = evento.target.value;
                        disegnaTabella();
                    }
                });

                disegnaTabella();

                const attivi = righe.filter(riga => Number(riga.is_deleted) === 0).length;
                const senzaPrivacy = righe.filter(riga =>
                    Number(riga.is_deleted) === 0 && Number(riga.consenso_privacy) !== 1).length;

                return [
                    intestazione({
                        titolo: 'Pazienti & Cartelle Cliniche',
                        sottotitolo: `${attivi} cartelle attive nello studio`,
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
                    senzaPrivacy > 0
                        ? avviso({
                            tono: 'warning',
                            simbolo: 'privacy_tip',
                            titolo: 'Consensi privacy da acquisire',
                            voci: [`${senzaPrivacy} cartelle attive risultano prive del consenso GDPR registrato.`]
                        })
                        : null,
                    pannello({
                        titolo: 'Elenco pazienti',
                        azioni: [
                            ricerca,
                            el('label', { class: 'ds-check' }, [
                                el('input', {
                                    type: 'checkbox',
                                    checked: mostraArchiviati,
                                    onChange: evento => {
                                        mostraArchiviati = evento.target.checked;
                                        disegnaTabella();
                                    }
                                }),
                                el('span', {}, 'Archiviati')
                            ]),
                            spaziatore(),
                            contatore
                        ],
                        flush: true
                    }, contenutoTabella)
                ];
            }
        });
    }
};
