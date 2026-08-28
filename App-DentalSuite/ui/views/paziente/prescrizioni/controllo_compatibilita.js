export function valutaCompatibilitaFarmaco({ farmaco = '', principioAttivo = '', anamnesi = {}, paziente = {} }) {
    const allerte = [];
    const nome = String(farmaco || '').toLowerCase();
    const principio = String(principioAttivo || '').toLowerCase();
    const scheda = (anamnesi && anamnesi.scheda) || {};

    const allergieFarmaci = String(scheda.allergie_farmaci || '').toLowerCase();
    const allergieStr = typeof scheda.allergie_strutturate === 'string' ? JSON.parse(scheda.allergie_strutturate || '{}') : (scheda.allergie_strutturate || {});
    const intolleranzeStr = typeof scheda.intolleranze_strutturate === 'string' ? JSON.parse(scheda.intolleranze_strutturate || '{}') : (scheda.intolleranze_strutturate || {});
    const patologieStr = typeof scheda.patologie_strutturate === 'string' ? JSON.parse(scheda.patologie_strutturate || '{}') : (scheda.patologie_strutturate || {});
    const stileVitaStr = typeof scheda.stile_vita_strutturato === 'string' ? JSON.parse(scheda.stile_vita_strutturato || '{}') : (scheda.stile_vita_strutturato || {});

    const isPenicillina = nome.includes('augmentin') || nome.includes('clavulin') || nome.includes('zimox') || nome.includes('velamox') || principio.includes('amoxicillina') || principio.includes('ampicillina') || principio.includes('penicillina');
    const isFans = nome.includes('brufen') || nome.includes('spidifen') || nome.includes('moment') || nome.includes('oki') || nome.includes('toradol') || nome.includes('enantyum') || nome.includes('synflex') || nome.includes('aulin') || nome.includes('voltaren') || nome.includes('arcoxia') || principio.includes('ibuprofene') || principio.includes('ketoprofene') || principio.includes('ketorolac') || principio.includes('dexketoprofene') || principio.includes('naprossene') || principio.includes('nimesulide') || principio.includes('diclofenac') || principio.includes('etoricoxib') || principio.includes('acido acetilsalicilico');
    const isParacetamolo = nome.includes('tachipirina') || nome.includes('efferalgan') || nome.includes('tachidol') || principio.includes('paracetamolo');
    const isClorexidina = nome.includes('curasept') || nome.includes('dentosan') || nome.includes('corsodyl') || principio.includes('clorexidina');

    if (isPenicillina && (allergieStr.penicilline || allergieFarmaci.includes('penicill') || allergieFarmaci.includes('amoxicill'))) {
        allerte.push({
            livello: 'critica',
            titolo: 'CONTROINDICAZIONE ASSOLUTA: Allergia a Penicilline',
            descrizione: 'Il paziente ha dichiarato allergia ad amoxicillina/beta-lattamici. Prescrivere Claritromicina (Klacid) o Clindamicina (Dalacin C).'
        });
    }

    if (isFans && (allergieStr.fans || allergieFarmaci.includes('fans') || allergieFarmaci.includes('aspirin') || allergieFarmaci.includes('oki') || allergieFarmaci.includes('ibuprofen'))) {
        allerte.push({
            livello: 'critica',
            titolo: 'CONTROINDICAZIONE ASSOLUTA: Allergia a FANS / Aspirina',
            descrizione: 'Il paziente è allergico ai farmaci antinfiammatori non steroidei. Prescrivere Paracetamolo (Tachipirina).'
        });
    }

    if (isClorexidina && allergieStr.clorexidina) {
        allerte.push({
            livello: 'critica',
            titolo: 'Allergia alla Clorexidina',
            descrizione: 'Non prescrivere collutori o gel a base di clorexidina. Utilizzare antisettici alternativi o spray ialuronici.'
        });
    }

    if (intolleranzeStr.lattosio || String(scheda.intolleranze || '').toLowerCase().includes('lattosio')) {
        allerte.push({
            livello: 'attenzione',
            titolo: 'Intolleranza al Lattosio',
            descrizione: 'Verificare gli eccipienti della formulazione (preferire bustine o gocce prive di lattosio).'
        });
    }

    if (intolleranzeStr.glutine || String(scheda.intolleranze || '').toLowerCase().includes('glutine')) {
        allerte.push({
            livello: 'attenzione',
            titolo: 'Celiachia / Intolleranza al Glutine',
            descrizione: 'Accertarsi che il farmaco sia certificato privo di glutine.'
        });
    }

    if (intolleranzeStr.favismo && (isFans || principio.includes('acido acetilsalicilico') || principio.includes('chinoloni'))) {
        allerte.push({
            livello: 'critica',
            titolo: 'Favismo (Deficit G6PD)',
            descrizione: 'Evitare acido acetilsalicilico e molecole ossidanti che possono scatenare emolisi acuta.'
        });
    }

    if ((stileVitaStr.gravidanza || Number(scheda.gravidanza) === 1) && (isFans || principio.includes('doxiciclina') || principio.includes('ciprofloxacina'))) {
        allerte.push({
            livello: 'critica',
            titolo: 'Cautela in Gravidanza',
            descrizione: 'I FANS sono controindicati nel 3° trimestre. Preferire Paracetamolo e Amoxicillina semplice.'
        });
    }

    if ((Number(scheda.terapia_anticoagulanti) === 1 || patologieStr.anticoagulanti_tao || patologieStr.anticoagulanti_nao) && isFans) {
        allerte.push({
            livello: 'attenzione',
            titolo: 'Interazione con Anticoagulanti (TAO / NAO)',
            descrizione: 'L\'assunzione congiunta di FANS e anticoagulanti aumenta il rischio di emorragie gastrointestinali. Associare gastroprotettore o valutare Paracetamolo.'
        });
    }

    return allerte;
}
