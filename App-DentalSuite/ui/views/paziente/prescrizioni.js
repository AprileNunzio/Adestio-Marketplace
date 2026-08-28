import { el, rimpiazza, icona } from '../../components/dom.js';
import { pannello, bottone, scheletro, avviso } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma, apriModale } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';
import { apriEditorPrescrizione } from './prescrizioni/editor_prescrizione.js';
import { apriSelettoreProntuario } from './prescrizioni/selettore_prontuario.js';

const RUOLI_PRESCRITTORI = ['medico', 'odontoiatra', 'direttore_sanitario'];

function apriStampaPrescrizione(riga, paziente) {
    const corpo = el('div', { class: 'ds-recipe-preview', style: 'padding: 1rem; line-height: 1.6;' }, [
        el('div', { style: 'border-bottom: 2px solid var(--ds-accent); padding-bottom: 0.5rem; margin-bottom: 1rem;' }, [
            el('h3', { style: 'margin: 0; color: var(--ds-accent);' }, 'Promemoria Terapia Farmacologica Odontoiatrica'),
            el('p', { class: 'ds-muted', style: 'margin: 2px 0 0 0;' }, `Paziente: ${paziente.cognome} ${paziente.nome} (CF: ${paziente.codice_fiscale || '—'})`)
        ]),
        el('div', { style: 'background: var(--ds-surface-raised); padding: 1rem; border-radius: var(--ds-radius-sm); border: 1px solid var(--ds-line);' }, [
            el('div', { style: 'font-size: 1.15rem; font-weight: 700;' }, `${riga.farmaco} ${riga.dosaggio}`.trim()),
            riga.principio_attivo ? el('div', { style: 'color: var(--ds-accent); font-weight: 600; margin-top: 2px;' }, `Principio attivo: ${riga.principio_attivo}`) : null,
            el('div', { style: 'margin-top: 0.75rem; font-size: 0.95rem;' }, [
                el('strong', {}, 'Posologia: '),
                el('span', {}, riga.posologia || 'Come da indicazioni del medico')
            ]),
            Number(riga.durata_giorni) > 0 ? el('div', { style: 'margin-top: 0.25rem;' }, [
                el('strong', {}, 'Durata del trattamento: '),
                el('span', {}, `${riga.durata_giorni} giorni`)
            ]) : null,
            riga.note ? el('div', { style: 'margin-top: 0.5rem; font-style: italic; color: var(--ds-muted);' }, [
                el('strong', {}, 'Avvertenze: '),
                el('span', {}, riga.note)
            ]) : null
        ].filter(Boolean)),
        el('div', { style: 'margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.85rem;' }, [
            el('div', {}, `Data emissione: ${fmt.data(riga.data_prescrizione)}`),
            el('div', { style: 'text-align: right;' }, [
                el('div', {}, `Dott. ${riga.medico || 'Medico Odontoiatra'}`),
                el('div', { class: 'ds-muted' }, 'Firma del medico prescrittore')
            ])
        ])
    ]);

    apriModale({
        titolo: 'Stampa / Consultazione Ricetta Farmaceutica',
        corpo,
        azioni: [
            {
                etichetta: 'Stampa',
                simbolo: 'print',
                variante: 'primary',
                onAzione: () => {
                    window.print();
                }
            },
            {
                etichetta: 'Chiudi',
                variante: 'ghost',
                onAzione: chiudi => chiudi(true)
            }
        ]
    });
}

