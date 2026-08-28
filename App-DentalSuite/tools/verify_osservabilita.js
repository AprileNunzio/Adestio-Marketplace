'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');

const SORVEGLIATI = [
    'backend/rete',
    'backend/domain/rete',
    'backend/handlers/trasmissioni.js',
    'backend/handlers/trasmissioni_invio.js',
    'backend/handlers/riscontri.js',
    'backend/handlers/sedute.js',
    'backend/handlers/richieste_poltrona.js',
    'backend/repositories/seduta_volatile.js'
];

const SILENZIOSI = [
    { nome: 'catch senza identificatore', regola: /catch \(_\)/g },
    { nome: 'catch con corpo vuoto', regola: /catch \([A-Za-z_$][\w$]*\) \{\s*\}/g },
    { nome: 'catch anonimo vuoto', regola: /catch \{\s*\}/g },
    { nome: 'promise soppressa', regola: /\.catch\(\(\) => \{\s*\}\)/g }
];

function fileDa(voce) {
    const assoluto = path.join(RADICE, voce);
    if (!fs.existsSync(assoluto)) return [];
    if (fs.statSync(assoluto).isFile()) return [assoluto];
    return fs.readdirSync(assoluto)
        .filter(nome => nome.endsWith('.js'))
        .map(nome => path.join(assoluto, nome));
}

function righeDi(testo, indice) {
    return testo.slice(0, indice).split('\n').length;
}

function analizza(file) {
    const testo = fs.readFileSync(file, 'utf8');
    const problemi = [];
    for (const { nome, regola } of SILENZIOSI) {
        regola.lastIndex = 0;
        let trovato;
        while ((trovato = regola.exec(testo)) !== null) {
            problemi.push({ riga: righeDi(testo, trovato.index), tipo: nome });
        }
    }
    return problemi;
}

let totale = 0;
for (const voce of SORVEGLIATI) {
    for (const file of fileDa(voce)) {
        for (const problema of analizza(file)) {
            totale += 1;
            console.log(`${path.relative(RADICE, file)}:${problema.riga}  ${problema.tipo}`);
        }
    }
}

console.log(`\nTOTALE errori soppressi in silenzio nel sottosistema di rete: ${totale}`);
process.exit(totale === 0 ? 0 : 1);
