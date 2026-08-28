export const CATEGORIE_PATOLOGIE = [
    {
        id: 'cardio',
        titolo: 'Apparato Cardiovascolare',
        simbolo: 'cardiology',
        colore: 'danger',
        voci: [
            { id: 'ipertensione', etichetta: 'Ipertensione arteriosa', livello: 'attenzione' },
            { id: 'ipertensione_grave', etichetta: 'Ipertensione grave / non controllata', livello: 'critica' },
            { id: 'ipotensione', etichetta: 'Ipotensione / Sincope vasovagale', livello: 'nota' },
            { id: 'cardiopatia_ischemica', etichetta: 'Cardiopatia ischemica / Pregresso infarto', livello: 'critica' },
            { id: 'angina', etichetta: 'Angina pectoris (stabile / instabile)', livello: 'critica' },
            { id: 'aritmie', etichetta: 'Aritmie cardiache / Fibrillazione atriale', livello: 'critica' },
            { id: 'pacemaker_icd', etichetta: 'Portatore di Pacemaker / ICD', livello: 'critica' },
            { id: 'valvulopatie', etichetta: 'Valvulopatia cardiaca', livello: 'attenzione' },
            { id: 'protesi_valvolari', etichetta: 'Protesi valvolare cardiaca (meccanica/biologica)', livello: 'critica' },
            { id: 'endocardite_batterica', etichetta: 'Pregressa endocardite (profilassi obbligatoria)', livello: 'critica' },
            { id: 'scompenso_cardiaco', etichetta: 'Scompenso cardiaco congestizio', livello: 'critica' },
            { id: 'bypass_stent', etichetta: 'Bypass coronarico / Stent impiantato', livello: 'critica' },
            { id: 'ictus_tia', etichetta: 'Pregresso Ictus cerebrale / TIA', livello: 'critica' }
        ]
    },
    {
        id: 'ematologia',
        titolo: 'Ematologia & Coagulazione',
        simbolo: 'water_drop',
        colore: 'danger',
        voci: [
            { id: 'anticoagulanti_tao', etichetta: 'Terapia anticoagulante TAO (Coumadin / Sintrom)', livello: 'critica' },
            { id: 'anticoagulanti_nao', etichetta: 'Nuovi anticoagulanti orali NAO / DOAC (Eliquis, Xarelto, Pradaxa, Lixiana)', livello: 'critica' },
            { id: 'antiaggreganti', etichetta: 'Terapia antiaggregante (Cardioaspirina, Plavix, Ticagrelor)', livello: 'attenzione' },
            { id: 'coagulopatie', etichetta: 'Coagulopatia congenita / Emofilia / Von Willebrand', livello: 'critica' },
            { id: 'piastrinopenia', etichetta: 'Piastrinopenia / Trombocitopenia', livello: 'critica' },
            { id: 'anemia_grave', etichetta: 'Anemia severa', livello: 'attenzione' },
            { id: 'emorragie_pregresse', etichetta: 'Precedenti emorragie post-chirurgiche prolungate', livello: 'attenzione' }
        ]
    },
    {
        id: 'endocrino',
        titolo: 'Endocrinologia & Metabolismo',
        simbolo: 'bloodtype',
        colore: 'warning',
        voci: [
            { id: 'diabete_tipo1', etichetta: 'Diabete mellito Tipo 1 (Insulino-dipendente)', livello: 'critica' },
            { id: 'diabete_tipo2', etichetta: 'Diabete mellito Tipo 2 (Compensato con ipoglicemizzanti)', livello: 'attenzione' },
            { id: 'diabete_scompensato', etichetta: 'Diabete scompensato / HbA1c elevata', livello: 'critica' },
            { id: 'ipotiroidismo', etichetta: 'Ipotiroidismo / Tiroidite di Hashimoto', livello: 'nota' },
            { id: 'ipertiroidismo', etichetta: 'Ipertiroidismo / Morbo di Basedow', livello: 'attenzione' },
            { id: 'terapia_cortisonica', etichetta: 'Terapia cortisonica cronica / Insufficienza surrenalica', livello: 'attenzione' },
            { id: 'obesita_grave', etichetta: 'Grave obesità / Sindrome metabolica', livello: 'nota' }
        ]
    },
    {
        id: 'osseo',
        titolo: 'Apparato Osseo & Rischio MRONJ',
        simbolo: 'skull',
        colore: 'danger',
        voci: [
            { id: 'bifosfonati_orali', etichetta: 'Bifosfonati orali (Alendronato, Risedronato, Ibandronato)', livello: 'critica' },
            { id: 'bifosfonati_ev', etichetta: 'Bifosfonati endovenosi (Zoledronato / Zometa, Pamidronato)', livello: 'critica' },
            { id: 'denosumab', etichetta: 'Anticorpi antiriassorbitivi Denosumab (Prolia / Xgeva)', livello: 'critica' },
            { id: 'terapie_antiangiogeniche', etichetta: 'Terapie antiangiogeniche oncologiche', livello: 'critica' },
            { id: 'osteoporosi', etichetta: 'Osteoporosi accertata', livello: 'attenzione' },
            { id: 'radioterapia_testa_collo', etichetta: 'Pregressa radioterapia distretto cervico-facciale', livello: 'critica' }
        ]
    },
    {
        id: 'respiratorio',
        titolo: 'Apparato Respiratorio',
        simbolo: 'pulmonology',
        colore: 'warning',
        voci: [
            { id: 'asma', etichetta: 'Asma bronchiale (avere broncodilatatore in seduta)', livello: 'attenzione' },
            { id: 'bpco', etichetta: 'BPCO / Broncopneumopatia cronica ostruttiva', livello: 'attenzione' },
            { id: 'enfisema', etichetta: 'Enfisema polmonare', livello: 'attenzione' },
            { id: 'insufficienza_respiratoria', etichetta: 'Insufficienza respiratoria / Ossigenoterapia domiciliare', livello: 'critica' },
            { id: 'osas', etichetta: 'Sindrome delle apnee ostruttive del sonno (OSAS / CPAP)', livello: 'nota' },
            { id: 'tubercolosi', etichetta: 'Tubercolosi pregressa o attiva', livello: 'critica' }
        ]
    },
    {
        id: 'epato_renale',
        titolo: 'Fegato, Reni & Gastrointestinale',
        simbolo: 'nephrology',
        colore: 'warning',
        voci: [
            { id: 'epatite_b', etichetta: 'Epatite B (HBV)', livello: 'critica' },
            { id: 'epatite_c', etichetta: 'Epatite C (HCV)', livello: 'critica' },
            { id: 'insufficienza_epatica', etichetta: 'Cirrosi / Insufficienza epatica cronica', livello: 'critica' },
            { id: 'insufficienza_renale', etichetta: 'Insufficienza renale cronica (IRC)', livello: 'attenzione' },
            { id: 'emodialisi', etichetta: 'Paziente in Emodialisi (fistola artero-venosa)', livello: 'critica' },
            { id: 'gerd', etichetta: 'Reflusso gastroesofageo severo / Ulcera gastroduodenale', livello: 'nota' },
            { id: 'mici', etichetta: 'Malattie infiammatorie croniche intestinali (Crohn / RCU)', livello: 'attenzione' }
        ]
    },
    {
        id: 'onco_immuno',
        titolo: 'Oncologia & Immunologia',
        simbolo: 'vaccines',
        colore: 'danger',
        voci: [
            { id: 'neoplasia_attiva', etichetta: 'Neoplasia maligna in trattamento', livello: 'critica' },
            { id: 'neoplasia_pregressa', etichetta: 'Neoplasia pregressa in remissione', livello: 'attenzione' },
            { id: 'chemioterapia', etichetta: 'Chemioterapia recente o in corso', livello: 'critica' },
            { id: 'hiv_aids', etichetta: 'Infezione da HIV / Siero-positività', livello: 'critica' },
            { id: 'immunodepressione', etichetta: 'Stato di immunodeficienza / Terapia antirigetto', livello: 'critica' },
            { id: 'malattie_autoimmuni', etichetta: 'Malattie autoimmuni (Lupus LES, Artrite reumatoide, Sjogren, Sclerosi multipla)', livello: 'attenzione' }
        ]
    },
    {
        id: 'neuro_psichiatrico',
        titolo: 'Neurologia & Salute Mentale',
        simbolo: 'psychology',
        colore: 'info',
        voci: [
            { id: 'epilessia', etichetta: 'Epilessia / Crisi convulsive', livello: 'attenzione' },
            { id: 'parkinson', etichetta: 'Morbo di Parkinson', livello: 'attenzione' },
            { id: 'demenza_alzheimer', etichetta: 'Decadimento cognitivo / Alzheimer', livello: 'attenzione' },
            { id: 'odontofobia', etichetta: 'Odontofobia / Ansia odontoiatrica severa', livello: 'nota' },
            { id: 'attacchi_panico', etichetta: 'Disturbo da attacchi di panico', livello: 'nota' },
            { id: 'depressione', etichetta: 'Depressione maggiore in terapia psicofarmacologica', livello: 'nota' }
        ]
    }
];

