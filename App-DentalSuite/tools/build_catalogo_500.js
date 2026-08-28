'use strict';

const fs = require('fs');
const path = require('path');

const farmaci = [];

function add(id, farmaco, principio_attivo, categoria, dosaggio, posologia, durata_giorni, note) {
    farmaci.push({
        id,
        farmaco,
        principio_attivo,
        categoria,
        dosaggio,
        posologia,
        durata_giorni,
        note
    });
}

const marchiGenerici = ['EG', 'Teva', 'Sandoz', 'DOC Generici', 'Ratiopharm', 'Mylan', 'Aurobindo', 'Zentiva', 'Almus', 'Pensa', 'Alter', 'Krka', 'Sun Pharma'];

function addEquivalenti(baseId, molecola, categoria, dosaggi, posologia, durata, noteBase) {
    marchiGenerici.forEach((marchio, idx) => {
        dosaggi.forEach((d, dIdx) => {
            const id = `${baseId}_${marchio.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${dIdx + 1}`;
            const farmaco = `${molecola} ${marchio}`;
            const note = `${molecola} equivalente generico AIC ${marchio}. ${noteBase}`;
            add(id, farmaco, molecola, categoria, d, posologia, durata, note);
        });
    });
}

add('aug_875_cpr', 'Augmentin Compresse', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '875 mg + 125 mg cpr rivestite', '1 compressa ogni 12 ore ai pasti', 6, 'Prima linea per infezioni odontogene, ascessi periapicali e profilassi chirurgica. Contiene lattosio.');
add('aug_875_bust', 'Augmentin Bustine', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '875 mg + 125 mg polvere per sospensione', '1 bustina ogni 12 ore sciolta in acqua ai pasti', 6, 'Ideale in caso di disfagia post-chirurgica.');
add('aug_ped_400', 'Augmentin Bambini Sospensione', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '400 mg + 57 mg / 5 ml sospensione orale', '45 mg/kg/die frazionati in 2 somministrazioni giornaliere ai pasti', 6, 'Ascessi dentali pediatrici in dentizione decidua e mista.');
add('aug_ped_gocce', 'Augmentin Gocce Pediatriche', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '50 mg + 12.5 mg / ml gocce orali', '3 gocce per kg di peso corporeo ogni 8 ore', 6, 'Per la prima infanzia.');
add('clav_875_cpr', 'Clavulin Compresse', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '875 mg + 125 mg cpr', '1 compressa ogni 12 ore', 6, 'Terapia antibatterica per ascessi odontogeni e parodontiti acute.');
add('clav_875_bust', 'Clavulin Bustine', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '875 mg + 125 mg bustine per sospensione', '1 bustina ogni 12 ore ai pasti', 6, 'Polvere solubile per pazienti con difficoltà di deglutizione.');
add('clav_ped_sosp', 'Clavulin Bambini Sospensione', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '400 mg + 57 mg / 5 ml sospensione', 'Dosaggio calibrato sul peso ogni 12 ore', 6, 'Formulazione pediatrica aromatizzata.');
add('abba_875_cpr', 'Abba Compresse', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '875 mg + 125 mg cpr', '1 compressa ogni 12 ore', 6, 'Associazione protetta per infezioni orali.');
add('abba_875_bust', 'Abba Bustine', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '875 mg + 125 mg bustine', '1 bustina ogni 12 ore', 6, 'Polvere per sospensione orale.');
add('anival_875_cpr', 'Anival Compresse', 'Amoxicillina + Acido Clavulanico', 'antibiotici', '875 mg + 125 mg cpr', '1 compressa ogni 12 ore', 6, 'Antibiotico per tessuti molli ed ossei orali.');

addEquivalenti('amox_clav', 'Amoxicillina + Acido Clavulanico', 'antibiotici', ['875 mg + 125 mg cpr', '875 mg + 125 mg bustine'], '1 dose ogni 12 ore ai pasti', 6, 'Contiene penicillina protetta.');

add('zimox_1g_cpr', 'Zimox Compresse', 'Amoxicillina', 'antibiotici', '1 g compresse', '1 compressa ogni 8-12 ore (2g 1 ora prima per profilassi endocardite)', 6, 'Profilassi endocardite batterica AHA/ESC e infezioni semplici.');
add('zimox_500_cps', 'Zimox Capsule', 'Amoxicillina', 'antibiotici', '500 mg capsule rigide', '1 capsula ogni 8 ore', 6, 'Infezioni odontoiatriche moderate.');
add('zimox_ped_sosp', 'Zimox Sospensione Pediatrica', 'Amoxicillina', 'antibiotici', '250 mg / 5 ml polvere per sospensione', '50 mg/kg/die in 3 somministrazioni', 6, 'Per bambini.');
add('zimox_ped_gocce', 'Zimox Gocce Pediatriche', 'Amoxicillina', 'antibiotici', '100 mg / ml gocce orali flacone 20 ml', 'Gocce proporzionate al peso ogni 8 ore', 6, 'Formulazione gocce pediatriche.');
add('velamox_1g_cpr', 'Velamox Compresse', 'Amoxicillina', 'antibiotici', '1 g compresse', '1 compressa ogni 12 ore', 6, 'Antibiotico per infezioni gengivali e periapicali.');
add('velamox_500_cps', 'Velamox Capsule', 'Amoxicillina', 'antibiotici', '500 mg capsule', '1 capsula ogni 8 ore', 6, 'Dosaggio standard amoxicillina.');
add('velamox_ped_sosp', 'Velamox Bambini Sospensione', 'Amoxicillina', 'antibiotici', '250 mg / 5 ml sospensione', '1 misurino secondo peso ogni 8 ore', 6, 'Sospensione pediatrica orale.');
add('moxilen_1g_cpr', 'Moxilen Compresse', 'Amoxicillina', 'antibiotici', '1 g compresse', '1 compressa ogni 12 ore', 6, 'Amoxicillina pura per stomatologia.');
add('amplital_1g_cpr', 'Amplital Compresse', 'Ampicillina', 'antibiotici', '1 g compresse', '1 compressa ogni 6-8 ore a stomaco vuoto', 6, 'Aminopenicillina a somministrazione frazionata.');
add('amplital_500_cps', 'Amplital Capsule', 'Ampicillina', 'antibiotici', '500 mg capsule', '1 capsula ogni 6 ore', 6, 'Ampicillina in capsule orali.');
add('amplital_1g_fiale', 'Amplital Fiale I.M.', 'Ampicillina sodica', 'antibiotici', '1 g flacone iniettabile I.M./E.V.', '1 fiala I.M. ogni 8-12 ore', 5, 'Somministrazione parenterale in quadri infettivi complessi.');

addEquivalenti('amox_pura', 'Amoxicillina', 'antibiotici', ['1 g compresse', '1 g compresse solubili', '500 mg capsule'], '1 dose ogni 12 ore', 6, 'Amoxicillina pura non associata.');
addEquivalenti('ampi_pura', 'Ampicillina', 'antibiotici', ['1 g compresse', '500 mg capsule'], '1 dose ogni 8 ore', 6, 'Ampicillina pura.');

add('klacid_500_cpr', 'Klacid Compresse', 'Claritromicina', 'antibiotici', '500 mg cpr rivestite', '1 compressa ogni 12 ore durante i pasti', 6, 'Prima scelta per soggetti allergici alle penicilline/beta-lattamici. Contiene lattosio.');
add('klacid_250_cpr', 'Klacid 250mg', 'Claritromicina', 'antibiotici', '250 mg compresse', '1 compressa ogni 12 ore', 6, 'Dosaggio per infezioni lievi/moderate in pazienti allergici.');
add('klacid_rm_500', 'Klacid RM Rilascio Modificato', 'Claritromicina', 'antibiotici', '500 mg cpr a rilascio modificato', '1 compressa una volta al giorno a stomaco pieno', 6, 'Somministrazione singola giornaliera.');
add('klacid_ped_250', 'Klacid Bambini Sospensione', 'Claritromicina', 'antibiotici', '250 mg / 5 ml granulato per sospensione', '7.5 mg/kg ogni 12 ore nei pasti', 6, 'Alternativa pediatrica in bambini allergici ad amoxicillina.');
add('klacid_ped_125', 'Klacid Bambini 125mg', 'Claritromicina', 'antibiotici', '125 mg / 5 ml sospensione orale', 'Misurino secondo peso pediatrico ogni 12 ore', 6, 'Per la prima infanzia.');
add('macladin_500_cpr', 'Macladin Compresse', 'Claritromicina', 'antibiotici', '500 mg cpr', '1 compressa ogni 12 ore', 6, 'Terapia di elezione per infezioni orofacciali in allergici a penicillina.');
add('macladin_rm_500', 'Macladin RM', 'Claritromicina', 'antibiotici', '500 mg cpr a rilascio prolungato', '1 compressa al giorno a pranzo', 6, 'Monosomministrazione giornaliera.');
add('veclam_500_cpr', 'Veclam Compresse', 'Claritromicina', 'antibiotici', '500 mg cpr', '1 compressa ogni 12 ore', 6, 'Trattamento ascessi odontogeni in soggetti allergici ai beta-lattamici.');
add('veclam_ped_sosp', 'Veclam Bambini', 'Claritromicina', 'antibiotici', '250 mg / 5 ml sospensione', 'Posologia pediatrica ogni 12 ore', 6, 'Formulazione pediatrica.');
add('kraspen_500_cpr', 'Kraspen Compresse', 'Claritromicina', 'antibiotici', '500 mg cpr', '1 compressa ogni 12 ore', 6, 'Claritromicina per profilassi e cura parodontale.');

addEquivalenti('clari', 'Claritromicina', 'antibiotici', ['500 mg compresse', '250 mg compresse', '500 mg RM rilascio modificato'], '1 compressa ogni 12 ore', 6, 'Macrolide batteriostatico per allergici a penicillina.');

add('zitromax_500_cpr', 'Zitromax Compresse', 'Azitromicina', 'antibiotici', '500 mg cpr', '1 compressa al giorno per 3 giorni consecutivi lontano dai pasti', 3, 'Ciclo breve ad accumulo tissutale e parodontale. Ottima compliance.');
add('zitromax_ped_sosp', 'Zitromax Bambini Sospensione', 'Azitromicina', 'antibiotici', '200 mg / 5 ml polvere per sospensione', '10 mg/kg una volta al giorno per 3 giorni', 3, 'Formulazione pediatrica a ciclo breve.');
add('azitrolab_500_cpr', 'Azitrolab Compresse', 'Azitromicina', 'antibiotici', '500 mg cpr', '1 compressa al giorno per 3 giorni', 3, 'Azitromicina per infezioni parodontali.');
add('ribotrex_500_cpr', 'Ribotrex Compresse', 'Azitromicina', 'antibiotici', '500 mg cpr', '1 compressa al giorno per 3 giorni', 3, 'Azitromicina ad alta biodisponibilità.');
add('trozocina_500_cpr', 'Trozocina Compresse', 'Azitromicina', 'antibiotici', '500 mg cpr', '1 compressa al giorno per 3 giorni', 3, 'Azitromicina per tessuti parodontali.');

