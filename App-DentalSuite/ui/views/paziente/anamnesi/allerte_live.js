import { el, icona } from '../../../components/dom.js';

export function generaAllerteDinamiche({
    patologie = {},
    allergie = {},
    intolleranze = {},
    stileVita = {},
    rischio = {},
    paziente = {},
    schedaLegacy = {}
}) {
    const critiche = [];
    const attenzioni = [];

    const aggiungiCritica = (titolo, motivo) => {
        if (!critiche.some(c => c.titolo === titolo)) critiche.push({ titolo, motivo });
    };

    const aggiungiAttenzione = (titolo, motivo) => {
        if (!attenzioni.some(a => a.titolo === titolo)) attenzioni.push({ titolo, motivo });
    };

    if (allergie.lattice) {
        aggiungiCritica('ALLERGIA AL LATTICE (Latex Free)', 'Divieto assoluto di guanti, dighe e cannule in lattice. Rischio shock anafilattico.');
    }
    if (allergie.anestetici_adrenalina || rischio.tolleranza_vasocostrittore === 'controindicato') {
        aggiungiCritica('VASOCOSTRITTORI CONTROINDICATI', 'Utilizzare esclusivamente Mepivacaina pura al 3% senza Adrenalina.');
    }
    if (allergie.anestetici_locali) {
        aggiungiCritica('ALLERGIA AD ANESTETICI LOCALI', 'Verificare test allergologico prima di somministrare qualsiasi anestetico locale.');
    }
    if (allergie.penicilline) {
        aggiungiCritica('ALLERGIA A PENICILLINE / BETA-LATTAMICI', 'Non prescrivere Amoxicillina/Augmentin. Usare Macrolidi o Clindamicina.');
    }
    if (allergie.fans) {
        aggiungiCritica('ALLERGIA A FANS / ASPIRINA', 'Evitare Ibuprofene/Ketoprofene/Aulin. Prescrivere Paracetamolo come analgesico.');
    }

    if (intolleranze.lattosio) {
        aggiungiCritica('INTOLLERANZA AL LATTOSIO', 'Verificare eccipienti nelle compresse prescritte (spesso contengono lattosio).');
    }
    if (intolleranze.glutine) {
        aggiungiCritica('CELIACHIA / INTOLLERANZA GLUTINE', 'Usare solo paste da profilassi e prodotti certificati Gluten-Free.');
    }
    if (intolleranze.favismo) {
        aggiungiCritica('FAVISMO (Deficit G6PD)', 'Divieto assoluto di farmaci ossidanti, sulfamidici, acido acetilsalicilico.');
    }

    if (patologie.bifosfonati_ev || patologie.denosumab || patologie.bifosfonati_orali || Number(schedaLegacy.osteoporosi_bifosfonati) === 1 || rischio.rischio_mronj === 'alto' || rischio.rischio_mronj === 'medio') {
        aggiungiCritica('RISCHIO OSTEONECROSI MASCELLARE (MRONJ)', 'Terapia antiriassorbitiva ossea in atto/pregressa. Massimo rigore atraumatico e copertura antibiotica.');
    }

    if (patologie.anticoagulanti_tao || patologie.anticoagulanti_nao || patologie.coagulopatie || Number(schedaLegacy.terapia_anticoagulanti) === 1 || rischio.rischio_emorragico === 'alto') {
        aggiungiCritica('RISCHIO EMORRAGICO ELEVATO (Anticoagulanti / Coagulopatia)', 'Valutare INR / sospensione NAO concordata con medico curante. Emostasi locale rafforzata.');
    } else if (patologie.antiaggreganti || rischio.rischio_emorragico === 'medio') {
        aggiungiAttenzione('Terapia Antiaggregante', 'Prevedere emostatici locali (spugna di fibrina, suture) post-avulsione.');
    }

    if (patologie.endocardite_batterica || patologie.protesi_valvolari || rischio.profilassi_antibiotica) {
        aggiungiCritica('PROFILASSI ANTIBIOTICA ENDOCARDITE OBBLIGATORIA', 'Somministrare 2g di Amoxicillina (o 600mg Clindamicina) 30-60 min prima di procedure cruente.');
    }

    if (Number(paziente.pacemaker) === 1 || patologie.pacemaker_icd) {
        aggiungiCritica('PORTATORE DI PACEMAKER / ICD', 'Non utilizzare bisturi elettrico o elettrobisturi non bipolare. Verificare compatibilità scaler.');
    }

    if (stileVita.gravidanza || Number(schedaLegacy.gravidanza) === 1) {
        aggiungiCritica('STATO DI GRAVIDANZA IN CORSO', 'Evitare RX non urgenti o utilizzare schermatura piombata. Limitare anestetici e farmaci teratogeni.');
    }

    if (patologie.asma) {
        aggiungiAttenzione('Paziente Asmatico', 'Accertarsi che il paziente abbia il broncodilatatore a portata di mano alla poltrona.');
    }
    if (patologie.diabete_tipo1 || patologie.diabete_scompensato) {
        aggiungiAttenzione('Diabete Scompensato / Tipo 1', 'Rischio ipoglicemia intra-operatoria e ritardata guarigione tessutale.');
    }
    if (patologie.ipertensione || patologie.ipertensione_grave) {
        aggiungiAttenzione('Ipertensione Arteriosa', 'Monitorare pressione arteriosa prima di interventi complessi ed evitare stress eccessivo.');
    }
    if (patologie.epatite_b || patologie.epatite_c || patologie.hiv_aids || Number(schedaLegacy.epatiti_hiv) === 1) {
        aggiungiCritica('RISCHIO BIOLOGICO INFETTIVO DICHIARATO', 'Applicare protocolli di massima biosicurezza e protezione per gli operatori.');
    }
    if (patologie.terapia_cortisonica) {
        aggiungiAttenzione('Terapia Cortisonica Cronica', 'Rischio insufficienza surrenalica acuta da stress chirurgico. Possibile necessità di supplementazione.');
    }
    if (patologie.epilessia) {
        aggiungiAttenzione('Epilessia / Convulsioni', 'Evitare luci stroboscopiche / lampade fotopolimerizzanti dirette negli occhi.');
    }

    return { critiche, attenzioni };
}

