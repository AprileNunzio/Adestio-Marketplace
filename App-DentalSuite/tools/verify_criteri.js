'use strict';
const fs = require('fs');
const path = require('path');

const AMMESSE = new Set(['where', 'filtri', 'ordina', 'includeArchived', 'pagina', 'dimensione']);
const METODI = /\.(findAll|findPage|findFirst|count)\(\s*\{/g;

function bilancia(testo, apertura) {
    let livello = 0;
    for (let i = apertura; i < testo.length; i += 1) {
        if (testo[i] === '{') livello += 1;
        else if (testo[i] === '}') {
            livello -= 1;
            if (livello === 0) return i;
        }
    }
    return -1;
}

function scansiona(file) {
    const testo = fs.readFileSync(file, 'utf8');
    const problemi = [];
    let m;
    METODI.lastIndex = 0;
    while ((m = METODI.exec(testo)) !== null) {
        const apertura = testo.indexOf('{', m.index);
        const chiusura = bilancia(testo, apertura);
        if (chiusura < 0) continue;
        const corpo = testo.slice(apertura + 1, chiusura);
        let livello = 0;
        const chiavi = [];
        let corrente = '';
        for (const ch of corpo) {
            if ('{(['.includes(ch)) livello += 1;
            if ('})]'.includes(ch)) livello -= 1;
            if (ch === ',' && livello === 0) { chiavi.push(corrente); corrente = ''; continue; }
            corrente += ch;
        }
        chiavi.push(corrente);
        const nomi = chiavi
            .map(v => (v.split(':')[0] || '').trim())
            .filter(v => /^[A-Za-z_][A-Za-z0-9_]*$/.test(v));
        const ignorate = nomi.filter(n => !AMMESSE.has(n));
        if (ignorate.length > 0) {
            problemi.push({
                riga: testo.slice(0, m.index).split('\n').length,
                metodo: m[1],
                ignorate
            });
        }
    }
    return problemi;
}

function cammina(dir, esiti = []) {
    for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, voce.name);
        if (voce.isDirectory()) cammina(p, esiti);
        else if (voce.name.endsWith('.js')) esiti.push(p);
    }
    return esiti;
}

const RADICE = process.argv[2] || path.join(__dirname, '..', 'backend');
let totale = 0;
for (const file of cammina(RADICE)) {
    const problemi = scansiona(file);
    if (problemi.length === 0) continue;
    for (const p of problemi) {
        totale += 1;
        console.log(`${path.relative(RADICE, file)}:${p.riga}  ${p.metodo}  criteri ignorati: ${p.ignorate.join(', ')}`);
    }
}
console.log(`\nTOTALE call site con criteri silenziosamente ignorati: ${totale}`);
process.exit(totale === 0 ? 0 : 1);