addEquivalenti('azitro', 'Azitromicina', 'antibiotici', ['500 mg compresse', '250 mg compresse'], '1 compressa al giorno per 3 giorni', 3, 'Azitromicina equivalente.');

add('dalacin_300_cps', 'Dalacin C 300mg', 'Clindamicina', 'antibiotici', '300 mg capsule rigide', '1 capsula ogni 6-8 ore con abbondante acqua', 6, 'Eccellente trofismo per il tessuto osseo mandibolare e mascellare. Indicato per osteomieliti, peri-implantiti.');
add('dalacin_150_cps', 'Dalacin C 150mg', 'Clindamicina', 'antibiotici', '150 mg capsule', '1 capsula ogni 6 ore', 6, 'Dosaggio frazionato per osteiti moderate.');
add('dalacin_600_fiale', 'Dalacin C Fiale I.M./E.V.', 'Clindamicina fosfato', 'antibiotici', '600 mg / 4 ml fiale iniettabili', '1 fiala I.M. ogni 12 ore', 5, 'Terapia iniettiva per infezioni ossee orofacciali severe.');
add('clin_eg_300', 'Clindamicina EG 300mg', 'Clindamicina', 'antibiotici', '300 mg capsule', '1 capsula ogni 8 ore', 6, 'Clindamicina generica EG.');
add('clin_teva_300', 'Clindamicina Teva 300mg', 'Clindamicina', 'antibiotici', '300 mg capsule', '1 capsula ogni 8 ore', 6, 'Clindamicina generica Teva.');
add('clin_sandoz_300', 'Clindamicina Sandoz 300mg', 'Clindamicina', 'antibiotici', '300 mg capsule', '1 capsula ogni 8 ore', 6, 'Clindamicina generica Sandoz.');
add('rovamycine_3m_cpr', 'Rovamycine Compresse', 'Spiramicina', 'antibiotici', '3 M.U.I. cpr rivestite', '1 compressa ogni 8-12 ore', 6, 'Macrolide ad altissima concentrazione nella ghiandole salivari e fluido crevicolare.');
add('rovamycine_15m_cpr', 'Rovamycine 1.5 MUI', 'Spiramicina', 'antibiotici', '1.5 M.U.I. compresse', '1 compressa ogni 8 ore', 6, 'Spiramicina a dosaggio ridotto.');
add('rodogyl_cpr', 'Rodogyl Compresse', 'Spiramicina + Metronidazolo', 'antibiotici', '750.000 UI + 125 mg cpr', '2 compresse ogni 12 ore ai pasti', 6, 'Associazione sinergica per ascessi parodontali misti e peri-implantiti complesse.');
add('eritrocina_600_cpr', 'Eritrocina Compresse', 'Eritromicina', 'antibiotici', '600 mg compresse', '1 compressa ogni 12 ore prima dei pasti', 6, 'Macrolide storico per pazienti intolleranti ai beta-lattamici.');
add('lincocin_500_cps', 'Lincocin Capsule', 'Lincomicina', 'antibiotici', '500 mg capsule', '1 capsula ogni 8 ore a stomaco vuoto', 6, 'Lincosamide per infezioni odontogene profonde.');
add('lincocin_600_fiale', 'Lincocin Fiale I.M.', 'Lincomicina', 'antibiotici', '600 mg / 2 ml fiale iniettabili I.M.', '1 fiala I.M. ogni 12-24 ore', 5, 'Terapia parenterale iniettabile.');

add('cefixoral_400_cpr', 'Cefixoral Compresse', 'Cefixima', 'antibiotici', '400 mg cpr rivestite', '1 compressa una volta al giorno', 5, 'Cefalosporina orale di terza generazione.');
add('cefixoral_400_disp', 'Cefixoral Compresse Dispersibili', 'Cefixima', 'antibiotici', '400 mg cpr dispersibili', '1 compressa al giorno sciolta in acqua', 5, 'Formulazione idrosolubile ad assorbimento immediato.');
add('cefixoral_ped_sosp', 'Cefixoral Sospensione Pediatrica', 'Cefixima', 'antibiotici', '100 mg / 5 ml polvere per sospensione orale', '8 mg/kg una volta al giorno', 5, 'Per bambini.');
add('suprax_400_cpr', 'Suprax Compresse', 'Cefixima', 'antibiotici', '400 mg cpr rivestite', '1 compressa al giorno', 5, 'Cefalosporina orale 3a gen.');
add('suprax_ped_sosp', 'Suprax Sospensione', 'Cefixima', 'antibiotici', '100 mg / 5 ml sospensione', 'Posologia pediatrica monodose giornaliera', 5, 'Formulazione pediatrica Suprax.');

addEquivalenti('cefix', 'Cefixima', 'antibiotici', ['400 mg compresse', '400 mg compresse dispersibili'], '1 compressa al giorno', 5, 'Cefalosporina orale 3a gen.');

add('rocefin_1g_im', 'Rocefin Fiale I.M.', 'Ceftriaxone sodico + Lidocaina 1%', 'antibiotici', '1 g polvere e solvente per soluzione iniettabile I.M.', '1 fiala I.M. al giorno', 5, 'Terapia antibiotica parenterale d\'elezione per flemmoni, cellulite del pavimento orale e sinusiti mascellari severe.');
add('rocefin_500_im', 'Rocefin 500mg I.M.', 'Ceftriaxone + Lidocaina 1%', 'antibiotici', '500 mg polvere e solvente I.M.', '1 fiala I.M. al giorno', 5, 'Dosaggio pediatrico/ridotto.');
add('fidato_1g_im', 'Fidato Fiale I.M.', 'Cefonicid sodico', 'antibiotici', '1 g polvere e solvente per iniezione I.M. con lidocaina', '1 fiala I.M. ogni 24 ore', 5, 'Cefalosporina di seconda generazione a monosomministrazione giornaliera.');
add('panacef_500_cps', 'Panacef Capsule', 'Cefacloro', 'antibiotici', '500 mg capsule', '1 capsula ogni 8 ore', 6, 'Cefalosporina orale per infezioni odontostomatologiche.');
add('panacef_ped_sosp', 'Panacef Sospensione Pediatrica', 'Cefacloro', 'antibiotici', '250 mg / 5 ml sospensione', '20 mg/kg/die frazionati in 3 dosi', 6, 'Formulazione pediatrica Cefacloro.');
add('coraver_500', 'Coraver', 'Cefuroxima axetile', 'antibiotici', '500 mg compresse', '1 compressa ogni 12 ore dopo i pasti', 6, 'Cefalosporina orale 2a gen con spettro esteso.');

addEquivalenti('ceftriax', 'Ceftriaxone', 'antibiotici', ['1 g fiale iniettabili I.M.', '500 mg fiale I.M.'], '1 fiala I.M. al giorno', 5, 'Ceftriaxone equivalente per iniezione.');
addEquivalenti('cefonicid', 'Cefonicid', 'antibiotici', ['1 g fiale I.M.'], '1 fiala I.M. al giorno', 5, 'Cefonicid generico I.M.');

add('ciproxin_500_cpr', 'Ciproxin Compresse', 'Ciprofloxacina', 'antibiotici', '500 mg cpr rivestite', '1 compressa ogni 12 ore lontano dai pasti', 6, 'Fluorochinolone per infezioni complesse mascellari e peri-implantari da Gram-negativi.');
add('ciproxin_250_cpr', 'Ciproxin 250mg', 'Ciprofloxacina', 'antibiotici', '250 mg cpr', '1 compressa ogni 12 ore', 6, 'Dosaggio per infezioni moderate.');
add('levoxacin_500_cpr', 'Levoxacin Compresse', 'Levofloxacina', 'antibiotici', '500 mg cpr rivestite', '1 compressa una volta al giorno', 5, 'Chinolone respiratorio di elezione per complicanze sinusitiche da infezione dentale (sinusite odontogena).');
add('tavanic_500_cpr', 'Tavanic Compresse', 'Levofloxacina', 'antibiotici', '500 mg cpr', '1 compressa al giorno', 5, 'Sinusiti mascellari acute secondarie.');
add('avalox_400_cpr', 'Avalox Compresse', 'Moxifloxacina', 'antibiotici', '400 mg cpr rivestite', '1 compressa una volta al giorno', 5, 'Fluorochinolone di 4a generazione per infezioni orofacciali complesse polimicrobiche.');

addEquivalenti('cipro', 'Ciprofloxacina', 'antibiotici', ['500 mg compresse', '250 mg compresse'], '1 compressa ogni 12 ore', 6, 'Chinolone equivalente.');
addEquivalenti('levo', 'Levofloxacina', 'antibiotici', ['500 mg compresse', '250 mg compresse'], '1 compressa al giorno', 5, 'Levofloxacina equivalente.');

add('flagyl_250_cpr', 'Flagyl Compresse', 'Metronidazolo', 'antibiotici', '250 mg cpr', '1 compressa ogni 8 ore ai pasti', 7, 'Specifico per batteri anaerobi e parodontopatie necrotizzanti (NUG/NUP). Divieto assoluto di alcolici (effetto antabuse).');
add('deflamon_500_cpr', 'Deflamon Compresse', 'Metronidazolo', 'antibiotici', '500 mg compresse', '1 compressa ogni 12 ore ai pasti', 6, 'Infezioni parodontali complesse da spirochete e anaerobi.');
add('deflamon_500_flac', 'Deflamon Fiale Infusione E.V.', 'Metronidazolo', 'antibiotici', '500 mg / 100 ml soluzione per infusione', '1 flacone E.V. ogni 8 ore', 4, 'Per chirurgia maxillo-facciale ed ascessi profondi.');
add('bassado_100_cpr', 'Bassado Compresse', 'Doxiciclina iclato', 'antibiotici', '100 mg cpr', '2 cpr il 1° giorno, poi 1 cpr al dì per 7-10 giorni a stomaco pieno con abbondante acqua', 8, 'Tetraciclina ad azione anticollagenasica per parodontiti aggressive. Non coricarsi subito dopo l\'assunzione. Vietato sotto 12 anni e in gravidanza.');
add('minocin_100_cps', 'Minocin 100mg Capsule', 'Minociclina cloridrato', 'antibiotici', '100 mg capsule', '1 capsula ogni 12 ore', 7, 'Tetraciclina semisintetica ad alta penetrazione nei tessuti orali e fluido crevicolare.');
add('minocin_50_cps', 'Minocin 50mg Capsule', 'Minociclina', 'antibiotici', '50 mg capsule', '1 capsula ogni 12 ore', 7, 'Dosaggio ridotto di mantenimento.');
add('ambramicina_250_cps', 'Ambramicina Capsule', 'Tetraciclina cloridrato', 'antibiotici', '250 mg capsule', '1 capsula ogni 6 ore lontano dai pasti e latticini', 7, 'Tetraciclina classica. Rischio discromia dello smalto dentario in fase di odontogenesi.');
add('monuril_3g_bust', 'Monuril Adulti', 'Fosfomicina trometamolo', 'antibiotici', '3 g granulato per soluzione orale', '1 bustina la sera prima di coricarsi a vescica vuota', 2, 'Fosfomicina per profilassi o quadri infettivi sistemici.');
add('rifocin_250_fiale', 'Rifocin Fiale per Uso Locale/Topico', 'Rifamicina SV sodica', 'antibiotici', '250 mg / 3 ml fiale per lavaggi locali', 'Lavaggio topico di tasche parodontali o alveoli post-estrattivi infetti', 3, 'Uso topico per irrigazione di siti chirurgici e alveoliti secche.');

