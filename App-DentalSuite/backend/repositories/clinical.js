'use strict';

const { createRepository } = require('../kernel/repository');

const AUTORE = ['autore_id'];

const pazienti = createRepository('pazienti', [
    'codice_fiscale', 'nome', 'secondo_nome', 'cognome', 'data_nascita', 'luogo_nascita',
    'sesso', 'telefono', 'email', 'indirizzo', 'cap', 'citta', 'provincia',
    'esenzioni', 'assicurazione', 'numero_polizza', 'gruppo_sanguigno', 'professione',
    'stato_civile', 'canale_preferito', 'consenso_promemoria', 'consenso_privacy',
    'data_consenso_privacy', 'codice_sdi', 'pec', 'medico_curante', 'tel_medico_curante',
    'contatto_emergenza_nome', 'contatto_emergenza_parentela', 'contatto_emergenza_tel',
    'preferenze_orari', 'pacemaker', 'note'
], { label: 'Paziente', orderBy: 'cognome ASC, nome ASC', systemColumns: AUTORE });

const anamnesi = createRepository('anamnesi', [
    'paziente_id', 'allergie_farmaci', 'allergie_materiali', 'intolleranze', 'patologie_cardiovascolari',
    'terapia_anticoagulanti', 'diabete', 'ipertensione', 'epatiti_hiv',
    'osteoporosi_bifosfonati', 'fumatore', 'gravidanza', 'ansia_odontoiatrica', 'bruxismo',
    'altre_patologie', 'terapie_in_corso', 'note_mediche', 'data_compilazione',
    'patologie_strutturate', 'allergie_strutturate', 'intolleranze_strutturate',
    'valutazione_rischio', 'stile_vita_strutturato', 'farmaci_abituali',
    'data_revisione', 'medico_revisore_id'
], { label: 'Anamnesi', systemColumns: AUTORE });

const odontogramma = createRepository('odontogramma', [
    'paziente_id', 'numero_dente', 'dentizione', 'superfici', 'stato',
    'materiale', 'mobilita', 'note', 'data_rilevazione', 'rilevazione_id'
], { label: 'Dente', orderBy: 'numero_dente ASC', systemColumns: AUTORE });

const trattamenti = createRepository('trattamenti_paziente', [
    'paziente_id', 'prestazione_id', 'descrizione', 'dente', 'superfici', 'medico_id',
    'segretaria_id', 'poltrona_id', 'data_trattamento', 'stato', 'importo',
    'quota_medico', 'quota_segretaria', 'costo_materiali', 'liquidazione_id', 'note',
    'anestesia', 'lotto_materiali'
], { label: 'Trattamento', orderBy: 'data_trattamento DESC', systemColumns: AUTORE });

const prescrizioni = createRepository('prescrizioni_farmaci', [
    'paziente_id', 'medico_id', 'farmaco', 'principio_attivo', 'dosaggio',
    'posologia', 'durata_giorni', 'data_prescrizione', 'note'
], { label: 'Prescrizione', orderBy: 'data_prescrizione DESC', systemColumns: AUTORE });

const allegati = createRepository('allegati_diagnostici', [
    'paziente_id', 'tipo', 'titolo', 'file_name', 'file_path', 'file_size',
    'mime_type', 'data_esame', 'note', 'impronta', 'anteprima_path',
    'visione_path', 'larghezza', 'altezza', 'derivate_stato'
], { label: 'Referto', orderBy: 'data_esame DESC', systemColumns: AUTORE });

const prontuarioFarmaci = createRepository('prontuario_farmaci_studio', [
    'farmaco', 'principio_attivo', 'categoria', 'dosaggio', 'posologia', 'durata_giorni', 'note'
], { label: 'Farmaco Prontuario', orderBy: 'farmaco ASC', systemColumns: AUTORE });

module.exports = { pazienti, anamnesi, odontogramma, trattamenti, prescrizioni, allegati, prontuarioFarmaci };
