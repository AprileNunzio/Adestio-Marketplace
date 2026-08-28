'use strict';

const antibioticiPenicilline = require('./prontuario/antibiotici_penicilline');
const antibioticiMacrolidi = require('./prontuario/antibiotici_macrolidi_lincosamidi');
const antibioticiCefalo = require('./prontuario/antibiotici_cefalosporine_chinoloni');
const antibioticiAnaerobi = require('./prontuario/antibiotici_anaerobi_tetracicline');
const fansIbuprofene = require('./prontuario/fans_ibuprofene_ketoprofene');
const fansParacetamolo = require('./prontuario/fans_paracetamolo_oppioidi');
const fansAltri = require('./prontuario/fans_altri_cox2');
const cortisonici = require('./prontuario/cortisonici_antiedema');
const antisettici = require('./prontuario/antisettici_collutori_gel');
const antimicotici = require('./prontuario/antimicotici_antivirali');
const miorilassanti = require('./prontuario/miorilassanti_atm_sedativi');
const gastroprotettori = require('./prontuario/gastroprotettori_emostatici_antistaminici');

const FARMACI_PREDEFINITI = [].concat(
    antibioticiPenicilline,
    antibioticiMacrolidi,
    antibioticiCefalo,
    antibioticiAnaerobi,
    fansIbuprofene,
    fansParacetamolo,
    fansAltri,
    cortisonici,
    antisettici,
    antimicotici,
    miorilassanti,
    gastroprotettori
);

const CATEGORIE_PRONTUARIO = [
    { id: 'tutti', etichetta: 'Tutti i farmaci', simbolo: 'medication' },
    { id: 'antibiotici', etichetta: 'Antibiotici', simbolo: 'vaccines' },
    { id: 'fans_analgesici', etichetta: 'FANS & Analgesici', simbolo: 'healing' },
    { id: 'cortisonici', etichetta: 'Corticosteroidi (Anti-gonfiore)', simbolo: 'local_pharmacy' },
    { id: 'collutori_antisettici', etichetta: 'Collutori & Gel Antisettici', simbolo: 'sanitizer' },
    { id: 'miorilassanti', etichetta: 'Miorilassanti & ATM', simbolo: 'sports_gymnastics' },
    { id: 'antimicotici_antivirali', etichetta: 'Antimicotici & Antivirali', simbolo: 'coronavirus' },
    { id: 'gastroprotettori', etichetta: 'Gastroprotettori', simbolo: 'gastroenterology' },
    { id: 'emostatici_altri', etichetta: 'Emostatici & Altri', simbolo: 'bloodtype' }
];

function elencoPredefiniti() {
    return FARMACI_PREDEFINITI;
}

function trovaPerNome(nome) {
    if (!nome) return null;
    const cercato = nome.toLowerCase().trim();
    return FARMACI_PREDEFINITI.find(f => f.farmaco.toLowerCase() === cercato || f.principio_attivo.toLowerCase().includes(cercato)) || null;
}

module.exports = {
    FARMACI_PREDEFINITI,
    CATEGORIE_PRONTUARIO,
    elencoPredefiniti,
    trovaPerNome
};