addEquivalenti('metro', 'Metronidazolo', 'antibiotici', ['250 mg compresse', '500 mg compresse'], '1 dose ogni 8-12 ore', 7, 'Metronidazolo equivalente.');
addEquivalenti('doxi', 'Doxiciclina', 'antibiotici', ['100 mg compresse'], '1 compressa al giorno', 8, 'Doxiciclina equivalente.');

add('brufen_600_cpr', 'Brufen 600mg Compresse', 'Ibuprofene', 'fans_analgesici', '600 mg compresse rivestite', '1 compressa ogni 8 ore a stomaco pieno', 4, 'FANS di prima scelta per dolore post-estrattivo, chirurgia ossea e flogosi odontoiatrica.');
add('brufen_600_bust', 'Brufen 600mg Bustine', 'Ibuprofene', 'fans_analgesici', '600 mg granulato effervescente', '1 bustina ogni 8 ore sciolta in acqua ai pasti', 4, 'Rapido assorbimento gastrointestinale.');
add('brufen_400_cpr', 'Brufen 400mg', 'Ibuprofene', 'fans_analgesici', '400 mg compresse rivestite', '1 compressa ogni 8 ore a stomaco pieno', 4, 'Dolore odontoiatrico moderato.');
add('brufen_ped_sosp', 'Brufen Bambini Sospensione', 'Ibuprofene', 'fans_analgesici', '100 mg / 5 ml sospensione orale (aroma fragola/arancia)', '20-30 mg/kg/die in 3 dosi a stomaco pieno', 4, 'Analgesico antinfiammatorio pediatrico.');
add('spidifen_600_bust', 'Spidifen 600mg Bustine', 'Ibuprofene sale di arginina', 'fans_analgesici', '600 mg granulato per soluzione orale aroma albicocca', '1 bustina ogni 8 ore a stomaco pieno', 3, 'Assorbimento ultra-rapido in 15-25 minuti. Ideale per dolore acuto da pulpite o post-operatorio.');
add('spidifen_400_cpr', 'Spidifen 400mg Compresse', 'Ibuprofene sale di arginina', 'fans_analgesici', '400 mg cpr rivestite', '1 compressa ogni 8 ore', 3, 'Azione analgesica rapida.');
add('momentact_400_cps', 'Momentact 400mg Capsule Molli', 'Ibuprofene', 'fans_analgesici', '400 mg capsule molli a rilascio rapido', '1 capsula ogni 8 ore a stomaco pieno al bisogno', 3, 'Capsula liquida per azione rapida sul mal di denti acuto.');
add('momentact_400_bust', 'Momentact 400mg Bustine Liquide', 'Ibuprofene', 'fans_analgesici', '400 mg sospensione orale in bustina pronta da bere', '1 bustina pronta al bisogno fino a 3 volte al dì', 3, 'Assunzione immediata senz\'acqua.');
add('moment_200_cpr', 'Moment 200mg', 'Ibuprofene', 'fans_analgesici', '200 mg compresse', '1-2 compresse fino a 3 volte al giorno', 3, 'Per dolori odontoiatrici lievi.');
add('nurofen_400_cpr', 'Nurofen 400mg Compresse', 'Ibuprofene', 'fans_analgesici', '400 mg compresse rivestite', '1 compressa ogni 8 ore ai pasti', 3, 'Analgesico rapido per mal di denti.');
add('nurofen_febbre_ped', 'Nurofen Febbre e Dolore Bambini', 'Ibuprofene', 'fans_analgesici', '100 mg / 5 ml sospensione aroma fragola', 'Dose con siringa graduata in base al peso ogni 6-8 ore', 4, 'Analgesico pediatrico antalgico ed antinfiammatorio.');
add('antalfebal_ped', 'Antalfebal Bambini Sospensione', 'Ibuprofene', 'fans_analgesici', '20 mg / ml sospensione orale', 'Misurino secondo peso ogni 8 ore', 4, 'Ibuprofene pediatrico.');

addEquivalenti('ibu', 'Ibuprofene', 'fans_analgesici', ['600 mg compresse', '600 mg granulato per soluzione', '400 mg compresse rivestite'], '1 dose ogni 8 ore a stomaco pieno', 4, 'FANS di uso comune per flogosi e dolore.');

add('oki_80_bust', 'Oki 80mg Bustine Bipartite', 'Ketoprofene sale di lisina', 'fans_analgesici', '80 mg granulato per soluzione orale bustine bipartite', '1 bustina fino a 3 volte al giorno ai pasti sciolta in acqua', 4, 'Analgesico antinfiammatorio di largo uso per stomatiti, dolori dentari e flogosi post-estrattive.');
add('oki_gocce_orali', 'Oki Gocce Orali', 'Ketoprofene sale di lisina', 'fans_analgesici', '80 mg/ml gocce orali flacone 30 ml', '20-30 gocce fino a 3 volte al giorno dopo i pasti', 3, 'Flessibilità di dosaggio.');
add('oki_task_40_orosol', 'Oki Task 40mg Microgranuli', 'Ketoprofene sale di lisina', 'fans_analgesici', '40 mg microgranuli orosolubili', '1 bustina orosolubile direttamente sulla lingua senza acqua al bisogno (max 3/die)', 3, 'Assorbimento immediato della mucosa orale.');
add('oki_supposte_160', 'Oki Supposte 160mg', 'Ketoprofene sale di lisina', 'fans_analgesici', '160 mg supposte', '1 supposta 1-2 volte al giorno', 3, 'Via rettale in caso di vomito o disfagia grave.');
add('orudis_200_retard', 'Orudis Retard 200mg', 'Ketoprofene', 'fans_analgesici', '200 mg compresse a rilascio prolungato', '1 compressa al giorno dopo il pasto principale', 5, 'Copertura antinfiammatoria 24h per artralgie dell\'articolazione temporo-mandibolare (ATM).');
add('orudis_50_cps', 'Orudis 50mg Capsule', 'Ketoprofene', 'fans_analgesici', '50 mg capsule', '1 capsula ogni 8 ore', 4, 'Ketoprofene classico.');
add('orudis_100_fiale', 'Orudis Fiale I.M.', 'Ketoprofene', 'fans_analgesici', '100 mg / 2 ml fiale iniettabili I.M.', '1 fiala I.M. ogni 12-24 ore al bisogno', 2, 'Via parenterale per dolore severo e blocco ATM.');
add('ketodol_25_cpr', 'Ketodol Compresse Gastroprotette', 'Ketoprofene 25mg + Sucralfato 200mg', 'fans_analgesici', '25 mg compresse a doppio strato gastroprotetto', '1 compressa fino a 3 volte al giorno ai pasti', 4, 'Lo strato esterno di sucralfato protegge la mucosa gastrica prima del rilascio del FANS.');
add('enantyum_25_cpr', 'Enantyum 25mg Compresse', 'Dexketoprofene trometamolo', 'fans_analgesici', '25 mg compresse rivestite', '1 compressa ogni 8 ore a stomaco pieno', 4, 'Enantiomero destrogiro attivo del ketoprofene ad alta potenza e minore carico chimico epatico.');
add('enantyum_25_bust', 'Enantyum 25mg Granulato', 'Dexketoprofene trometamolo', 'fans_analgesici', '25 mg granulato per soluzione orale', '1 bustina ogni 8 ore sciolta in acqua ai pasti', 4, 'Solubile ad azione rapida.');
add('enantyum_50_fiale', 'Enantyum Fiale I.M./E.V.', 'Dexketoprofene trometamolo', 'fans_analgesici', '50 mg / 2 ml fiale iniettabili', '1 fiala I.M. ogni 8-12 ore al bisogno (max 150 mg/die)', 2, 'Analgesico iniettabile post-chirurgico in poltrona.');

addEquivalenti('keto_lisina', 'Ketoprofene Sale di Lisina', 'fans_analgesici', ['80 mg bustine bipartite', '40 mg bustine orosolubili'], '1 bustina fino a 3 volte al giorno ai pasti', 4, 'Ketoprofene lisina generico.');
addEquivalenti('dexketo', 'Dexketoprofene', 'fans_analgesici', ['25 mg compresse', '25 mg granulato solubile'], '1 dose ogni 8 ore', 4, 'Dexketoprofene enantiomero puro.');

