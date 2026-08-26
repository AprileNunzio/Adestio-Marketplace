import { pannello, coppie } from '../../components/layout.js';
import * as fmt from '../../kernel/format.js';

const SESSI = { M: 'Maschile', F: 'Femminile', X: 'Non specificato' };

export default {
    rendi: async ({ paziente }) => [
        pannello({ titolo: 'Dati anagrafici' }, coppie([
            { etichetta: 'Nominativo', valore: paziente.nominativo },
            { etichetta: 'Codice fiscale', valore: paziente.codice_fiscale },
            { etichetta: 'Data di nascita', valore: fmt.data(paziente.data_nascita) },
            { etichetta: 'Età', valore: paziente.eta !== null ? `${paziente.eta} anni` : null },
            { etichetta: 'Luogo di nascita', valore: paziente.luogo_nascita },
            { etichetta: 'Sesso', valore: SESSI[paziente.sesso] },
            { etichetta: 'Professione', valore: paziente.professione },
            { etichetta: 'Gruppo sanguigno', valore: paziente.gruppo_sanguigno }
        ])),
        pannello({ titolo: 'Recapiti' }, coppie([
            { etichetta: 'Telefono', valore: paziente.telefono },
            { etichetta: 'Email', valore: paziente.email },
            { etichetta: 'Indirizzo', valore: paziente.indirizzo },
            { etichetta: 'Città', valore: [paziente.cap, paziente.citta, paziente.provincia].filter(Boolean).join(' ') },
            { etichetta: 'PEC', valore: paziente.pec },
            { etichetta: 'Codice SDI', valore: paziente.codice_sdi }
        ])),
        pannello({ titolo: 'Copertura sanitaria' }, coppie([
            { etichetta: 'Esenzioni', valore: paziente.esenzioni },
            { etichetta: 'Assicurazione', valore: paziente.assicurazione },
            { etichetta: 'Numero polizza', valore: paziente.numero_polizza },
            { etichetta: 'Medico curante', valore: paziente.medico_curante },
            { etichetta: 'Telefono curante', valore: paziente.tel_medico_curante }
        ])),
        pannello({ titolo: 'Emergenze e consensi' }, coppie([
            { etichetta: 'Contatto emergenza', valore: paziente.contatto_emergenza_nome },
            { etichetta: 'Parentela', valore: paziente.contatto_emergenza_parentela },
            { etichetta: 'Telefono emergenza', valore: paziente.contatto_emergenza_tel },
            { etichetta: 'Canale preferito', valore: fmt.etichettaStato(paziente.canale_preferito) },
            { etichetta: 'Preferenze orarie', valore: paziente.preferenze_orari },
            {
                etichetta: 'Consenso privacy',
                valore: Number(paziente.consenso_privacy) === 1
                    ? `Acquisito il ${fmt.data(paziente.data_consenso_privacy)}`
                    : 'Non acquisito'
            },
            { etichetta: 'Note', valore: paziente.note }
        ]))
    ]
};
