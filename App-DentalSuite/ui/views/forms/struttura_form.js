const TIPI_SALA = [
    { valore: 'operativa', etichetta: 'Sala operativa' },
    { valore: 'chirurgica', etichetta: 'Sala chirurgica' },
    { valore: 'igiene', etichetta: 'Sala igiene' },
    { valore: 'ortodonzia', etichetta: 'Sala ortodonzia' },
    { valore: 'radiologia', etichetta: 'Diagnostica per immagini' },
    { valore: 'sterilizzazione', etichetta: 'Sterilizzazione' },
    { valore: 'attesa', etichetta: 'Sala d\'attesa' },
    { valore: 'studio', etichetta: 'Studio medico' }
];

const STATI_POLTRONA = [
    { valore: 'attiva', etichetta: 'Attiva' },
    { valore: 'manutenzione', etichetta: 'In manutenzione' },
    { valore: 'dismessa', etichetta: 'Dismessa' }
];

export const CAMPI_SEDE = [
    { campo: 'nome', etichetta: 'Nome della sede *', ampio: true },
    { campo: 'codice', etichetta: 'Codice interno' },
    { campo: 'indirizzo', etichetta: 'Indirizzo', ampio: true },
    { campo: 'cap', etichetta: 'CAP', max: 5 },
    { campo: 'citta', etichetta: 'Città' },
    { campo: 'provincia', etichetta: 'Provincia', max: 2 },
    { campo: 'telefono', etichetta: 'Telefono' },
    { campo: 'email', etichetta: 'Email' },
    { campo: 'direttore_sanitario', etichetta: 'Direttore sanitario', ampio: true },
    { campo: 'is_principale', etichetta: 'Sede principale dello studio', genere: 'booleano' }
];

export const CAMPI_SALA = [
    { campo: 'nome', etichetta: 'Nome della sala *', ampio: true },
    { campo: 'tipo_sala', etichetta: 'Tipologia', genere: 'selezione', opzioni: TIPI_SALA, vuoto: false },
    { campo: 'piano', etichetta: 'Piano' },
    { campo: 'codice_stanza', etichetta: 'Codice stanza' },
    { campo: 'colore', etichetta: 'Colore identificativo', tipo: 'color' },
    { campo: 'dotazioni', etichetta: 'Dotazioni e attrezzature', genere: 'area', ampio: true }
];

export const CAMPI_POLTRONA = [
    { campo: 'nome', etichetta: 'Nome della poltrona *', ampio: true },
    { campo: 'codice_unita', etichetta: 'Codice unità' },
    { campo: 'marca_modello', etichetta: 'Marca e modello' },
    { campo: 'matricola', etichetta: 'Matricola' },
    { campo: 'stato', etichetta: 'Stato operativo', genere: 'selezione', opzioni: STATI_POLTRONA, vuoto: false },
    { campo: 'colore_agenda', etichetta: 'Colore in agenda', tipo: 'color' },
    { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
];