export const CATEGORIE_ALLERGIE = [
    {
        id: 'farmaci',
        titolo: 'Allergie Farmacologiche',
        simbolo: 'medication',
        colore: 'danger',
        voci: [
            { id: 'penicilline', etichetta: 'Penicilline / Amoxicillina / Ampicillina', livello: 'critica' },
            { id: 'cefalosporine', etichetta: 'Cefalosporine', livello: 'critica' },
            { id: 'macrolidi', etichetta: 'Macrolidi (Claritromicina, Azitromicina)', livello: 'critica' },
            { id: 'sulfamidici', etichetta: 'Sulfamidici', livello: 'critica' },
            { id: 'chinolonici', etichetta: 'Chinolonici / Ciprofloxacina', livello: 'critica' },
            { id: 'fans', etichetta: 'FANS (Ibuprofene, Ketoprofene, Aspirina, Naprossene)', livello: 'critica' },
            { id: 'paracetamolo', etichetta: 'Paracetamolo', livello: 'critica' },
            { id: 'anestetici_adrenalina', etichetta: 'Adrenalina / Vasocostrittori (reazione avversa / intolleranza)', livello: 'critica' },
            { id: 'anestetici_locali', etichetta: 'Anestetici locali ammidici (Articaina, Lidocaina, Mepivacaina)', livello: 'critica' },
            { id: 'metabisolfito', etichetta: 'Solfiti / Metabisolfito (conservante tubofiale)', livello: 'critica' },
            { id: 'codeina_oppioidi', etichetta: 'Codeina / Farmaci Oppioidi', livello: 'critica' }
        ]
    },
    {
        id: 'materiali',
        titolo: 'Materiali Odontoiatrici & Sostanze Chimiche',
        simbolo: 'science',
        colore: 'danger',
        voci: [
            { id: 'lattice', etichetta: 'Lattice (Latex allergy - Uso rigoroso guanti Nitrile)', livello: 'critica' },
            { id: 'nichel', etichetta: 'Nichel (Metalli odontoiatrici / Ortodonzia)', livello: 'attenzione' },
            { id: 'altri_metalli', etichetta: 'Cromo, Cobalto, Titanio, Oro', livello: 'attenzione' },
            { id: 'resine_acriliche', etichetta: 'Resine acriliche / Monomero metacrilato', livello: 'attenzione' },
            { id: 'resine_composite', etichetta: 'Resine composite / Adesivi smalto-dentinali', livello: 'attenzione' },
            { id: 'clorexidina', etichetta: 'Clorexidina (Collutorio / Gel / Spray)', livello: 'critica' },
            { id: 'iodio_betadine', etichetta: 'Iodio / Disinfettanti a base di Iodio (Betadine)', livello: 'critica' },
            { id: 'eugenolo', etichetta: 'Eugenolo / Paste all\'ossido di zinco', livello: 'attenzione' },
            { id: 'materiali_impronta', etichetta: 'Alginato / Siliconi per impronte', livello: 'nota' }
        ]
    }
];