add('tachi_1000_cpr', 'Tachipirina 1000mg Compresse', 'Paracetamolo', 'fans_analgesici', '1000 mg compresse', '1 compressa ogni 8 ore al bisogno a stomaco pieno o vuoto (max 3 g/die)', 4, 'Analgesico d\'elezione in gravidanza, per allergici a FANS/Aspirina e per pazienti scoagulati in TAO/NAO. Non gastrolesivo.');
add('tachi_1000_bust', 'Tachipirina 1000mg Bustine Effervescenti', 'Paracetamolo', 'fans_analgesici', '1000 mg granulato effervescente', '1 bustina ogni 8 ore sciolta in acqua', 4, 'Paracetamolo effervescente ad assorbimento rapido.');
add('tachi_500_cpr', 'Tachipirina 500mg Compresse', 'Paracetamolo', 'fans_analgesici', '500 mg compresse', '1-2 compresse ogni 6-8 ore', 4, 'Per dolori lievi o adolescenti.');
add('tachi_flashtab_500', 'Tachipirina Flashtab 500mg', 'Paracetamolo', 'fans_analgesici', '500 mg compresse orodispersibili', '1-2 compresse da sciogliere in bocca senz\'acqua', 3, 'Orosolubile ad assunzione immediata.');
add('tachi_ped_scir', 'Tachipirina Bambini Sciroppo', 'Paracetamolo', 'fans_analgesici', '120 mg / 5 ml sciroppo flacone 120 ml', '10-15 mg/kg ogni 6 ore con siringa dosatrice', 4, 'Formulazione pediatrica per algie dentarie ed eruzioni decidue.');
add('tachi_ped_gocce', 'Tachipirina Gocce Pediatriche', 'Paracetamolo', 'fans_analgesici', '100 mg / ml gocce orali flacone 30 ml', '3 gocce per kg di peso ogni 6 ore', 4, 'Per lattanti e prima infanzia.');
add('tachi_supp_1000', 'Tachipirina Supposte 1000mg', 'Paracetamolo', 'fans_analgesici', '1000 mg supposte', '1 supposta ogni 8 ore', 4, 'Somministrazione rettale adulti.');
add('efferalgan_1000_eff', 'Efferalgan 1000mg Effervescente', 'Paracetamolo', 'fans_analgesici', '1000 mg compresse effervescenti', '1 compressa effervescente ogni 8 ore', 4, 'Paracetamolo solubile tamponato.');
add('efferalgan_500_cpr', 'Efferalgan 500mg', 'Paracetamolo', 'fans_analgesici', '500 mg compresse effervescenti', '1 compressa ogni 6-8 ore', 4, 'Dosaggio standard.');
add('tachidol_cpr', 'Tachidol Compresse', 'Paracetamolo 500mg + Codeina fosfato 30mg', 'fans_analgesici', '500 mg + 30 mg compresse rivestite', '1-2 compresse ogni 8 ore dopo i pasti (max 6 cpr/die)', 3, 'Analgesico ad azione centrale per dolore acuto da chirurgia estrattiva refrattario ai FANS. Cautela su sonnolenza.');
add('tachidol_bust', 'Tachidol Bustine Effervescenti', 'Paracetamolo 500mg + Codeina fosfato 30mg', 'fans_analgesici', '500 mg + 30 mg granulato effervescente', '1 bustina ogni 8 ore sciolta in acqua', 3, 'Assorbimento rapido per dolore post-operatorio severo.');
add('co_efferalgan_cpr', 'Co-Efferalgan Compresse Effervescenti', 'Paracetamolo 500mg + Codeina fosfato 30mg', 'fans_analgesici', '500 mg + 30 mg compresse effervescenti', '1 compressa effervescente ogni 8 ore dopo i pasti', 3, 'Associazione analgesica oppioide debole.');
add('kolibri_cpr', 'Kolibri Compresse', 'Paracetamolo 325mg + Tramadolo 37.5mg', 'fans_analgesici', '325 mg + 37.5 mg cpr rivestite', '1-2 compresse ogni 6-8 ore (max 8 cpr/die)', 3, 'Sinergia analgesica centrale periferica per dolori odontostomatologici moderato-severi.');
add('patrol_cpr', 'Patrol Compresse', 'Paracetamolo 325mg + Tramadolo 37.5mg', 'fans_analgesici', '325 mg + 37.5 mg compresse', '1-2 compresse ogni 8 ore', 3, 'Associazione tramadolo-paracetamolo.');
add('contramal_50_cps', 'Contramal 50mg Capsule', 'Tramadolo cloridrato', 'fans_analgesici', '50 mg capsule rigide', '1 capsula ogni 6-8 ore al bisogno (max 400 mg/die)', 3, 'Oppioide sintetico per dolore neuropatico trigeminale, disestesia o chirurgia ricostruttiva severa.');
add('contramal_gocce', 'Contramal Gocce Orali', 'Tramadolo cloridrato', 'fans_analgesici', '100 mg / ml gocce orali flacone dosatore con contagocce', '20-40 gocce (50-100 mg) ogni 6-8 ore in poca acqua', 3, 'Dosaggio personalizzabile in base alla soglia algica.');
add('contramal_100_fiale', 'Contramal Fiale I.M./E.V.', 'Tramadolo cloridrato', 'fans_analgesici', '100 mg / 2 ml fiale iniettabili', '1 fiala I.M./E.V. lenta al bisogno', 2, 'Analgesia parenterale di emergenza.');
add('tradonal_odis_50', 'Tradonal Odis 50mg', 'Tramadolo cloridrato', 'fans_analgesici', '50 mg compresse orodispersibili', '1 compressa sulla lingua senza acqua ogni 6-8 ore', 3, 'Tramadolo orodispersibile.');

addEquivalenti('paracetamol', 'Paracetamolo', 'fans_analgesici', ['1000 mg compresse', '1000 mg bustine effervescenti', '500 mg compresse'], '1 dose ogni 8 ore', 4, 'Paracetamolo puro equivalente.');
addEquivalenti('paracet_codeina', 'Paracetamolo + Codeina', 'fans_analgesici', ['500 mg + 30 mg compresse', '500 mg + 30 mg bustine effervescenti'], '1 dose ogni 8 ore', 3, 'Associazione analgesica oppioide debole.');
addEquivalenti('paracet_tramadolo', 'Paracetamolo + Tramadolo', 'fans_analgesici', ['325 mg + 37.5 mg compresse'], '1 compressa ogni 8 ore', 3, 'Associazione centrale e periferica.');
addEquivalenti('tramadolo', 'Tramadolo', 'fans_analgesici', ['50 mg capsule', '100 mg/ml gocce orali'], '1 dose ogni 8 ore', 3, 'Tramadolo equivalente.');

add('toradol_10_cpr', 'Toradol 10mg Compresse', 'Ketorolac trometamina', 'fans_analgesici', '10 mg cpr rivestite', '1 compressa ogni 6-8 ore al bisogno a stomaco pieno (max 4 cpr/die)', 3, 'Potentissimo analgesico per dolore severo post-chirurgia complessa (avulsione inclusi, osteotomie, rigenerativa). Massimo 3-5 giorni consecutivi.');
add('toradol_gocce_orali', 'Toradol Gocce Orali', 'Ketorolac trometamina', 'fans_analgesici', '20 mg / ml gocce orali flacone 10 ml', '10-20 gocce ogni 6-8 ore dopo i pasti (max 40 mg/die)', 3, 'Assunzione liquida a dosaggio modulabile.');
add('toradol_30_fiale', 'Toradol Fiale I.M./E.V.', 'Ketorolac trometamina', 'fans_analgesici', '30 mg / 1 ml fiale iniettabili', '1 fiala I.M./E.V. al bisogno (max 90 mg/die)', 2, 'Uso immediato in poltrona post-intervento chirurgico invasivo.');
add('lixidol_10_cpr', 'Lixidol 10mg', 'Ketorolac trometamina', 'fans_analgesici', '10 mg compresse', '1 compressa ogni 6-8 ore', 3, 'Ketorolac trometamina marchio Lixidol.');
add('lixidol_30_fiale', 'Lixidol Fiale 30mg', 'Ketorolac trometamina', 'fans_analgesici', '30 mg / ml fiale', '1 fiala I.M. al bisogno', 2, 'Formulazione iniettabile.');
add('synflex_550_forte', 'Synflex Forte 550mg', 'Naprossene sodico', 'fans_analgesici', '550 mg cpr rivestite', '1 compressa ogni 12 ore dopo i pasti', 4, 'Lunga emivita plasmatica (14h). Eccellente per disordini temporo-mandibolari e mialgie masticatorie prolungate.');
add('synflex_275_cpr', 'Synflex 275mg', 'Naprossene sodico', 'fans_analgesici', '275 mg compresse', '1 compressa ogni 8-12 ore', 4, 'Dosaggio medio per algie dentarie.');
add('naprosyne_500_cpr', 'Naprosyne 500mg', 'Naprossene', 'fans_analgesici', '500 mg compresse gastroresistenti', '1 compressa ogni 12 ore', 4, 'Formulazione gastroresistente.');
add('voltaren_50_cpr', 'Voltaren 50mg Compresse', 'Diclofenac sodico', 'fans_analgesici', '50 mg compresse gastroresistenti', '1 compressa ogni 8-12 ore a stomaco pieno', 4, 'FANS classico ad alto potere antinfiammatorio.');
add('voltaren_75_fiale', 'Voltaren Fiale I.M.', 'Diclofenac sodico', 'fans_analgesici', '75 mg / 3 ml fiale iniettabili I.M.', '1 fiala I.M. al giorno (max 2 fiale/die)', 2, 'Iniezione intramuscolare profonda per flogosi acuta del trigemino o dell\'ATM.');
add('voltaren_100_retard', 'Voltaren 100mg Retard', 'Diclofenac sodico', 'fans_analgesici', '100 mg cpr a rilascio prolungato', '1 compressa al giorno la sera dopo cena', 4, 'Copertura notturna per dolori da serramento o artrite ATM.');
add('aulin_100_bust', 'Aulin 100mg Bustine', 'Nimesulide', 'fans_analgesici', '100 mg granulato per sospensione orale', '1 bustina ogni 12 ore dopo i pasti (max 15 giorni)', 3, 'Seconda linea per dolore acuto odontoiatrico. Non superare i 15 giorni per tollerabilità epatica.');
add('aulin_100_cpr', 'Aulin 100mg Compresse', 'Nimesulide', 'fans_analgesici', '100 mg compresse', '1 compressa ogni 12 ore ai pasti', 3, 'Nimesulide in compresse.');
add('arcoxia_90_cpr', 'Arcoxia 90mg', 'Etoricoxib', 'fans_analgesici', '90 mg cpr rivestite', '1 compressa una volta al giorno', 4, 'Inibitore selettivo COX-2 specifico per dolore acuto da chirurgia odontoiatrica (avulsioni terzi molari). Minore gastrolesività.');
add('arcoxia_60_cpr', 'Arcoxia 60mg', 'Etoricoxib', 'fans_analgesici', '60 mg cpr', '1 compressa al giorno', 5, 'Dosaggio moderato per algie articolari temporo-mandibolari.');
add('arcoxia_120_cpr', 'Arcoxia 120mg', 'Etoricoxib', 'fans_analgesici', '120 mg compresse', '1 compressa una volta al giorno per max 3-4 giorni', 3, 'Dosaggio da chirurgia maggiore.');
add('tauxib_90_cpr', 'Tauxib 90mg', 'Etoricoxib', 'fans_analgesici', '90 mg compresse', '1 compressa al giorno', 4, 'Etoricoxib marchio Tauxib.');
add('celebrex_200_cps', 'Celebrex 200mg', 'Celecoxib', 'fans_analgesici', '200 mg capsule rigide', '1 capsula al giorno dopo i pasti (oppure 100 mg ogni 12h)', 5, 'Inibitore COX-2 per pazienti ad alto rischio di ulcera gastrica. Cautela in cardiopatici e ipertesi.');
add('celebrex_100_cps', 'Celebrex 100mg', 'Celecoxib', 'fans_analgesici', '100 mg capsule', '1 capsula ogni 12 ore', 5, 'Dosaggio frazionato.');
add('aspirina_500_eff', 'Aspirina 500mg con Vitamina C', 'Acido acetilsalicilico 500mg + Acido ascorbico 240mg', 'fans_analgesici', '500 mg compresse effervescenti', '1-2 compresse effervescenti ogni 6-8 ore dopo i pasti', 3, 'FANS classico. Inibisce l\'aggregazione piastrinica per 7 giorni. Cautela in prossimità di interventi estrattivi.');
add('vivin_c_eff', 'Vivin C Compresse Effervescenti', 'Acido acetilsalicilico 330mg + Acido ascorbico 200mg', 'fans_analgesici', '330 mg compresse effervescenti', '1-2 compresse sciolte in acqua fino a 3 volte al dì', 3, 'Azione analgesica ed antipiretica tamponata.');
add('feldene_20_cpr', 'Feldene Fast 20mg', 'Piroxicam', 'fans_analgesici', '20 mg compresse sublinguali', '1 compressa sublinguale al giorno', 4, 'Assorbimento sublinguale rapido.');