export function creaAllerteLiveBanner(statoCompleto) {
    const contenitore = el('div', { class: 'ds-anamnesi-live-alerts' });

    const aggiorna = (nuovoStato) => {
        const { critiche, attenzioni } = generaAllerteDinamiche(nuovoStato);

        if (critiche.length === 0 && attenzioni.length === 0) {
            contenitore.innerHTML = '';
            contenitore.appendChild(el('div', { class: 'ds-alert ds-alert--success' }, [
                icona('verified_user'),
                el('div', {}, [
                    el('strong', {}, 'Nessuna allerta clinica critica rilevata'),
                    el('p', { class: 'ds-muted', style: 'margin: 2px 0 0 0;' }, 'Verificare comunque l\'anamnesi aggiornata con il paziente prima di procedere.')
                ])
            ]));
            return;
        }

        const blocchi = [];

        if (critiche.length > 0) {
            blocchi.push(el('div', { class: 'ds-alert ds-alert--danger' }, [
                icona('e911_emergency'),
                el('div', { class: 'ds-alert__content' }, [
                    el('strong', { class: 'ds-alert__title' }, `CRITICITÀ CLINICHE RILEVATE (${critiche.length})`),
                    el('ul', { class: 'ds-alert__list' }, critiche.map(c => el('li', {}, [
                        el('strong', {}, c.titolo),
                        ': ',
                        el('span', {}, c.motivo)
                    ])))
                ])
            ]));
        }

        if (attenzioni.length > 0) {
            blocchi.push(el('div', { class: 'ds-alert ds-alert--warning' }, [
                icona('warning'),
                el('div', { class: 'ds-alert__content' }, [
                    el('strong', { class: 'ds-alert__title' }, `Segnalazioni e Precauzioni Operative (${attenzioni.length})`),
                    el('ul', { class: 'ds-alert__list' }, attenzioni.map(a => el('li', {}, [
                        el('strong', {}, a.titolo),
                        ': ',
                        el('span', {}, a.motivo)
                    ])))
                ])
            ]));
        }

        contenitore.innerHTML = '';
        blocchi.forEach(b => contenitore.appendChild(b));
    };

    aggiorna(statoCompleto);

    return {
        nodo: contenitore,
        aggiorna
    };
}