export const CATEGORIE_INTOLLERANZE = [
    {
        id: 'intolleranze_alimentari',
        titolo: 'Intolleranze & Eccipienti Farmaceutici',
        simbolo: 'no_food',
        colore: 'warning',
        voci: [
            { id: 'lattosio', etichetta: 'Lattosio (Attenzione agli eccipienti in compresse)', livello: 'critica' },
            { id: 'glutine', etichetta: 'Celiachia / Intolleranza al Glutine (Paste profilassi)', livello: 'critica' },
            { id: 'favismo', etichetta: 'Favismo (Deficit G6PD - divieto farmaci ossidanti)', livello: 'critica' },
            { id: 'nichel_alimentare', etichetta: 'Sindrome da allergia sistemica al Nichel', livello: 'attenzione' },
            { id: 'fruttosio_sorbitolo', etichetta: 'Intolleranza a Fruttosio / Sorbitolo', livello: 'nota' }
        ]
    }
];

export const CATEGORIE_STILE_VITA = [
    {
        id: 'abitudini',
        titolo: 'Stile di Vita, Abitudini & Fisiologia',
        simbolo: 'ecg_heart',
        colore: 'info',
        voci: [
            { id: 'fumo_attivo', etichetta: 'Fumatore attivo di sigarette', livello: 'nota' },
            { id: 'iqos_svapo', etichetta: 'Sigaretta elettronica / Tabacco riscaldato (IQOS)', livello: 'nota' },
            { id: 'ex_fumatore', etichetta: 'Ex fumatore', livello: 'nota' },
            { id: 'alcol_abituale', etichetta: 'Consumo abituale di bevande alcoliche', livello: 'nota' },
            { id: 'stupefacenti', etichetta: 'Assunzione sostanze stupefacenti / cannabinoidi / stimolanti', livello: 'critica' },
            { id: 'bruxismo', etichetta: 'Bruxismo notturno / diurno', livello: 'nota' },
            { id: 'serramento', etichetta: 'Serramento dentale (Clenching)', livello: 'nota' },
            { id: 'onicofagia', etichetta: 'Onicofagia / Masticazione oggetti', livello: 'nota' },
            { id: 'respirazione_orale', etichetta: 'Respirazione orale prevalente', livello: 'nota' },
            { id: 'gravidanza', etichetta: 'Gravidanza in corso', livello: 'critica' },
            { id: 'allattamento', etichetta: 'Allattamento al seno in corso', livello: 'attenzione' }
        ]
    },
    {
        id: 'atm_odontoiatria',
        titolo: 'Articolazione ATM & Pregressi Odontoiatrici',
        simbolo: 'dentistry',
        colore: 'info',
        voci: [
            { id: 'click_atm', etichetta: 'Click / Scatto articolazione temporo-mandibolare (ATM)', livello: 'nota' },
            { id: 'dolore_atm', etichetta: 'Dolore masticatorio / Cefalea muscolo-tensiva', livello: 'nota' },
            { id: 'limitazione_apertura', etichetta: 'Limitazione apertura bocca / Trisma', livello: 'attenzione' },
            { id: 'problemi_anestesia', etichetta: 'Precedenti difficoltà o lipotimie durante anestesia locale', livello: 'attenzione' },
            { id: 'sinusiti', etichetta: 'Sinusiti mascellari ricorrenti', livello: 'nota' },
            { id: 'protesi_mobile', etichetta: 'Portatore di protesi mobile / scheletrato', livello: 'nota' },
            { id: 'impianti_pregressi', etichetta: 'Presenza di impianti osteointegrati pregressi', livello: 'nota' }
        ]
    }
];