addEquivalenti('ketorolac', 'Ketorolac', 'fans_analgesici', ['10 mg compresse', '20 mg/ml gocce orali', '30 mg fiale iniettabili'], '1 dose ogni 8 ore (max 3-5 gg)', 3, 'Ketorolac equivalente potente.');
addEquivalenti('naprossene', 'Naprossene', 'fans_analgesici', ['550 mg compresse', '275 mg compresse'], '1 compressa ogni 12 ore', 4, 'Naprossene sodico equivalente.');
addEquivalenti('diclofenac', 'Diclofenac', 'fans_analgesici', ['50 mg compresse', '100 mg compresse a rilascio prolungato', '75 mg fiale I.M.'], '1 dose ogni 12 ore ai pasti', 4, 'Diclofenac sodico generico.');
addEquivalenti('nimesulide', 'Nimesulide', 'fans_analgesici', ['100 mg bustine', '100 mg compresse'], '1 dose ogni 12 ore ai pasti', 3, 'Nimesulide generica.');
addEquivalenti('etoricoxib', 'Etoricoxib', 'fans_analgesici', ['90 mg compresse', '60 mg compresse', '120 mg compresse'], '1 compressa al giorno', 4, 'Inibitore selettivo COX-2 equivalente.');
addEquivalenti('celecoxib', 'Celecoxib', 'fans_analgesici', ['200 mg capsule', '100 mg capsule'], '1 capsula al giorno', 5, 'Celecoxib generico.');

add('bentelan_1_eff', 'Bentelan 1mg Compresse Effervescenti', 'Betametasone disodio fosfato', 'cortisonici', '1 mg compresse effervescenti', '1 compressa al mattino e 1 alla sera dopo i pasti per 3 giorni, poi a scalare', 4, 'Corticosteroide di riferimento in odontoiatria per prevenire edema facciale, gonfiore e trisma post-avulsione ottavi e chirurgia ossea. Contiene lattosio.');
add('bentelan_05_eff', 'Bentelan 0.5mg Compresse', 'Betametasone disodio fosfato', 'cortisonici', '0.5 mg cpr effervescenti', '1-2 compresse ogni 12 ore', 3, 'Dosaggio moderato o pediatrico per reazioni flogistiche orali acute.');
add('bentelan_4_fiale', 'Bentelan Fiale 4mg/2ml I.M./E.V.', 'Betametasone disodio fosfato', 'cortisonici', '4 mg / 2 ml fiale iniettabili', '1 fiala I.M. pre-operatoria o post-chirurgica immediata', 1, 'Prevenzione massima del gonfiore post-chirurgico e terapia dell\'edema periorale severo.');
add('bentelan_15_fiale', 'Bentelan Fiale 1.5mg/2ml', 'Betametasone disodio fosfato', 'cortisonici', '1.5 mg / 2 ml fiale', '1 fiala I.M.', 1, 'Dosaggio medio parenterale.');
add('deflan_30_cpr', 'Deflan 30mg Compresse', 'Deflazacort', 'cortisonici', '30 mg compresse', '1 compressa al giorno al mattino per 3 giorni, poi mezza cpr per 2 giorni', 5, 'Corticosteroide oxazolinico con minor impatto sul metabolismo glicidico e minore ritenzione idrosalina rispetto agli altri steroidi.');
add('deflan_6_cpr', 'Deflan 6mg', 'Deflazacort', 'cortisonici', '6 mg compresse', '1-2 compresse al mattino', 4, 'Dosaggio a bassa intensità per mantenimento.');
add('deflan_gocce', 'Deflan Gocce Orali', 'Deflazacort', 'cortisonici', '22.75 mg / ml gocce orali flacone 13 ml', 'Gocce proporzionate al peso corporeo al mattino', 4, 'Deflazacort in gocce per dosaggio pediatrico o frazionato.');
add('flantadin_30_cpr', 'Flantadin 30mg', 'Deflazacort', 'cortisonici', '30 mg compresse', '1 compressa al mattino a scalare', 5, 'Deflazacort marchio Flantadin.');
add('flantadin_6_cpr', 'Flantadin 6mg', 'Deflazacort', 'cortisonici', '6 mg compresse', '1-2 compresse al giorno', 4, 'Dosaggio ridotto.');
add('soldesam_4_fiale', 'Soldesam Fiale 4mg/1ml', 'Desametasone sodio fosfato', 'cortisonici', '4 mg / 1 ml fiale iniettabili', '1 fiala I.M./E.V. iniezione singola', 1, 'Desametasone ad altissima potenza antinfiammatoria e lunga emivita biologica (36-54 ore).');
add('soldesam_gocce', 'Soldesam Gocce Orali 0.2%', 'Desametasone', 'cortisonici', '2 mg / ml gocce orali flacone 10 ml', '15-20 gocce al mattino dopo colazione', 4, 'Desametasone in gocce orali.');
add('decadron_4_fiale', 'Decadron Fiale 4mg', 'Desametasone', 'cortisonici', '4 mg / 1 ml fiale', '1 fiala I.M.', 1, 'Formulazione iniettabile Decadron.');
add('deltacortene_25_cpr', 'Deltacortene 25mg', 'Prednisone', 'cortisonici', '25 mg compresse', '1 compressa al mattino dopo colazione a scalare', 5, 'Prednisone sistemico per flogosi tessutali estese del massiccio facciale.');
add('deltacortene_5_cpr', 'Deltacortene 5mg', 'Prednisone', 'cortisonici', '5 mg compresse', '1-2 compresse al mattino', 4, 'Dosaggio a scalare finale.');
add('medrol_16_cpr', 'Medrol 16mg Compresse', 'Metilprednisolone', 'cortisonici', '16 mg compresse', '1 compressa al mattino per 3 giorni, poi mezza cpr per 2 giorni', 5, 'Metilprednisolone ad alta tolleranza per edemi chirurgici mascellari.');
add('medrol_4_cpr', 'Medrol 4mg', 'Metilprednisolone', 'cortisonici', '4 mg compresse', '1 compressa al mattino', 4, 'Dosaggio ridotto.');
add('urbason_20_fiale', 'Urbason Fiale 20mg', 'Metilprednisolone sodio succinato', 'cortisonici', '20 mg polvere e solvente per soluzione iniettabile', '1 fiala I.M./E.V. al bisogno', 1, 'Corticosteroide iniettabile rapido per emergenze odontoiatriche ed edemi laringei/facciali.');
add('urbason_40_fiale', 'Urbason Fiale 40mg', 'Metilprednisolone', 'cortisonici', '40 mg fiale', '1 fiala I.M./E.V.', 1, 'Dosaggio elevato per chirurgia maggiore.');

addEquivalenti('betametasone', 'Betametasone', 'cortisonici', ['1 mg compresse effervescenti', '0.5 mg compresse effervescenti', '4 mg fiale I.M./E.V.'], '1 dose al mattino dopo colazione a scalare', 4, 'Betametasone generico.');
addEquivalenti('prednisone', 'Prednisone', 'cortisonici', ['25 mg compresse', '5 mg compresse'], '1 compressa al mattino a scalare', 5, 'Prednisone generico.');
addEquivalenti('metilpred', 'Metilprednisolone', 'cortisonici', ['16 mg compresse', '4 mg compresse'], '1 compressa al mattino', 5, 'Metilprednisolone generico.');

