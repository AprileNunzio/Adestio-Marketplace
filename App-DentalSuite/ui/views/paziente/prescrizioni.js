import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, scheletro, avviso } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { opzioniDa } from '../../components/campi.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const RUOLI_PRESCRITTORI = ['medico', 'odontoiatra'];

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

            const apri = async () => {
                await apriForm({
                    titolo: 'Nuova prescrizione farmacologica',
                    sezioni: [{
                        titolo: null,
                        campi: [
                            {
                                campo: 'medico_id',
                                etichetta: 'Medico prescrittore *',
                                genere: 'selezione',
                                opzioni: opzioniDa(prescrittori, 'id', voce => voce.nominativo),
                                ampio: true
                            },
                            { campo: 'farmaco', etichetta: 'Farmaco *', ampio: true },
                            { campo: 'principio_attivo', etichetta: 'Principio attivo' },
                            { campo: 'dosaggio', etichetta: 'Dosaggio' },
                            { campo: 'posologia', etichetta: 'Posologia' },
                            { campo: 'durata_giorni', etichetta: 'Durata (giorni)', genere: 'numero', passo: '1' },
                            { campo: 'data_prescrizione', etichetta: 'Data', tipo: 'date' },
                            { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
                        ]
                    }],
                    valori: { data_prescrizione: fmt.oggiIso(), medico_id: '', durata_giorni: 0 },
                    etichettaSalva: 'Emetti prescrizione',
                    onSalva: stato => call('prescrizioni.add', { ...stato, paziente_id: paziente.id })
                });
                await disegna();
            };

            const revoca = async riga => {
                const procedi = await conferma({
                    titolo: 'Revocare la prescrizione?',
                    messaggio: `${riga.farmaco} verrà rimosso dalle prescrizioni attive del paziente.`,
                    etichettaConferma: 'Revoca',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('prescrizioni.remove', { id: riga.id }), 'Prescrizione revocata')) await disegna();
            };

            rimpiazza(contenitore, [
                allergie
                    ? avviso({
                        tono: 'danger',
                        simbolo: 'warning',
                        titolo: 'Allergie farmacologiche dichiarate',
                        voci: [allergie, 'Verificare la compatibilità prima di prescrivere.']
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
                    titolo: 'Terapie farmacologiche',
                    azioni: puoModificare && prescrittori.length > 0
                        ? [bottone({ etichetta: 'Nuova prescrizione', simbolo: 'add', onClick: apri })]
                        : [],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Data', rendi: riga => fmt.data(riga.data_prescrizione) },
                        { titolo: 'Farmaco', campo: 'farmaco' },
                        { titolo: 'Principio attivo', campo: 'principio_attivo' },
                        { titolo: 'Dosaggio', campo: 'dosaggio' },
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
                                puoModificare ? bottone({
                                    simbolo: 'delete', variante: 'ghost', piccolo: true,
                                    titolo: 'Revoca prescrizione', onClick: () => revoca(riga)
                                }) : null
                            ])
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
