import { el, icona } from '../../../components/dom.js';
import { pannello, vuoto, marcatore, blocchetto } from './pannello.js';

const SIMBOLI = {
    critica: 'e911_emergency',
    attenzione: 'warning',
    nota: 'info'
};

function voceClinica(voce) {
    return el('li', {
        class: 'ds-mn__voce-clinica',
        dataset: { livello: voce.livello },
        title: voce.dettagli ? `${voce.etichetta} — ${voce.dettagli}` : voce.etichetta
    }, [
        icona(SIMBOLI[voce.livello] || 'info'),
        el('span', { class: 'ds-mn__voce-testo' }, [
            el('span', {}, voce.etichetta),
            voce.dettagli ? el('em', { class: 'ds-mn__voce-dettagli' }, voce.dettagli) : null
        ].filter(Boolean))
    ]);
}

function elenco(voci) {
    return el('ul', { class: 'ds-mn__voci-cliniche' }, voci.map(voceClinica));
}

function sezione(titolo, voci) {
    if (!voci || voci.length === 0) return null;
    return el('div', { class: 'ds-mn__sezione-clinica' }, [
        el('span', { class: 'ds-mn__sezione-eti' }, titolo),
        elenco(voci)
    ]);
}

function gruppiPatologie(gruppi) {
    if (!gruppi || gruppi.length === 0) return null;
    return el('div', { class: 'ds-mn__sezione-clinica' }, [
        el('span', { class: 'ds-mn__sezione-eti' }, 'Patologie sistemiche'),
        ...gruppi.map(gruppo => el('div', { class: 'ds-mn__gruppo-clinico' }, [
            el('span', { class: 'ds-mn__gruppo-eti' }, gruppo.titolo),
            elenco(gruppo.voci)
        ]))
    ]);
}

export function matriceRischio(rischio) {
    if (!rischio) return null;
    const asa = rischio.asa_descrizione;
    return el('div', { class: 'ds-mn__rischio' }, [
        el('div', {
            class: 'ds-mn__asa',
            dataset: { grado: String(rischio.asa) },
            title: asa ? asa.descrizione : ''
        }, [
            el('span', { class: 'ds-mn__asa-eti' }, 'ASA'),
            el('strong', { class: 'ds-mn__asa-val' }, String(rischio.asa))
        ]),
        el('div', { class: 'ds-mn__rischio-voci' }, [
            marcatore(`Emorragico ${rischio.emorragico.etichetta}`, rischio.emorragico.livello, 'Rischio emorragico'),
            marcatore(`MRONJ ${rischio.mronj.etichetta}`, rischio.mronj.livello, 'Rischio osteonecrosi'),
            marcatore(rischio.vasocostrittore.etichetta, rischio.vasocostrittore.livello, 'Tolleranza al vasocostrittore'),
            rischio.profilassi_antibiotica
                ? marcatore('Profilassi antibiotica', 'critica', 'Profilassi antibiotica richiesta')
                : null
        ].filter(Boolean))
    ]);
}

function testiLiberi(anamnesi) {
    return [
        blocchetto('Farmaci abituali', anamnesi.farmaci_abituali),
        blocchetto('Terapie in corso', anamnesi.terapie_in_corso),
        blocchetto('Allergie dichiarate', anamnesi.allergie_farmaci),
        blocchetto('Allergie a materiali', anamnesi.allergie_materiali),
        blocchetto('Intolleranze dichiarate', anamnesi.intolleranze_testo),
        blocchetto('Altre patologie', anamnesi.altre_patologie),
        blocchetto('Note mediche', anamnesi.note)
    ].filter(Boolean);
}

export function pannelloAnamnesi(dossier, { onApriTutto }) {
    const anamnesi = dossier.anamnesi;

    if (!anamnesi.compilata) {
        return pannello({
            titolo: 'Quadro anamnestico',
            simbolo: 'clinical_notes',
            chiave: 'anamnesi'
        }, vuoto('assignment_late', 'Anamnesi non compilata: raccogliere prima di procedere'));
    }

    const totale = anamnesi.conteggi.patologie
        + anamnesi.conteggi.allergie
        + anamnesi.conteggi.intolleranze
        + anamnesi.conteggi.stile_vita;

    const contenuto = [
        matriceRischio(anamnesi.rischio),
        sezione('Allergie accertate', anamnesi.allergie),
        sezione('Intolleranze', anamnesi.intolleranze),
        gruppiPatologie(anamnesi.patologie),
        sezione('Stile di vita e ATM', anamnesi.stile_vita),
        ...testiLiberi(anamnesi)
    ].filter(Boolean);

    return pannello({
        titolo: 'Quadro anamnestico',
        simbolo: 'clinical_notes',
        chiave: 'anamnesi',
        conteggio: totale,
        azioni: [el('button', {
            class: 'ds-mn__mini',
            type: 'button',
            title: 'Apri il quadro anamnestico completo',
            onClick: onApriTutto
        }, icona('open_in_full'))]
    }, contenuto.length > 0 ? contenuto : vuoto('verified_user', 'Nessun rilievo anamnestico'));
}

export function contenutoAnamnesiEstesa(dossier) {
    const anamnesi = dossier.anamnesi;
    return el('div', { class: 'ds-mn__estesa' }, [
        matriceRischio(anamnesi.rischio),
        anamnesi.rischio && anamnesi.rischio.asa_descrizione
            ? blocchetto(anamnesi.rischio.asa_descrizione.titolo, anamnesi.rischio.asa_descrizione.descrizione)
            : null,
        sezione('Allergie accertate', anamnesi.allergie),
        sezione('Intolleranze', anamnesi.intolleranze),
        gruppiPatologie(anamnesi.patologie),
        sezione('Stile di vita e ATM', anamnesi.stile_vita),
        ...testiLiberi(anamnesi),
        blocchetto('Compilata il', anamnesi.data_compilazione),
        blocchetto('Ultima revisione', anamnesi.data_revisione)
    ].filter(Boolean));
}
