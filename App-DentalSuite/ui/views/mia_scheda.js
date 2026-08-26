import { intestazione, pannello, statistica, griglia, coppie, distintivo, vuoto, bottone, avviso } from '../components/layout.js';
import { tabella } from '../components/tabella.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import * as fmt from '../kernel/format.js';
import { montaVista, oggetto, elenco } from './shared/vista.js';
import { apriForm } from './shared/form_modale.js';
import { rendiTurni } from './staff/turni.js';

const TONI_STATO = {
    programmato: 'info',
    confermato: 'success',
    in_sala: 'warning',
    concluso: 'neutral',
    annullato: 'danger',
    non_presentato: 'danger'
};

function anagrafica(scheda) {
    return coppie([
        { etichetta: 'Ruolo', valore: fmt.etichettaStato(scheda.ruolo) },
        { etichetta: 'Tipo di rapporto', valore: fmt.etichettaStato(scheda.tipo_rapporto) },
        { etichetta: 'Specializzazione', valore: scheda.specializzazione },
        { etichetta: 'Numero di albo', valore: scheda.numero_albo },
        { etichetta: 'Codice fiscale', valore: scheda.codice_fiscale },
        { etichetta: 'Telefono', valore: scheda.telefono },
        { etichetta: 'Email', valore: scheda.email },
        { etichetta: 'Percentuale di default', valore: fmt.percentuale(scheda.percentuale_default) }
    ]);
}

function pannelloCollegamento(collaboratori, aggiorna, puoCollegare) {
    if (!puoCollegare) {
        return vuoto({
            titolo: 'Nessuna scheda personale collegata',
            testo: 'Il tuo utente Adestio non è ancora associato a un collaboratore dello studio. Chiedi a chi amministra lo studio di collegarti alla tua scheda.',
            simbolo: 'link_off'
        });
    }

    return vuoto({
        titolo: 'Collega la tua scheda personale',
        testo: 'Associa il tuo utente Adestio al collaboratore che ti rappresenta nello studio: da qui vedrai i tuoi appuntamenti, la tua produzione e le tue competenze.',
        simbolo: 'link',
        azione: bottone({
            etichetta: 'Collega collaboratore',
            simbolo: 'person_check',
            onClick: async () => {
                await apriForm({
                    titolo: 'Collega la tua scheda',
                    sezioni: [{
                        titolo: null,
                        campi: [{
                            campo: 'id',
                            etichetta: 'Collaboratore',
                            genere: 'selezione',
                            vuoto: false,
                            ampio: true,
                            opzioni: collaboratori.map(voce => ({ valore: voce.id, etichetta: voce.nominativo }))
                        }]
                    }],
                    valori: { id: collaboratori[0] ? collaboratori[0].id : '' },
                    etichettaSalva: 'Collega',
                    onSalva: stato => call('staff.collega', stato)
                });
                await aggiorna();
            }
        })
    });
}

export default {
    rendi: async ({ naviga, indietro }) => {
        const permessi = {
            collega: await can('staff_edit'),
            turniVista: await can('turni_view'),
            turni: await can('turni_edit'),
            assenze: await can('assenze_view'),
            assenzeGestione: await can('assenze_manage')
        };

        return montaVista({
            accento: 'staff',
            carica: async () => {
                const mio = oggetto(await call('staff.mio', {}), { collegato: false, scheda: null });
                const collaboratori = mio.collegato ? [] : elenco(await call('staff.list', {}));
                return { mio, collaboratori };
            },
            disegna: ({ mio, collaboratori }, aggiorna) => {
                if (!mio.collegato) {
                    return [
                        intestazione({
                            titolo: 'La mia scheda',
                            sottotitolo: 'Il tuo profilo di collaboratore dello studio',
                            simbolo: 'account_circle',
                            indietro
                        }),
                        pannello({ titolo: 'Scheda non collegata' },
                            pannelloCollegamento(collaboratori, aggiorna, permessi.collega))
                    ];
                }

                const scheda = mio.scheda;
                const produzione = mio.produzione;

                return [
                    intestazione({
                        titolo: scheda.nominativo,
                        sottotitolo: `${fmt.etichettaStato(scheda.ruolo)} · ${fmt.etichettaStato(scheda.tipo_rapporto)}`,
                        simbolo: 'account_circle',
                        indietro,
                        azioni: [bottone({
                            etichetta: 'Apri in Staff',
                            simbolo: 'badge',
                            variante: 'ghost',
                            onClick: () => naviga('staff')
                        })]
                    }),
                    griglia('stats', [
                        statistica({
                            etichetta: 'Trattamenti eseguiti',
                            valore: String(produzione.trattamenti_eseguiti)
                        }),
                        statistica({
                            etichetta: 'Valore prodotto',
                            valore: fmt.euro(produzione.valore_prodotto),
                            tono: 'positivo'
                        }),
                        statistica({
                            etichetta: 'Competenze maturate',
                            valore: fmt.euro(produzione.competenze_maturate)
                        }),
                        statistica({
                            etichetta: 'Appuntamenti in programma',
                            valore: String(mio.prossimi_appuntamenti.length)
                        })
                    ]),
                    Number(scheda.is_deleted) === 1
                        ? avviso({
                            tono: 'warning',
                            simbolo: 'person_off',
                            titolo: 'Scheda disattivata',
                            voci: ['La tua scheda di collaboratore risulta disattivata nello studio.']
                        })
                        : null,
                    pannello({ titolo: 'Dati del collaboratore' }, anagrafica(scheda)),
                    permessi.turniVista
                        ? rendiTurni({ collaboratore: scheda, collaboratori: [scheda], permessi })
                        : null,
                    pannello({ titolo: 'I miei prossimi appuntamenti', flush: true }, tabella({
                        colonne: [
                            { titolo: 'Quando', rendi: riga => fmt.dataOra(riga.data_ora_inizio) },
                            { titolo: 'Paziente', campo: 'paziente_nome' },
                            { titolo: 'Poltrona', campo: 'poltrona_nome' },
                            { titolo: 'Motivo', rendi: riga => riga.prestazione_nome || riga.motivo_visita || '—' },
                            {
                                titolo: 'Stato',
                                rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                            }
                        ],
                        righe: mio.prossimi_appuntamenti,
                        onRiga: riga => (riga.paziente_id ? naviga('paziente', { id: riga.paziente_id }) : null),
                        vuotoTitolo: 'Nessun appuntamento in programma',
                        vuotoTesto: 'Quando ti verranno assegnati appuntamenti li troverai qui.',
                        vuotoSimbolo: 'event_available'
                    })),
                    pannello({ titolo: 'I miei ultimi trattamenti', flush: true }, tabella({
                        colonne: [
                            { titolo: 'Data', rendi: riga => fmt.data(riga.data_trattamento) },
                            { titolo: 'Prestazione', campo: 'descrizione' },
                            { titolo: 'Dente', rendi: riga => riga.dente || '—' },
                            {
                                titolo: 'Stato',
                                rendi: riga => distintivo(fmt.etichettaStato(riga.stato), 'neutral')
                            },
                            { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
                            { titolo: 'Mia quota', numerica: true, rendi: riga => fmt.euro(riga.quota_medico) }
                        ],
                        righe: mio.ultimi_trattamenti,
                        onRiga: riga => naviga('paziente', { id: riga.paziente_id }),
                        vuotoTitolo: 'Nessun trattamento registrato a tuo nome',
                        vuotoTesto: 'I trattamenti che registri come medico compariranno qui.',
                        vuotoSimbolo: 'medical_services'
                    }))
                ].filter(Boolean);
            }
        });
    }
};