export default {
    rendi: async ({ paziente }) => {
        const puoModificare = await can('prescrizioni_edit');
        const vedeAnamnesi = await can('anamnesi_view');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const [righe, staff, anamnesi] = await Promise.all([
                call('prescrizioni.listByPaziente', { paziente_id: paziente.id }).then(elenco),
                call('staff.list', {}).then(elenco),
                vedeAnamnesi
                    ? call('anamnesi.get', { paziente_id: paziente.id }).then(risultato => oggetto(risultato, null))
                    : Promise.resolve(null)
            ]);

            const prescrittori = staff.filter(voce => RUOLI_PRESCRITTORI.includes(voce.ruolo));
            const allergie = anamnesi && anamnesi.scheda ? String(anamnesi.scheda.allergie_farmaci || '').trim() : '';
            const intolleranze = anamnesi && anamnesi.scheda ? String(anamnesi.scheda.intolleranze || '').trim() : '';

            const apri = async () => {
                try {
                    await apriEditorPrescrizione({
                        paziente,
                        prescrittori,
                        anamnesi,
                        onSalva: async stato => {
                            const res = await call('prescrizioni.add', stato);
                            if (esito(res, 'Prescrizione farmacologica emessa')) {
                                await disegna();
                            }
                        }
                    });
                } catch {
                    return;
                }
            };

            const revoca = async riga => {
                try {
                    const procedi = await conferma({
                        titolo: 'Revocare la prescrizione?',
                        messaggio: `${riga.farmaco} verrà rimosso dalle prescrizioni attive del paziente.`,
                        etichettaConferma: 'Revoca',
                        distruttiva: true
                    });
                    if (!procedi) return;
                    if (esito(await call('prescrizioni.remove', { id: riga.id }), 'Prescrizione revocata')) await disegna();
                } catch {
                    return;
                }
            };

            rimpiazza(contenitore, [
                (allergie || intolleranze)
                    ? avviso({
                        tono: 'danger',
                        simbolo: 'warning',
                        titolo: 'Allergie e intolleranze anamnestiche registrate',
                        voci: [
                            allergie ? `Allergie farmacologiche: ${allergie}` : null,
                            intolleranze ? `Intolleranze ed eccipienti: ${intolleranze}` : null,
                            'Il sistema effettua il controllo automatico di compatibilità ad ogni prescrizione.'
                        ].filter(Boolean)
                    })
                    : null,
                prescrittori.length === 0
                    ? avviso({
                        tono: 'warning',
                        simbolo: 'person_alert',
                        titolo: 'Nessun medico prescrittore configurato',
                        voci: ['Registra almeno un collaboratore con ruolo medico o odontoiatra nella sezione Staff.']
                    })
                    : null,
                pannello({
                    titolo: 'Terapie Farmacologiche del Paziente',
                    azioni: [
                        bottone({
                            etichetta: 'Sfoglia Prontuario Odontoiatrico',
                            simbolo: 'menu_book',
                            variante: 'ghost',
                            onClick: () => {
                                apriSelettoreProntuario({
                                    onSeleziona: async farmaco => {
                                        if (puoModificare && prescrittori.length > 0) {
                                            await apriEditorPrescrizione({
                                                paziente,
                                                prescrittori,
                                                anamnesi,
                                                onSalva: async stato => {
                                                    const res = await call('prescrizioni.add', stato);
                                                    if (esito(res, 'Prescrizione emessa')) await disegna();
                                                }
                                            });
                                        }
                                    },
                                    anamnesi,
                                    paziente
                                });
                            }
                        }),
                        puoModificare && prescrittori.length > 0
                            ? bottone({ etichetta: 'Nuova prescrizione', simbolo: 'add', onClick: apri })
                            : null
                    ].filter(Boolean),
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Data', rendi: riga => fmt.data(riga.data_prescrizione) },
                        {
                            titolo: 'Farmaco',
                            rendi: riga => el('div', {}, [
                                el('strong', {}, riga.farmaco),
                                riga.dosaggio ? el('span', { class: 'ds-muted', style: 'margin-left: 6px;' }, riga.dosaggio) : null
                            ])
                        },
                        { titolo: 'Principio attivo', campo: 'principio_attivo' },
                        { titolo: 'Posologia', campo: 'posologia' },
                        {
                            titolo: 'Durata',
                            numerica: true,
                            rendi: riga => (Number(riga.durata_giorni) > 0 ? `${riga.durata_giorni} gg` : '—')
                        },
                        { titolo: 'Prescrittore', campo: 'medico' },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                bottone({
                                    simbolo: 'print',
                                    variante: 'ghost',
                                    piccolo: true,
                                    titolo: 'Stampa promemoria ricetta',
                                    onClick: () => apriStampaPrescrizione(riga, paziente)
                                }),
                                puoModificare ? bottone({
                                    simbolo: 'delete',
                                    variante: 'ghost',
                                    piccolo: true,
                                    titolo: 'Revoca prescrizione',
                                    onClick: () => revoca(riga)
                                }) : null
                            ].filter(Boolean))
                        }
                    ],
                    righe,
                    vuotoTitolo: 'Nessuna prescrizione emessa',
                    vuotoTesto: 'Le terapie farmacologiche prescritte al paziente compariranno qui.',
                    vuotoSimbolo: 'prescriptions'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
