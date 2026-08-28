import { FARMACI_ANTIBIOTICI } from './farmaci_antibiotici.js';
import { FARMACI_ANTISETTICI } from './farmaci_antisettici.js';
import { FARMACI_FLOGOSI } from './farmaci_flogosi.js';

export const CATEGORIE_PRONTUARIO = [
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

export const FARMACI_PREDEFINITI = [].concat(
    FARMACI_ANTIBIOTICI,
    FARMACI_ANTISETTICI,
    FARMACI_FLOGOSI
);