add('curasept_ads_020_coll', 'Curasept ADS Trattamento Intensivo 0.20%', 'Clorexidina digluconato 0.20% con sistema ADS', 'collutori_antisettici', 'Collutorio flacone 200 ml con formula brevettata antimacchia ADS', '1 sciacquo con 10 ml per 1 minuto 2 volte al giorno per 7-14 giorni', 14, 'Gold standard antisettico post-chirurgico implantare, rigenerativo ed estrattivo.');
add('curasept_ads_012_coll', 'Curasept ADS Trattamento Prolungato 0.12%', 'Clorexidina digluconato 0.12%', 'collutori_antisettici', 'Collutorio 200 ml', '1 sciacquo per 1 minuto 2 volte al dì dopo igiene orale', 21, 'Mantenimento parodontale per gengiviti e tasche parodontali attive.');
add('curasept_ads_005_coll', 'Curasept ADS Quotidiano 0.05% con Fluoro', 'Clorexidina 0.05% + Fluoruro di sodio 0.05%', 'collutori_antisettici', 'Collutorio 200 ml / 500 ml', '1 sciacquo al giorno dopo spazzolamento', 30, 'Antiplacca quotidiano e rimineralizzante smalto.');
add('curasept_gel_1_tubo', 'Curasept Gel Parodontale 1%', 'Clorexidina 1% + Copolimero PVP-VA', 'collutori_antisettici', 'Gel tubo 30 ml con applicatore gengivale', 'Applicare una noce di gel sulle suture o sul sito operato 2 volte al dì con dito pulito', 10, 'Adesività prolungata della pellicola protettiva sulla ferita chirurgica.');
add('curasept_gel_05_tubo', 'Curasept Gel Parodontale 0.5%', 'Clorexidina 0.50%', 'collutori_antisettici', 'Gel tubo 30 ml', 'Applicare localmente nelle tasche o su impianti 2 volte al dì', 14, 'Trattamento di mucositi perimplantari.');
add('curasept_ads_rigenerante_coll', 'Curasept ADS Rigenerante 0.20% + Acido Ialuronico', 'Clorexidina 0.20% + Sodio Ialuronato 0.2%', 'collutori_antisettici', 'Collutorio 200 ml', '1 sciacquo da 10 ml per 1 minuto 2 volte al giorno senza risciacquare con acqua', 14, 'Favorisce l\'angiogenesi, la cicatrizzazione tissutale e protegge la ferita chirurgica.');
add('curasept_ads_rigenerante_gel', 'Curasept Gel Rigenerante Acido Ialuronico', 'Clorexidina 0.50% + Acido Ialuronico', 'collutori_antisettici', 'Gel 30 ml', 'Applicare direttamente sulla ferita 2-3 volte al giorno', 10, 'Rigenerazione e cicatrizzazione post-innesti e chirurgia mucogengivale.');
add('curasept_ads_lenitivo_coll', 'Curasept ADS Lenitivo 0.20% + Clorobutanolo', 'Clorexidina 0.20% + Clorobutanolo 0.5%', 'collutori_antisettici', 'Collutorio 200 ml', '1 sciacquo 2 volte al dì dopo i pasti', 10, 'Azione antalgica e lenitiva locale su mucose irritate e decubiti.');
add('curasept_ads_astringente_coll', 'Curasept ADS Astringente 0.20% con Amamelide', 'Clorexidina 0.20% + Estratto di Hamamelis Virginiana', 'collutori_antisettici', 'Collutorio 200 ml', '1 sciacquo 2 volte al giorno', 10, 'Azione vasocostrittrice e decongestionante per gengive sanguinanti.');
add('dentosan_020_coll', 'Dentosan Trattamento Intensivo 0.20%', 'Clorexidina digluconato 0.20%', 'collutori_antisettici', 'Collutorio 200 ml', '1 sciacquo con 10 ml 2 volte al giorno', 10, 'Azione d\'urto antiplacca pre e post chirurgia estrattiva.');
add('dentosan_012_coll', 'Dentosan Trattamento Mese 0.12%', 'Clorexidina 0.12%', 'collutori_antisettici', 'Collutorio 200 ml / 500 ml', '1 sciacquo per 1 minuto 2 volte al giorno', 21, 'Antisettico di mantenimento parodontale.');
add('dentosan_gel_05', 'Dentosan Gel Parodontale 0.50%', 'Clorexidina 0.50%', 'collutori_antisettici', 'Gel tubo 30 ml', 'Massaggiare localmente sul fornice o bordo gengivale', 10, 'Applicazione mirata su tasche gengivali.');
add('corsodyl_020_coll', 'Corsodyl Collutorio 0.20%', 'Clorexidina digluconato 0.20%', 'collutori_antisettici', 'Collutorio flacone 200 ml / 300 ml', 'Sciacquare 10 ml per 1 minuto 2 volte al giorno', 10, 'Antisettico concentrato del cavo orale.');
add('corsodyl_gel_1', 'Corsodyl Gel Dentale 1%', 'Clorexidina digluconato 1%', 'collutori_antisettici', 'Gel 30 g', 'Applicare sul sito operato o spazzolare delicatamente', 10, 'Gel gengivale ad alta concentrazione.');
add('corsodyl_spray', 'Corsodyl Spray Orale 0.20%', 'Clorexidina 0.20%', 'collutori_antisettici', 'Spray per mucosa orale 60 ml con beccuccio orientabile', '2-3 nebulizzazioni dirette sul sito operato 2 volte al dì', 10, 'Ideale per settori posteriori o pazienti con trisma post-anestesia.');
add('froben_gola_coll', 'Froben Gola Collutorio 0.25%', 'Flurbiprofene 0.25%', 'collutori_antisettici', 'Collutorio flacone 160 ml con bicchierino dosatore', 'Sciacquo o gargarismo con 10 ml 2-3 volte al giorno', 5, 'FANS topico per stomatiti, gengiviti dolorose, afte diffuse e faringiti.');
add('froben_gola_spray', 'Froben Gola Spray', 'Flurbiprofene 0.25%', 'collutori_antisettici', 'Spray per mucosa orale 15 ml', '2 nebulizzazioni dirette sulla zona dolente 3 volte al giorno', 5, 'Applicazione topica localizzata antinfiammatoria.');
add('tantum_verde_coll', 'Tantum Verde Collutorio 0.15%', 'Benzidamina cloridrato 0.15%', 'collutori_antisettici', 'Collutorio flacone 240 ml', 'Sciacquare con 15 ml 2-3 volte al giorno', 5, 'Anestetico ed antinfiammatorio topico per mucositi e irritazioni da protesi mobile.');
add('tantum_verde_spray', 'Tantum Verde Gola Spray', 'Benzidamina cloridrato', 'collutori_antisettici', 'Spray nebulizzatore 30 ml', '2-4 spruzzi fino a 4 volte al giorno', 5, 'Nebulizzazione mirata anestetizzante del cavo orale.');
add('aminogam_gel_geng', 'Aminogam Gel Cicatrizzante', 'Aminoacidi (L-Prolina, L-Leucina, L-Lisina, Glicina) + Sodio Ialuronato', 'collutori_antisettici', 'Gel gengivale tubo 15 ml', 'Massaggiare delicatamente una noce di gel sulla ferita 3-4 volte al giorno dopo i pasti', 14, 'Stimola la rigenerazione della matrice extracellulare e la proliferazione fibroblastica post-estrazione e chirurgia parodontale.');
add('aminogam_spray', 'Aminogam Spray Rigenerante', 'Aminoacidi + Sodio Ialuronato', 'collutori_antisettici', 'Spray gengivale 15 ml', '2-3 nebulizzazioni sulla ferita 3-4 volte al giorno', 14, 'Rigenerazione mucose per zone difficilmente raggiungibili.');
add('aminogam_coll', 'Aminogam Collutorio', 'Aminoacidi + Acido Ialuronico', 'collutori_antisettici', 'Collutorio 200 ml', 'Sciacqui con 10 ml 3 volte al giorno', 14, 'Per mucositi diffuse da radioterapia o post-ablazione del tartaro a tutto campo.');
add('alovex_gel_attivo', 'Alovex Protezione Attiva Gel Afte', 'Acido Ialuronico ad alto peso molecolare + Aloe Vera', 'collutori_antisettici', 'Gel per afte tubo 8 ml con beccuccio di precisione', 'Applicare 1-2 gocce direttamente sull\'afta 3-4 volte al giorno evitando di toccare con la lingua per 2 minuti', 7, 'Crea una barriera isolante che protegge le terminazioni nervose scoperte riducendo all\'istante il dolore da masticazione.');
add('alovex_spray_afte', 'Alovex Protezione Attiva Spray', 'Acido Ialuronico + Aloe', 'collutori_antisettici', 'Spray 15 ml', '2 spruzzi sulla lesione 3 volte al giorno', 7, 'Per afte multiple del cavo orale.');
add('alovex_coll_stomat', 'Alovex Collutorio Barriera', 'Acido Ialuronico + Aloe Vera', 'collutori_antisettici', 'Collutorio 120 ml con misurino', 'Sciacquare per 1 minuto 3 volte al giorno', 7, 'Per stomatiti aftose recidivanti diffuse.');
add('buccagel_gel_afte', 'Buccagel Gel Protettivo', 'Clorexidina 0.20% + Acido Ialuronico', 'collutori_antisettici', 'Gel 15 ml', 'Applicare sulla lesione o decubito protesico 2-3 volte al giorno', 7, 'Protegge le mucose da lesioni da apparecchi ortodontici o protesi totali.');
add('buccagel_spray', 'Buccagel Spray', 'Clorexidina 0.20% + Acido Ialuronico', 'collutori_antisettici', 'Spray 15 ml', '2 nebulizzazioni 3 volte al giorno', 7, 'Spray per decubiti protesici.');
add('plak_out_active_020', 'Plak Out Active 0.20% Collutorio', 'Clorexidina 0.20% + Sistema NST anti-scolorimento', 'collutori_antisettici', 'Collutorio 200 ml', '1 sciacquo con 10 ml 2 volte al giorno', 10, 'Antisettico intensivo.');
add('plak_out_gel_05', 'Plak Out Active Gel 0.5%', 'Clorexidina 0.50%', 'collutori_antisettici', 'Gel tubo 30 ml', 'Applicazione topica localizzata 2 volte al dì', 10, 'Gel parodontale.');
add('meridol_coll_gengive', 'Meridol Protezione Gengive Collutorio', 'Fluoruro amminico + Fluoruro stannoso', 'collutori_antisettici', 'Collutorio 400 ml senza alcool', '1 sciacquo da 10 ml per 30 secondi 1 volta al giorno dopo la sera', 30, 'Inibizione duratura della placca batterica e rinforzo della gengiva marginale.');
add('elmex_protezione_carie', 'Elmex Protezione Carie Collutorio', 'Fluoruro amminico (Olaflur) 250 ppm F-', 'collutori_antisettici', 'Collutorio 400 ml', '1 sciacquo al giorno dopo spazzolamento', 30, 'Rimineralizzazione dello smalto demineralizzato e prevenzione carie radicolari.');
add('elmex_sensitive_coll', 'Elmex Sensitive Professional Collutorio', 'Nitrato di potassio + Fluoruro amminico', 'collutori_antisettici', 'Collutorio 400 ml', '1 sciacquo 2 volte al giorno', 30, 'Desensibilizzante per colletti scoperti e ipersensibilità dentinale.');
add('biorepair_coll_denti', 'Biorepair Collutorio Antibatterico Protezione Gengive', 'microRepair (Idrossiapatite biomimetica) + Zinco PCA', 'collutori_antisettici', 'Collutorio 500 ml ad alta densità', '1 sciacquo con 10-15 ml 2 volte al giorno senza diluire', 30, 'Ripara lo smalto occludendo i tubuli dentinali scoperti con azione antibatterica non macchiante.');

add('diflucan_100_cps', 'Diflucan 100mg Capsule', 'Fluconazolo', 'antimicotici_antivirali', '100 mg capsule rigide', '1 capsula al giorno per 7-14 giorni consecutivi', 10, 'Trattamento d\'elezione per candidosi orale, cheilite angolare micotica e stomatite da protesi mobile.');
add('diflucan_50_cps', 'Diflucan 50mg Capsule', 'Fluconazolo', 'antimicotici_antivirali', '50 mg capsule', '1 capsula al giorno per 7-14 giorni', 10, 'Candidosi orofaringea lieve o terapia di mantenimento.');
add('diflucan_ped_sosp', 'Diflucan Sospensione Pediatrica', 'Fluconazolo', 'antimicotici_antivirali', '50 mg / 5 ml polvere per sospensione orale flacone 35 ml', '3-6 mg/kg una volta al giorno', 10, 'Candidosi orale pediatrica (mughetto neonatale).');
add('elazor_100_cps', 'Elazor 100mg Capsule', 'Fluconazolo', 'antimicotici_antivirali', '100 mg capsule', '1 capsula al giorno', 10, 'Fluconazolo marchio Elazor.');
add('daktarin_gel_orale', 'Daktarin Gel Orale 20mg/g', 'Miconazolo 20 mg/g', 'antimicotici_antivirali', 'Gel orale tubo 80 g con cucchiaino dosatore', '1/2 cucchiaino (2.5 ml) da trattenere in bocca per qualche minuto prima di deglutire 4 volte al giorno dopo i pasti', 10, 'Applicazione topica per micosi orali e disinfezione delle superfici interne delle protesi mobili.');
add('mycostatin_sosp_orale', 'Mycostatin Sospensione Orale', 'Nistatina 100.000 UI/ml', 'antimicotici_antivirali', 'Sospensione orale flacone 100 ml con contagocce graduato', '4-6 ml (400.000-600.000 UI) 4 volte al giorno dopo i pasti da trattenere in bocca il più a lungo possibile', 10, 'Non assorbito a livello gastrointestinale: massima sicurezza per anziani e pazienti politerapizzati.');
add('sporanox_100_cps', 'Sporanox 100mg Capsule', 'Itraconazolo', 'antimicotici_antivirali', '100 mg capsule', '1 capsula 1-2 volte al giorno subito dopo un pasto completo', 14, 'Antimicotico sistemico triazolico per micosi orali resistenti al fluconazolo.');
add('zovirax_400_cpr', 'Zovirax 400mg Compresse', 'Aciclovir', 'antimicotici_antivirali', '400 mg compresse', '1 compressa 5 volte al giorno (a intervalli di 4 ore escludendo la notte) per 5 giorni', 5, 'Trattamento della gengivostomatite erpetica primaria da HSV-1 ed Herpes labiale recidivante grave.');
add('zovirax_800_cpr', 'Zovirax 800mg Compresse', 'Aciclovir', 'antimicotici_antivirali', '800 mg compresse', '1 compressa 5 volte al giorno a intervalli di 4 ore per 7 giorni', 7, 'Trattamento dell\'infezione da Herpes Zoster del ganglio di Gasser / nervo trigemino (fuoco di Sant\'Antonio facciale).');
add('zovirax_crema_labiale', 'Zovirax Crema Labiale 5%', 'Aciclovir 5%', 'antimicotici_antivirali', 'Crema tubo 2 g / flacone a pompetta', 'Applicare 5 volte al giorno a intervalli di circa 4 ore saltando la notte ai primi sintomi', 5, 'Applicazione topica precoce ai primi prodromi (bruciore/pizzicore labiale).');
add('brivirac_125_cpr', 'Brivirac 125mg Compresse', 'Brivudina', 'antimicotici_antivirali', '125 mg compresse', '1 compressa una volta al giorno alla stessa ora per 7 giorni consecutivi', 7, 'Potente antivirale per Herpes Zoster maxillo-facciale acuto in adulti immunocompetenti. Controindicazione assoluta con 5-FU.');
add('zelitrex_500_cpr', 'Zelitrex 500mg Compresse', 'Valaciclovir', 'antimicotici_antivirali', '500 mg compresse rivestite', '1 compressa 2 volte al giorno per 5 giorni', 5, 'Profarmaco dell\'aciclovir ad elevata biodisponibilità orale.');
add('famvir_500_cpr', 'Famvir 500mg Compresse', 'Famciclovir', 'antimicotici_antivirali', '500 mg compresse', '1 compressa 3 volte al giorno per 7 giorni', 7, 'Antivirale per infezioni erpetiche e nevralgie post-erpetiche trigeminali.');

