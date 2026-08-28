'use strict';

const antinfettivi = require('./prontuario/farmaci_antinfettivi');
const flogosiAltri = require('./prontuario/farmaci_flogosi_altri');

const FARMACI_PREDEFINITI = [].concat(antinfettivi, flogosiAltri);

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
