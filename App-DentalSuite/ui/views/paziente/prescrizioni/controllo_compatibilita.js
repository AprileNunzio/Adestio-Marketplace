export function valutaCompatibilitaFarmaco({ farmaco = '', principioAttivo = '', anamnesi = {}, paziente = {} }) {
    const allerte = [];
    const nome = String(farmaco || '').toLowerCase();
    const principio = String(principioAttivo || '').toLowerCase();
    const scheda = (anamnesi && anamnesi.scheda) || {};

    const allergieFarmaci = String(scheda.allergie_farmaci || '').toLowerCase();
    const intolleranzeNote = String(scheda.intolleranze || '').toLowerCase();
    const allergieStr = typeof scheda.allergie_strutturate === 'string' ? JSON.parse(scheda.allergie_strutturate || '{}') : (scheda.allergie_strutturate || {});
    const intolleranzeStr = typeof scheda.intolleranze_strutturate === 'string' ? JSON.parse(scheda.intolleranze_strutturate || '{}') : (scheda.intolleranze_strutturate || {});
    const patologieStr = typeof scheda.patologie_strutturate === 'string' ? JSON.parse(scheda.patologie_strutturate || '{}') : (scheda.patologie_strutturate || {});
    const stileVitaStr = typeof scheda.stile_vita_strutturato === 'string' ? JSON.parse(scheda.stile_vita_strutturato || '{}') : (scheda.stile_vita_strutturato || {});

    const isPenicillina = nome.includes('augmentin') || nome.includes('clavulin') || nome.includes('zimox') || nome.includes('velamox') || principio.includes('amoxicillina') || principio.includes('ampicillina') || principio.includes('penicillina');
    const isFans = nome.includes('brufen') || nome.includes('spidifen') || nome.includes('moment') || nome.includes('oki') || nome.includes('toradol') || nome.includes('enantyum') || nome.includes('synflex') || nome.includes('aulin') || nome.includes('voltaren') || nome.includes('arcoxia') || nome.includes('celebrex') || nome.includes('aspirina') || principio.includes('ibuprofene') || principio.includes('ketoprofene') || principio.includes('ketorolac') || principio.includes('dexketoprofene') || principio.includes('naprossene') || principio.includes('nimesulide') || principio.includes('diclofenac') || principio.includes('etoricoxib') || principio.includes('celecoxib') || principio.includes('acido acetilsalicilico');
    const isParacetamolo = nome.includes('tachipirina') || nome.includes('efferalgan') || nome.includes('tachidol') || nome.includes('co-efferalgan') || principio.includes('paracetamolo');
    const isClorexidina = nome.includes('curasept') || nome.includes('dentosan') || nome.includes('corsodyl') || nome.includes('plak out') || principio.includes('clorexidina');
    const isCortisonico = nome.includes('bentelan') || nome.includes('deflan') || nome.includes('soldesam') || nome.includes('deltacortene') || nome.includes('decadron') || nome.includes('medrol') || nome.includes('urbason') || principio.includes('betametasone') || principio.includes('desametasone') || principio.includes('prednisone') || principio.includes('deflazacort') || principio.includes('metilprednisolone');
    const isTetraciclina = nome.includes('bassado') || nome.includes('minocin') || principio.includes('doxiciclina') || principio.includes('minociclina') || principio.includes('tetraciclina');
    const isChinolone = nome.includes('ciproxin') || nome.includes('levoxacin') || nome.includes('tavanic') || principio.includes('ciprofloxacina') || principio.includes('levofloxacina');
    const isMetronidazolo = nome.includes('flagyl') || nome.includes('deflamon') || nome.includes('rodogyl') || principio.includes('metronidazolo');

    const hasLattosioFormulazione = (nome.includes('cpr') || nome.includes('compresse') || nome.includes('capsule') || nome.includes('bentelan') || nome.includes('klacid') || nome.includes('augmentin') || nome.includes('toradol') || nome.includes('muscoril') || nome.includes('lansoprazolo') || nome.includes('pantorc') || nome.includes('pantopan')) && !nome.includes('gocce') && !nome.includes('solubile');

    if (isPenicillina && (allergieStr.penicilline || allergieFarmaci.includes('penicill') || allergieFarmaci.includes('amoxicill') || allergieFarmaci.includes('clavul'))) {
        allerte.push({
            livello: 'critica',
            titolo: 'Allergia a Penicilline / Beta-lattamici',
            descrizione: 'Controindicazione assoluta. Rischio di shock anafilattico. Prescrivere Claritromicina (Klacid) o Clindamicina (Dalacin C).'
        });
    }

    if (isFans && (allergieStr.fans || allergieStr.aspirina || allergieFarmaci.includes('fans') || allergieFarmaci.includes('aspirin') || allergieFarmaci.includes('oki') || allergieFarmaci.includes('ibuprofen') || allergieFarmaci.includes('toradol'))) {
        allerte.push({
            livello: 'critica',
            titolo: 'Allergia a FANS / Aspirina',
            descrizione: 'Controindicazione assoluta. Prescrivere Paracetamolo (Tachipirina).'
        });
    }

    if (isClorexidina && allergieStr.clorexidina) {
        allerte.push({
            livello: 'critica',
            titolo: 'Allergia alla Clorexidina',
            descrizione: 'Non somministrare collutori o gel alla clorexidina. Utilizzare antisettici alternativi o acido ialuronico.'
        });
    }

    if (intolleranzeStr.lattosio || intolleranzeNote.includes('lattosio')) {
        if (hasLattosioFormulazione) {
            allerte.push({
                livello: 'attenzione',
                titolo: 'Intolleranza al Lattosio (Eccipiente)',
                descrizione: 'Le compresse/capsule possono contenere lattosio come eccipiente. Si raccomanda formulazione in bustine o gocce orali prive di lattosio.'
            });
        }
    }

    if (intolleranzeStr.glutine || intolleranzeNote.includes('glutine') || intolleranzeNote.includes('celiach')) {
        allerte.push({
            livello: 'attenzione',
            titolo: 'Celiachia / Intolleranza al Glutine',
            descrizione: 'Verificare che la formulazione sia registrata come priva di glutine nel prontuario AIC.'
        });
    }

    if ((intolleranzeStr.favismo || intolleranzeNote.includes('favismo') || intolleranzeNote.includes('g6pd')) && (isFans || isChinolone || nome.includes('aspirina') || principio.includes('acido acetilsalicilico'))) {
        allerte.push({
            livello: 'critica',
            titolo: 'Favismo (Deficit G6PD)',
            descrizione: 'Evitare aspirina, chinoloni e molecole ad azione ossidante per rischio emolisi acuta.'
        });
    }

    const isGravida = Boolean(stileVitaStr.gravidanza || Number(scheda.gravidanza) === 1);
    if (isGravida) {
        if (isFans || isTetraciclina || isChinolone) {
            allerte.push({
                livello: 'critica',
                titolo: 'Controindicato in Gravidanza',
                descrizione: 'I FANS e le tetracicline sono controindicati (chiusura precoce dotto di Botallo, pigmentazione dentale fetale). Preferire Paracetamolo e Amoxicillina.'
            });
        }
        if (isMetronidazolo) {
            allerte.push({
                livello: 'attenzione',
                titolo: 'Cautela in Gravidanza (Metronidazolo)',
                descrizione: 'Da evitare nel primo trimestre di gestazione.'
            });
        }
    }

    const isScoagulato = Boolean(Number(scheda.terapia_anticoagulanti) === 1 || patologieStr.anticoagulanti_tao || patologieStr.anticoagulanti_nao);
    if (isScoagulato && isFans) {
        allerte.push({
            livello: 'attenzione',
            titolo: 'Rischio Emorragico (Terapia TAO / NAO)',
            descrizione: 'I FANS competono con la coagulazione e irritano la mucosa gastrica. Valutare Paracetamolo o associare gastroprotettore (IPP).'
        });
    }

    const hasUlcera = Boolean(patologieStr.ulcera_gastrica || patologieStr.reflusso_gastroesofageo || String(scheda.patologie || '').toLowerCase().includes('ulcer'));
    if (hasUlcera && isFans) {
        allerte.push({
            livello: 'attenzione',
            titolo: 'Gastrolesività (Anamnesi Ulcera / Reflusso)',
            descrizione: 'Paziente con anamnesi gastrica. Associare sempre gastroprotettore (Pantoprazolo/Omeprazolo) o scegliere Paracetamolo.'
        });
    }

    const hasDiabete = Boolean(patologieStr.diabete_1 || patologieStr.diabete_2 || String(scheda.patologie || '').toLowerCase().includes('diabet'));
    if (hasDiabete && isCortisonico) {
        allerte.push({
            livello: 'attenzione',
            titolo: 'Iperglicemia (Paziente Diabetico)',
            descrizione: 'I corticosteroidi sistemici possono causare picchi iperglicemici. Monitorare la glicemia e preferire dosaggi a scalare rapido.'
        });
    }

    return allerte;
}