addEquivalenti('fluconazolo', 'Fluconazolo', 'antimicotici_antivirali', ['100 mg capsule', '50 mg capsule', '150 mg capsule'], '1 capsula al giorno', 10, 'Fluconazolo generico.');
addEquivalenti('aciclovir', 'Aciclovir', 'antimicotici_antivirali', ['400 mg compresse', '800 mg compresse', '5% crema labiale'], '1 dose 5 volte al dì', 5, 'Aciclovir generico.');
addEquivalenti('valaciclovir', 'Valaciclovir', 'antimicotici_antivirali', ['500 mg compresse', '1000 mg compresse'], '1 compressa 2-3 volte al dì', 6, 'Valaciclovir generico.');

add('muscoril_4_cps', 'Muscoril 4mg Capsule Rigide', 'Tiocolchicoside', 'miorilassanti', '4 mg capsule rigide', '1 compressa ogni 12 ore dopo i pasti (durata massima 7 giorni consecutivi)', 5, 'Miorilassante di prima scelta per contratture acute dei muscoli masticatori (masseteri, pterigoidei, temporali), trisma post-anestesia tronculare e bruxismo acuto.');
add('muscoril_4_fiale', 'Muscoril Fiale I.M. 4mg/2ml', 'Tiocolchicoside', 'miorilassanti', '4 mg / 2 ml soluzione iniettabile per uso I.M.', '1 fiala I.M. ogni 12 ore per massimo 3-5 giorni', 3, 'Per grave blocco mandibolare con limitazione grave dell\'apertura buccale o trisma post-chirurgico.');
add('muscoril_crema', 'Muscoril Crema 0.5%', 'Tiocolchicoside', 'miorilassanti', 'Crema tubo 30 g', 'Massaggiare delicatamente sui muscoli masseteri 2-3 volte al giorno', 7, 'Applicazione topica decontratturante sui muscoli masticatori.');
add('miotens_4_cpr', 'Miotens 4mg Compresse', 'Tiocolchicoside', 'miorilassanti', '4 mg compresse', '1 compressa ogni 12 ore ai pasti', 5, 'Tiocolchicoside marchio Miotens.');
add('miotens_4_fiale', 'Miotens Fiale I.M.', 'Tiocolchicoside', 'miorilassanti', '4 mg / 2 ml fiale iniettabili', '1 fiala I.M. ogni 12 ore', 3, 'Formulazione iniettabile decontratturante.');
add('sirdalud_2_cpr', 'Sirdalud 2mg Compresse', 'Tizanidina cloridrato', 'miorilassanti', '2 mg compresse', '1 compressa la sera prima di coricarsi (aumentabile a 2 mg x 2 al dì se necessario)', 7, 'Agonista alfa-2 adrenergico centrale per ipertono muscolare da disfunzioni dell\'ATM e bruxismo notturno severo.');
add('sirdalud_4_cpr', 'Sirdalud 4mg Compresse', 'Tizanidina', 'miorilassanti', '4 mg compresse', '1 compressa la sera prima di coricarsi', 7, 'Dosaggio pieno per contratture croniche dei muscoli cranio-cervico-mandibolari.');
add('lioresal_10_cpr', 'Lioresal 10mg Compresse', 'Baclofene', 'miorilassanti', '10 mg compresse divisibili', 'Mezza compressa (5 mg) 2-3 volte al giorno aumentando gradualmente', 10, 'GABA-B agonista per spasticità e nevralgia essenziale del trigemino resistente.');
add('tiobec_dol_cpr', 'Tiobec Dol Compresse', 'Acido alfa-lipoico (800mg) + PEA Palmitoiletanolamide (600mg) + Mirra', 'miorilassanti', 'Compresse a tecnologia Fast-Slow', '1 compressa al giorno a digiuno 30 minuti prima del pasto', 20, 'Neuroprotettore e antiossidante per neuropatie da lesione o compressione del nervo alveolare inferiore (NAI) e linguale post-chirurgia.');
add('tiobec_800_cpr', 'Tiobec 800mg Compresse', 'Acido alfa-lipoico 800mg', 'miorilassanti', '800 mg cpr a rilascio controllato', '1 compressa al giorno a stomaco vuoto', 30, 'Protezione delle fibre nervose per parestesie e disestesie orali.');
add('normast_600_bust', 'Normast 600mg Microgranuli', 'Palmitoiletanolamide ultra-micronizzata (PEA-um)', 'miorilassanti', '600 mg microgranuli sublinguali', '1 bustina al giorno posta direttamente sulla lingua da deglutire senza acqua', 20, 'Modulatore del dolore neuroinfiammatorio per sindrome della bocca urente (BMS) e nevralgie atipiche facciali.');
add('valium_5_cpr', 'Valium 5mg Compresse', 'Diazepam', 'miorilassanti', '5 mg compresse', '1 compressa la sera prima dell\'intervento e 1 compressa 1 ora prima della seduta', 2, 'Ansiolitico e miorilassante per sedazione pre-operatoria di pazienti odontofobici.');
add('valium_gocce', 'Valium Gocce Orali 5mg/ml', 'Diazepam', 'miorilassanti', '5 mg / ml gocce orali flacone 20 ml', '10-20 gocce in poca acqua 45 minuti prima dell\'intervento chirurgico', 1, 'Sedazione cosciente pre-chirurgica in studio.');
add('en_gocce_orali', 'En Gocce Orali 1mg/ml', 'Delorazepam', 'miorilassanti', '1 mg / ml gocce flacone 20 ml', '10-15 gocce la sera prima dell\'intervento o 30 minuti prima della poltrona', 1, 'Premedicazione ansiolitica e gestione della tensione dei muscoli facciali da ansia anticipatoria.');
add('lexotan_gocce', 'Lexotan Gocce Orali 2.5mg/ml', 'Bromazepam', 'miorilassanti', '2.5 mg / ml gocce orali flacone 20 ml', '10-15 gocce prima della procedura odontoiatrica', 1, 'Ansiolisi per odontoiatria.');

addEquivalenti('tiocolch', 'Tiocolchicoside', 'miorilassanti', ['4 mg capsule', '4 mg fiale I.M.'], '1 dose ogni 12 ore', 5, 'Miorilassante decontratturante generico.');

add('pantorc_20_cpr', 'Pantorc 20mg Compresse Gastroresistenti', 'Pantoprazolo sodico sesquidrato', 'gastroprotettori', '20 mg compresse gastroresistenti', '1 compressa al mattino a digiuno 30 minuti prima della colazione per tutta la durata della terapia con FANS', 7, 'Inibitore di pompa protonica (IPP) per gastroprotezione in corso di cicli con FANS o corticosteroidi ad alto dosaggio. Contiene lattosio.');
add('pantorc_40_cpr', 'Pantorc 40mg Compresse', 'Pantoprazolo', 'gastroprotettori', '40 mg compresse gastroresistenti', '1 compressa al mattino a digiuno', 7, 'Per pazienti con pregressa ulcera gastroduodenale in terapia analgesica.');
add('pantopan_20_cpr', 'Pantopan 20mg', 'Pantoprazolo', 'gastroprotettori', '20 mg compresse', '1 compressa al mattino a digiuno', 7, 'Pantoprazolo marchio Pantopan.');
add('lansoprazolo_15_cps', 'Lansoprazolo 15mg Capsule', 'Lansoprazolo', 'gastroprotettori', '15 mg capsule rigide gastroresistenti', '1 capsula al mattino a digiuno prima di colazione', 7, 'IPP a basso dosaggio per prevenzione gastropatie da FANS.');
add('lansoprazolo_30_cps', 'Lansoprazolo 30mg Capsule', 'Lansoprazolo', 'gastroprotettori', '30 mg capsule gastroresistenti', '1 capsula al giorno al mattino', 7, 'Dosaggio standard.');
add('omeprazolo_20_cps', 'Omeprazolo 20mg Capsule', 'Omeprazolo', 'gastroprotettori', '20 mg capsule gastroresistenti', '1 capsula al mattino prima di colazione', 7, 'Gastroprotettore classico.');
add('nexium_20_cpr', 'Nexium 20mg Compresse', 'Esomeprazolo magnesio triidrato', 'gastroprotettori', '20 mg compresse gastroresistenti', '1 compressa al mattino a digiuno', 7, 'Enantiomero di omeprazolo ad alta efficacia di soppressione acida gastrica.');
add('lucen_20_cpr', 'Lucen 20mg Compresse', 'Esomeprazolo', 'gastroprotettori', '20 mg compresse', '1 compressa al mattino', 7, 'Esomeprazolo marchio Lucen.');
add('gaviscon_advance_bust', 'Gaviscon Advance Bustine Sospensione', 'Sodio alginato (1000mg) + Potassio bicarbonato (200mg)', 'gastroprotettori', 'Sospensione orale bustine monodose 10 ml aroma menta', '1 bustina dopo i pasti principali e prima di coricarsi', 7, 'Forma una zattera gelatinosa che impedisce il reflusso acido e la pirosi gastrica causata dall\'assunzione di analgesici.');
add('maalox_plus_cpr', 'Maalox Plus Compresse Masticabili', 'Magnesio idrossido + Alluminio idrossido + Dimeticone', 'gastroprotettori', 'Compresse masticabili', '1-2 compresse da masticare dopo i pasti al bisogno', 5, 'Antiacido ad azione tampone immediata e carminativa.');
add('biochetasi_gran_eff', 'Biochetasi Granulato Effervescente', 'Sodio citrato + Potassio citrato + Vitamina B1 + Vitamina B2 + Vitamina B6', 'gastroprotettori', 'Bustine granulato effervescente aroma arancia', '1-2 bustine sciolte in mezzo bicchiere d\'acqua dopo i pasti', 4, 'Reintegratore metabolico per nausea, acidità gastrica o disturbi digestivi post-chirurgici.');

