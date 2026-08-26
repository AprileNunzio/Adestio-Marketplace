const http = require('http');
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', 'App-DentalSuite');
const PORTA = 7788;

const TIPI = {
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const candidati = url === '/' || url === '/index.html'
        ? [path.join(__dirname, 'banco.html')]
        : [path.join(__dirname, url), path.join(RADICE, url)];
    const percorso = candidati.find(voce => fs.existsSync(voce));

    if (!percorso) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('non trovato: ' + url);
        return;
    }

    fs.readFile(percorso, (errore, dati) => {
        if (errore) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('non trovato: ' + url);
            return;
        }
        res.writeHead(200, { 'Content-Type': TIPI[path.extname(percorso)] || 'application/octet-stream' });
        res.end(dati);
    });
}).listen(PORTA, () => console.log('banco visivo su http://localhost:' + PORTA));