export const CLASSIFICAZIONI_ASA = [
    {
        valore: '1',
        titolo: 'ASA I · Paziente Sano',
        descrizione: 'Nessuna patologia sistemica nota. Non fumatore, consumo nullo o minimo di alcolici. Trattamento odontoiatrico standard senza precauzioni particolari.',
        colore: 'success',
        simbolo: 'sentiment_very_satisfied'
    },
    {
        valore: '2',
        titolo: 'ASA II · Patologia Lieve o Moderata',
        descrizione: 'Patologia sistemica lieve ben compensata (es. ipertensione controllata, diabete tipo 2 non complicato, fumo attivo, gravidanza, asma lieve). Nessuna limitazione funzionale.',
        colore: 'info',
        simbolo: 'sentiment_satisfied'
    },
    {
        valore: '3',
        titolo: 'ASA III · Patologia Severa non Invalidante',
        descrizione: 'Patologia sistemica grave con limitazione funzionale ma non invalidante (es. diabete scompensato, pregresso infarto >6 mesi, angina stabile, TAO/NAO, BPCO moderata, terapia con bifosfonati). Richiesta attenzione nei protocolli.',
        colore: 'warning',
        simbolo: 'sentiment_neutral'
    },
    {
        valore: '4',
        titolo: 'ASA IV · Patologia Severa a Minaccia Costante',
        descrizione: 'Patologia sistemica grave a costante pericolo per la vita (es. infarto <6 mesi, angina instabile, insufficienza epatica/renale terminale, dialisi). Solo cure odontoiatriche urgenti in ambiente protetto.',
        colore: 'danger',
        simbolo: 'sentiment_very_dissatisfied'
    },
    {
        valore: '5',
        titolo: 'ASA V · Paziente Moribondo',
        descrizione: 'Paziente critico che non sopravviverà senza intervento chirurgico ospedaliero. Controindicazione assoluta a cure ambulatoriali.',
        colore: 'danger',
        simbolo: 'emergency'
    }
];
