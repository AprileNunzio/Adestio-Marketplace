import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, avviso, vuoto, scheletro } from '../../components/layout.js';
import { costruisciCampi } from '../../components/campi.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import { oggetto } from '../shared/vista.js';

const PATOLOGIE = [
    { campo: 'patologie_cardiovascolari', etichetta: 'Patologie cardiovascolari', genere: 'booleano' },
    { campo: 'terapia_anticoagulanti', etichetta: 'Terapia anticoagulante', genere: 'booleano' },
    { campo: 'ipertensione', etichetta: 'Ipertensione', genere: 'booleano' },
    { campo: 'diabete', etichetta: 'Diabete', genere: 'booleano' },
    { campo: 'epatiti_hiv', etichetta: 'Epatiti / HIV', genere: 'booleano' },
    { campo: 'osteoporosi_bifosfonati', etichetta: 'Osteoporosi / bifosfonati', genere: 'booleano' },
    { campo: 'gravidanza', etichetta: 'Gravidanza in corso', genere: 'booleano' },
    { campo: 'fumatore', etichetta: 'Fumatore', genere: 'booleano' },
    { campo: 'bruxismo', etichetta: 'Bruxismo', genere: 'booleano' },
    { campo: 'ansia_odontoiatrica', etichetta: 'Ansia odontoiatrica', genere: 'booleano' }
];

const TESTUALI = [
    { campo: 'allergie_farmaci', etichetta: 'Allergie farmacologiche', ampio: true },
    { campo: 'allergie_materiali', etichetta: 'Allergie a materiali dentali', ampio: true },
    { campo: 'terapie_in_corso', etichetta: 'Terapie in corso', genere: 'area', ampio: true },
    { campo: 'altre_patologie', etichetta: 'Altre patologie rilevanti', genere: 'area', ampio: true },
    { campo: 'note_mediche', etichetta: 'Note del medico', genere: 'area', ampio: true }
];

export default {
    rendi: async ({ paziente }) => {
        const puoModificare = await can('anamnesi_edit');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const dati = oggetto(await call('anamnesi.get', { paziente_id: paziente.id }), null);
            if (!dati) {
                rimpiazza(contenitore, vuoto({ titolo: 'Anamnesi non disponibile', simbolo: 'clinical_notes' }));
                return;
            }

            const stato = { ...dati.scheda };
            const onCambio = (campo, valore) => {
                stato[campo] = valore;
            };

            const salva = async () => {
                const risultato = await call('anamnesi.save', { ...stato, paziente_id: paziente.id });
                if (esito(risultato, 'Anamnesi aggiornata')) await disegna();
            };

            rimpiazza(contenitore, [
                dati.allerte.length > 0
                    ? avviso({
                        tono: 'danger',
                        simbolo: 'e911_emergency',
                        titolo: 'Allerte cliniche da considerare prima di ogni trattamento',
                        voci: dati.allerte
                    })
                    : avviso({
                        tono: 'info',
                        simbolo: 'verified',
                        titolo: 'Nessuna allerta clinica registrata',
                        voci: ['Verificare comunque l\'anamnesi con il paziente prima di procedere.']
                    }),
                pannello({
                    titolo: 'Quadro patologico',
                    azioni: puoModificare ? [bottone({ etichetta: 'Salva anamnesi', simbolo: 'save', onClick: salva })] : []
                }, el('div', { class: 'ds-grid ds-grid--form' },
                    costruisciCampi(
                        PATOLOGIE.map(campo => ({ ...campo, disabilitato: !puoModificare })),
                        stato,
                        onCambio
                    ))),
                pannello({ titolo: 'Dettaglio anamnestico' },
                    el('div', { class: 'ds-grid ds-grid--form' },
                        costruisciCampi(
                            TESTUALI.map(campo => ({ ...campo, disabilitato: !puoModificare })),
                            stato,
                            onCambio
                        )))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
