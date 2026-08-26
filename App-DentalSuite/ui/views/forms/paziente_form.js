const SESSI = [
    { valore: 'M', etichetta: 'Maschile' },
    { valore: 'F', etichetta: 'Femminile' },
    { valore: 'X', etichetta: 'Non specificato' }
];

const CANALI = [
    { valore: 'whatsapp', etichetta: 'WhatsApp' },
    { valore: 'sms', etichetta: 'SMS' },
    { valore: 'email', etichetta: 'Email' },
    { valore: 'telefono', etichetta: 'Telefono' }
];

export const SEZIONI_PAZIENTE = [
    {
        titolo: 'Dati anagrafici',
        campi: [
            { campo: 'cognome', etichetta: 'Cognome *' },
            { campo: 'nome', etichetta: 'Nome *' },
            { campo: 'secondo_nome', etichetta: 'Secondo nome' },
            { campo: 'codice_fiscale', etichetta: 'Codice fiscale', max: 16, aiuto: 'Validato con carattere di controllo' },
            { campo: 'data_nascita', etichetta: 'Data di nascita', tipo: 'date' },
            { campo: 'luogo_nascita', etichetta: 'Luogo di nascita' },
            { campo: 'sesso', etichetta: 'Sesso', genere: 'selezione', opzioni: SESSI },
            { campo: 'professione', etichetta: 'Professione' }
        ]
    },
    {
        titolo: 'Recapiti',
        campi: [
            { campo: 'telefono', etichetta: 'Telefono' },
            { campo: 'email', etichetta: 'Email', tipo: 'email' },
            { campo: 'indirizzo', etichetta: 'Indirizzo', ampio: true },
            { campo: 'cap', etichetta: 'CAP', max: 5 },
            { campo: 'citta', etichetta: 'Città' },
            { campo: 'provincia', etichetta: 'Provincia', max: 2 }
        ]
    },
    {
        titolo: 'Dati sanitari e amministrativi',
        campi: [
            { campo: 'gruppo_sanguigno', etichetta: 'Gruppo sanguigno' },
            { campo: 'esenzioni', etichetta: 'Codici esenzione' },
            { campo: 'assicurazione', etichetta: 'Assicurazione' },
            { campo: 'numero_polizza', etichetta: 'Numero polizza' },
            { campo: 'medico_curante', etichetta: 'Medico curante' },
            { campo: 'tel_medico_curante', etichetta: 'Telefono medico curante' },
            { campo: 'codice_sdi', etichetta: 'Codice SDI', max: 7 },
            { campo: 'pec', etichetta: 'PEC' }
        ]
    },
    {
        titolo: 'Contatto di emergenza',
        campi: [
            { campo: 'contatto_emergenza_nome', etichetta: 'Nominativo' },
            { campo: 'contatto_emergenza_parentela', etichetta: 'Parentela' },
            { campo: 'contatto_emergenza_tel', etichetta: 'Telefono' }
        ]
    },
    {
        titolo: 'Preferenze e consensi',
        campi: [
            { campo: 'canale_preferito', etichetta: 'Canale preferito', genere: 'selezione', opzioni: CANALI, vuoto: false },
            { campo: 'preferenze_orari', etichetta: 'Preferenze di orario' },
            { campo: 'consenso_promemoria', etichetta: 'Consenso ai promemoria', genere: 'booleano' },
            { campo: 'consenso_privacy', etichetta: 'Consenso privacy GDPR acquisito', genere: 'booleano' },
            { campo: 'data_consenso_privacy', etichetta: 'Data consenso privacy', tipo: 'date' },
            { campo: 'pacemaker', etichetta: 'Portatore di pacemaker', genere: 'booleano' },
            { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
        ]
    }
];

export const PAZIENTE_VUOTO = {
    cognome: '', nome: '', secondo_nome: '', codice_fiscale: '', data_nascita: '',
    luogo_nascita: '', sesso: '', professione: '', telefono: '', email: '',
    indirizzo: '', cap: '', citta: '', provincia: '', gruppo_sanguigno: '',
    esenzioni: '', assicurazione: '', numero_polizza: '', medico_curante: '',
    tel_medico_curante: '', codice_sdi: '', pec: '', contatto_emergenza_nome: '',
    contatto_emergenza_parentela: '', contatto_emergenza_tel: '',
    canale_preferito: 'whatsapp', preferenze_orari: '', consenso_promemoria: 1,
    consenso_privacy: 0, data_consenso_privacy: '', pacemaker: 0, note: ''
};
