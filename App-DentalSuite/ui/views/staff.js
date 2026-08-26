import { el, rimpiazza } from '../components/dom.js';
import { intestazione, pannello, bottone, distintivo } from '../components/layout.js';
import { tabella, azioniRiga } from '../components/tabella.js';
import { conferma } from '../components/modale.js';
import { esito } from '../components/notifica.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import * as fmt from '../kernel/format.js';
import { montaVista, elenco } from './shared/vista.js';
import { apriForm } from './shared/form_modale.js';
import { SEZIONI_STAFF, STAFF_VUOTO, TONI_RUOLO } from './forms/staff_form.js';
import { rendiLiquidazioni } from './staff/liquidazioni.js';
import { rendiAccordi } from './staff/accordi.js';
import { rendiTurni } from './staff/turni.js';

export default {
    rendi: async ({ indietro }) => {
        const permessi = {
            modifica: await can('staff_edit'),
            elimina: await can('staff_delete'),
            compensi: await can('compensi_view'),
            liquida: await can('compensi_settle'),
            turniVista: await can('turni_view'),
            turni: await can('turni_edit'),
            assenze: await can('assenze_view'),
            assenzeGestione: await can('assenze_manage')
        };
        let scheda = 'collaboratori';
        let scelto = null;

        return montaVista({
            accento: 'staff',
            carica: async () => elenco(await call('staff.list', { includeArchived: true })),
            disegna: (righe, aggiorna) => {
                const attivi = righe.filter(riga => Number(riga.is_deleted) === 0);
                if (!scelto && attivi.length > 0) scelto = attivi[0].id;

                const apri = async riga => {
                    await apriForm({
                        titolo: riga ? `Modifica ${riga.nominativo}` : 'Nuovo collaboratore',
                        sezioni: SEZIONI_STAFF,
                        valori: riga ? { ...STAFF_VUOTO, ...riga } : { ...STAFF_VUOTO },
                        ampia: true,
                        etichettaSalva: riga ? 'Aggiorna' : 'Registra collaboratore',
                        onSalva: stato => call(riga ? 'staff.update' : 'staff.create', {
                            ...stato,
                            id: riga ? riga.id : undefined
                        })
                    });
                    await aggiorna();
                };

                const disattiva = async riga => {
                    const procedi = await conferma({
                        titolo: 'Disattivare il collaboratore?',
                        messaggio: `${riga.nominativo} non sarà più selezionabile in agenda e nei trattamenti. Lo storico resta consultabile.`,
                        etichettaConferma: 'Disattiva',
                        distruttiva: true
                    });
                    if (!procedi) return;
                    if (esito(await call('staff.remove', { id: riga.id }), 'Collaboratore disattivato')) await aggiorna();
                };

                const contenuto = el('div', {});

                const mostra = async id => {
                    scheda = id;
                    barra.querySelectorAll('.ds-tab').forEach(nodo => {
                        nodo.setAttribute('aria-selected', nodo.dataset.scheda === id ? 'true' : 'false');
                    });
                    if (id === 'liquidazioni') {
                        rimpiazza(contenuto, await rendiLiquidazioni({ collaboratori: attivi, permessi }));
                        return;
                    }
                    if (id === 'turni') {
                        const scelta = el('select', {
                            class: 'ds-select',
                            onChange: async evento => {
                                scelto = evento.target.value;
                                await mostra('turni');
                            }
                        }, attivi.map(voce => el('option', {
                            value: voce.id, selected: voce.id === scelto
                        }, voce.nominativo)));
                        const corrente = attivi.find(voce => voce.id === scelto) || attivi[0];
                        rimpiazza(contenuto, [
                            pannello({ titolo: 'Collaboratore', azioni: [scelta] }, el('p', { class: 'ds-muted' },
                                `Giorni e orari di lavoro, aperture straordinarie, ferie e permessi: da qui l'agenda sa quando ${corrente ? corrente.nominativo : 'il collaboratore'} è disponibile.`)),
                            rendiTurni({ collaboratore: corrente, collaboratori: attivi, permessi })
                        ]);
                        return;
                    }
                    if (id === 'accordi') {
                        const scelta = el('select', {
                            class: 'ds-select',
                            onChange: async evento => {
                                scelto = evento.target.value;
                                await mostra('accordi');
                            }
                        }, attivi.map(voce => el('option', {
                            value: voce.id, selected: voce.id === scelto
                        }, voce.nominativo)));
                        const corrente = attivi.find(voce => voce.id === scelto) || attivi[0];
                        rimpiazza(contenuto, [
                            pannello({ titolo: 'Collaboratore', azioni: [scelta] }, el('p', { class: 'ds-muted' },
                                'Gli accordi definiscono quanto prende questo collaboratore su ogni tipo di lavoro.')),
                            await rendiAccordi({ collaboratore: corrente })
                        ]);
                        return;
                    }
                    rimpiazza(contenuto, pannello({ titolo: 'Organico dello studio', flush: true }, tabella({
                        colonne: [
                            { titolo: 'Collaboratore', campo: 'nominativo' },
                            {
                                titolo: 'Ruolo',
                                rendi: riga => distintivo(fmt.etichettaStato(riga.ruolo), TONI_RUOLO[riga.ruolo] || 'neutral')
                            },
                            { titolo: 'Specializzazione', campo: 'specializzazione' },
                            { titolo: 'Albo', campo: 'numero_albo' },
                            { titolo: 'Telefono', campo: 'telefono' },
                            {
                                titolo: 'Quota default',
                                numerica: true,
                                rendi: riga => fmt.percentuale(riga.percentuale_default)
                            },
                            {
                                titolo: 'Ritenuta',
                                numerica: true,
                                rendi: riga => fmt.percentuale(riga.ritenuta_acconto_percentuale)
                            },
                            {
                                titolo: '',
                                rendi: riga => azioniRiga([
                                    Number(riga.is_deleted) === 1 ? distintivo('Disattivato', 'neutral') : null,
                                    permessi.modifica ? bottone({
                                        simbolo: 'edit', variante: 'ghost', piccolo: true,
                                        titolo: 'Modifica', onClick: () => apri(riga)
                                    }) : null,
                                    permessi.elimina && Number(riga.is_deleted) === 0 ? bottone({
                                        simbolo: 'person_off', variante: 'ghost', piccolo: true,
                                        titolo: 'Disattiva', onClick: () => disattiva(riga)
                                    }) : null
                                ])
                            }
                        ],
                        righe,
                        vuotoTitolo: 'Nessun collaboratore registrato',
                        vuotoTesto: 'Registra medici, igienisti, assistenti ASO e segreteria per abilitare agenda e compensi.',
                        vuotoSimbolo: 'badge'
                    })));
                };

                const schede = [
                    { id: 'collaboratori', titolo: 'Collaboratori', simbolo: 'groups', attiva: true },
                    { id: 'turni', titolo: 'Turni & Assenze', simbolo: 'schedule', attiva: permessi.turniVista },
                    { id: 'accordi', titolo: 'Accordi economici', simbolo: 'handshake', attiva: permessi.compensi },
                    { id: 'liquidazioni', titolo: 'Compensi & Liquidazioni', simbolo: 'payments', attiva: permessi.compensi }
                ];

                const barra = el('nav', { class: 'ds-tabs' }, schede.map(voce => el('button', {
                    class: 'ds-tab',
                    type: 'button',
                    dataset: { scheda: voce.id },
                    'aria-selected': voce.id === scheda ? 'true' : 'false',
                    disabled: !voce.attiva,
                    title: voce.attiva ? voce.titolo : `Richiede il permesso ${voce.id === 'turni' ? 'turni_view' : 'compensi_view'}`,
                    onClick: () => mostra(voce.id)
                }, [el('span', { class: 'material-symbols-rounded' }, voce.simbolo), voce.titolo])));

                mostra(scheda);

                return [
                    intestazione({
                        titolo: 'Staff & Compensi',
                        sottotitolo: `${attivi.length} collaboratori attivi nello studio`,
                        simbolo: 'badge',
                        indietro,
                        azioni: permessi.modifica
                            ? [bottone({ etichetta: 'Nuovo collaboratore', simbolo: 'person_add', onClick: () => apri(null) })]
                            : []
                    }),
                    barra,
                    contenuto
                ];
            }
        });
    }
};
