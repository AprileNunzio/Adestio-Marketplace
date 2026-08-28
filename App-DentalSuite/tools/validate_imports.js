const fs = require('fs');
const path = require('path');

function walk(dir) {
    let res = [];
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            res = res.concat(walk(p));
        } else if (f.endsWith('.js')) {
            res.push(p);
        }
    });
    return res;
}

const files = walk(path.join(__dirname, '../ui'));
let errs = 0;
files.forEach(f => {
    const txt = fs.readFileSync(f, 'utf8');
    const regex = /import\s+.*?from\s+['"](.*?)['"]/g;
    let m;
    while ((m = regex.exec(txt)) !== null) {
        if (m[1].startsWith('.')) {
            const target = path.resolve(path.dirname(f), m[1]);
            if (!fs.existsSync(target)) {
                console.log('BROKEN:', f, '->', m[1]);
                errs++;
            }
        }
    }
});
console.log('CHECK DONE: Broken imports = ' + errs);