addEquivalenti('pantoprazolo', 'Pantoprazolo', 'gastroprotettori', ['20 mg compresse gastroresistenti', '40 mg compresse gastroresistenti'], '1 compressa al mattino a digiuno', 7, 'Pantoprazolo generico.');
addEquivalenti('omeprazolo', 'Omeprazolo', 'gastroprotettori', ['20 mg capsule', '10 mg capsule'], '1 capsula al mattino', 7, 'Omeprazolo generico.');
addEquivalenti('esomeprazolo', 'Esomeprazolo', 'gastroprotettori', ['20 mg compresse', '40 mg compresse'], '1 compressa al mattino', 7, 'Esomeprazolo generico.');

add('tranex_500_cpr', 'Tranex 500mg Compresse', 'Acido Tranexamico', 'emostatici_altri', '500 mg compresse', '1 compressa ogni 8 ore nei giorni post-operatori', 3, 'Antifibrinolitico sistemico per prevenzione e trattamento delle emorragie orali in pazienti scoagulati (terapia TAO/NAO) o con coagulopatie.');
add('tranex_500_fiale', 'Tranex Fiale 500mg/5ml per Sciacqui Orali Compressivi', 'Acido Tranexamico', 'emostatici_altri', '500 mg / 5 ml fiale per uso topico ed orale', '1 fiala da usare pura per sciacqui compressivi della durata di 3-5 minuti senza deglutire, oppure imbevuta su garza compressiva per 10 minuti sul sito estrattivo', 2, 'Standard d\'eccellenza in odontoiatria per emostasi locale senza sospendere la terapia anticoagulante.');
add('ugurol_500_fiale', 'Ugurol Fiale 500mg/5ml', 'Acido Tranexamico', 'emostatici_altri', '500 mg / 5 ml fiale', 'Tamponamento su garza sterile dell\'alveolo sanguinante o sciacquo orale', 2, 'Acido tranexamico marchio Ugurol per emostasi alveolare post-estrattiva.');
add('spongostan_dental', 'Spongostan Dental Spugna Emostatica Riassorbibile', 'Gelatina sterile riassorbibile di origine porcina', 'emostatici_altri', 'Cubetti sterili 1 x 1 x 1 cm', 'Inserire 1 cubetto direttamente nell\'alveolo post-estrattivo prima della sutura', 1, 'Emostatico meccanico intra-alveolare completamente riassorbito in 2-3 settimane. Stabilizza il coagulo primario.');
add('zirtec_10_cpr', 'Zirtec 10mg Compresse', 'Cetirizina dicloridrato', 'emostatici_altri', '10 mg compresse rivestite', '1 compressa al giorno la sera', 5, 'Antistaminico anti-H1 di 2a generazione per reazioni allergiche orali lievi, dermatiti da contatto e prurito.');
add('zirtec_gocce', 'Zirtec Gocce Orali 10mg/ml', 'Cetirizina', 'emostatici_altri', '10 mg / ml gocce orali flacone 20 ml', '20 gocce (10 mg) una volta al giorno', 5, 'Formulazione gocce.');
add('kestine_10_cpr', 'Kestine 10mg Compresse', 'Ebastina', 'emostatici_altri', '10 mg compresse orodispersibili / rivestite', '1 compressa una volta al giorno', 5, 'Antistaminico non sedativo.');
add('telfast_120_cpr', 'Telfast 120mg Compresse', 'Fexofenadina cloridrato', 'emostatici_altri', '120 mg compresse', '1 compressa al giorno prima dei pasti', 5, 'Antistaminico di elezione senza sonnolenza.');
add('arnica_heel_cpr', 'Arnica Compositum Heel Compresse', 'Arnica D2 + Calendula D2 + Hamamelis D1 + Achillea millefolium + Echinacea', 'emostatici_altri', 'Compresse orodispersibili sublinguali flacone 50 cpr', '1 compressa da sciogliere sotto la lingua 3 volte al giorno a partire da 24h prima dell\'intervento e per 5 giorni post-operatori', 6, 'Coadiuvante antiedemigeno, anti-ecchimotico e biostimolante tissutale post-chirurgia estrattiva ed implantare.');
add('arnica_heel_gocce', 'Arnica Compositum Heel Gocce', 'Complesso vegetale ad azione antinfiammatoria/antiedemigena', 'emostatici_altri', 'Gocce orali flacone 30 ml', '10 gocce in poca acqua 3 volte al giorno', 6, 'Favorisce il riassorbimento degli ematomi facciali post-chirurgici.');

addEquivalenti('tranex_gen', 'Acido Tranexamico', 'emostatici_altri', ['500 mg compresse', '500 mg fiale per uso topico'], '1 dose ogni 8 ore', 2, 'Antifibrinolitico emostatico generico.');
addEquivalenti('cetirizina', 'Cetirizina', 'emostatici_altri', ['10 mg compresse', '10 mg/ml gocce orali'], '1 dose al giorno', 5, 'Antistaminico generico.');

console.log('Generati farmaci totali:', farmaci.length);

const backendProntuarioDir = path.join(__dirname, '..', 'backend', 'domain', 'prontuario');
const frontendCatalogoDir = path.join(__dirname, '..', 'ui', 'views', 'paziente', 'prescrizioni', 'catalogo');

if (!fs.existsSync(backendProntuarioDir)) fs.mkdirSync(backendProntuarioDir, { recursive: true });
if (!fs.existsSync(frontendCatalogoDir)) fs.mkdirSync(frontendCatalogoDir, { recursive: true });

const antibiotici = farmaci.filter(f => f.categoria === 'antibiotici');
const fans = farmaci.filter(f => f.categoria === 'fans_analgesici');
const cortisonici = farmaci.filter(f => f.categoria === 'cortisonici');
const collutori = farmaci.filter(f => f.categoria === 'collutori_antisettici');
const antimicotici = farmaci.filter(f => f.categoria === 'antimicotici_antivirali');
const miorilassanti = farmaci.filter(f => f.categoria === 'miorilassanti');
const gastro = farmaci.filter(f => f.categoria === 'gastroprotettori');
const emostatici = farmaci.filter(f => f.categoria === 'emostatici_altri');

console.log('Antibiotici:', antibiotici.length);
console.log('FANS:', fans.length);
console.log('Cortisonici:', cortisonici.length);
console.log('Collutori:', collutori.length);
console.log('Antimicotici/Antivirali:', antimicotici.length);
console.log('Miorilassanti:', miorilassanti.length);
console.log('Gastroprotettori:', gastro.length);
console.log('Emostatici:', emostatici.length);

fs.writeFileSync(path.join(backendProntuarioDir, 'cat_antibiotici.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(antibiotici, null, 4)};\n`);
fs.writeFileSync(path.join(backendProntuarioDir, 'cat_fans.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(fans, null, 4)};\n`);
fs.writeFileSync(path.join(backendProntuarioDir, 'cat_cortisonici.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(cortisonici, null, 4)};\n`);
fs.writeFileSync(path.join(backendProntuarioDir, 'cat_collutori.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(collutori, null, 4)};\n`);
fs.writeFileSync(path.join(backendProntuarioDir, 'cat_antimicotici.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(antimicotici, null, 4)};\n`);
fs.writeFileSync(path.join(backendProntuarioDir, 'cat_miorilassanti.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(miorilassanti, null, 4)};\n`);
fs.writeFileSync(path.join(backendProntuarioDir, 'cat_gastro.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(gastro, null, 4)};\n`);
fs.writeFileSync(path.join(backendProntuarioDir, 'cat_emostatici.js'), `'use strict';\n\nmodule.exports = ${JSON.stringify(emostatici, null, 4)};\n`);

fs.writeFileSync(path.join(frontendCatalogoDir, 'antibiotici.js'), `export const FARMACI_ANTIBIOTICI_CAT = ${JSON.stringify(antibiotici, null, 4)};\n`);
fs.writeFileSync(path.join(frontendCatalogoDir, 'fans_antidolorifici.js'), `export const FARMACI_FANS_CAT = ${JSON.stringify(fans, null, 4)};\n`);
fs.writeFileSync(path.join(frontendCatalogoDir, 'cortisonici_antisettici.js'), `export const FARMACI_CORTISONICI_ANTISETTICI_CAT = ${JSON.stringify([].concat(cortisonici, collutori), null, 4)};\n`);
fs.writeFileSync(path.join(frontendCatalogoDir, 'altri_specialistici.js'), `export const FARMACI_ALTRI_SPECIALISTICI_CAT = ${JSON.stringify([].concat(antimicotici, miorilassanti, gastro, emostatici), null, 4)};\n`);

const backendMain = `'use strict';

const antibiotici = require('./prontuario/cat_antibiotici');
const fans = require('./prontuario/cat_fans');
const cortisonici = require('./prontuario/cat_cortisonici');
const collutori = require('./prontuario/cat_collutori');
const antimicotici = require('./prontuario/cat_antimicotici');
const miorilassanti = require('./prontuario/cat_miorilassanti');
const gastro = require('./prontuario/cat_gastro');
const emostatici = require('./prontuario/cat_emostatici');

const FARMACI_PREDEFINITI = [].concat(
    antibiotici,
    fans,
    cortisonici,
    collutori,
    antimicotici,
    miorilassanti,
    gastro,
    emostatici
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
`;

fs.writeFileSync(path.join(__dirname, '..', 'backend', 'domain', 'prontuario_odontoiatrico.js'), backendMain);

const frontendMain = `import { FARMACI_ANTIBIOTICI_CAT } from './catalogo/antibiotici.js';
import { FARMACI_FANS_CAT } from './catalogo/fans_antidolorifici.js';
import { FARMACI_CORTISONICI_ANTISETTICI_CAT } from './catalogo/cortisonici_antisettici.js';
import { FARMACI_ALTRI_SPECIALISTICI_CAT } from './catalogo/altri_specialistici.js';

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
    FARMACI_ANTIBIOTICI_CAT,
    FARMACI_FANS_CAT,
    FARMACI_CORTISONICI_ANTISETTICI_CAT,
    FARMACI_ALTRI_SPECIALISTICI_CAT
);
`;

fs.writeFileSync(path.join(__dirname, '..', 'ui', 'views', 'paziente', 'prescrizioni', 'catalogo_farmaci.js'), frontendMain);

console.log('SUCCESS: Catalogo generato e sincronizzato per Backend e Frontend!');
