'use strict';

const dbUtils = require('./backend/db_utils');
const clienti = require('./backend/clienti');
const fornitori = require('./backend/fornitori');
const prodotti = require('./backend/prodotti');
const collaboratori = require('./backend/collaboratori');
const preventivi = require('./backend/preventivi');
const fatture = require('./backend/fatture');
const fatturapaXml = require('./backend/fatturapa_xml');
const ddt = require('./backend/ddt');
const finanze = require('./backend/finanze');
const impostazioni = require('./backend/impostazioni');
const documenti = require('./backend/documenti');

const NS = 'businessSuite';

// registerApi(action, fn): iniettato da AppLoader.js, inoltra le chiamate del
// frontend arrivate via window.adestioNative.callAppApi (nessun canale ipcMain
// proprio: il preload.js di Adestio non conosce in anticipo le azioni di
// un'app di terze parti, quindi tutto passa dal ponte generico capabilityBroker).
function registerBackendHandlers(registerApi, app, adestioDb) {
    try {
        dbUtils.configure(adestioDb);

        function on(channel, fn) {
            registerApi(`${NS}:${channel}`, (event, args) => fn(event, args));
        }

        on('clienti:getAll', clienti.getAll);
        on('clienti:getById', clienti.getById);
        on('clienti:search', clienti.search);
        on('clienti:create', clienti.create);
        on('clienti:update', clienti.update);
        on('clienti:remove', clienti.remove);
        on('clienti:restore', clienti.restore);

        on('fornitori:getAll', fornitori.getAll);
        on('fornitori:getById', fornitori.getById);
        on('fornitori:search', fornitori.search);
        on('fornitori:create', fornitori.create);
        on('fornitori:update', fornitori.update);
        on('fornitori:remove', fornitori.remove);
        on('fornitori:restore', fornitori.restore);

        on('prodotti:getAll', prodotti.getAll);
        on('prodotti:getById', prodotti.getById);
        on('prodotti:search', prodotti.search);
        on('prodotti:create', prodotti.create);
        on('prodotti:update', prodotti.update);
        on('prodotti:remove', prodotti.remove);
        on('prodotti:restore', prodotti.restore);
        on('prodotti:getAllCategorie', prodotti.getAllCategorie);
        on('prodotti:createCategoria', prodotti.createCategoria);
        on('prodotti:updateCategoria', prodotti.updateCategoria);
        on('prodotti:removeCategoria', prodotti.removeCategoria);

        on('collaboratori:getAll', collaboratori.getAll);
        on('collaboratori:getById', collaboratori.getById);
        on('collaboratori:create', collaboratori.create);
        on('collaboratori:update', collaboratori.update);
        on('collaboratori:remove', collaboratori.remove);
        on('collaboratori:restore', collaboratori.restore);
        on('collaboratori:getLedger', collaboratori.getLedger);
        on('collaboratori:addPagamento', collaboratori.addPagamento);
        on('collaboratori:removePagamento', collaboratori.removePagamento);

        on('preventivi:getAll', preventivi.getAll);
        on('preventivi:getById', preventivi.getById);
        on('preventivi:create', preventivi.create);
        on('preventivi:update', preventivi.update);
        on('preventivi:setStato', preventivi.setStato);
        on('preventivi:remove', preventivi.remove);
        on('preventivi:duplica', preventivi.duplica);
        on('preventivi:addVoce', preventivi.addVoce);
        on('preventivi:updateVoce', preventivi.updateVoce);
        on('preventivi:removeVoce', preventivi.removeVoce);
        on('preventivi:addAssegnazione', preventivi.addAssegnazione);
        on('preventivi:updateAssegnazione', preventivi.updateAssegnazione);
        on('preventivi:removeAssegnazione', preventivi.removeAssegnazione);
        on('preventivi:createRevision', preventivi.createRevision);
        on('preventivi:getRevisions', preventivi.getRevisions);

        on('fatture:getAll', fatture.getAll);
        on('fatture:getById', fatture.getById);
        on('fatture:create', fatture.create);
        on('fatture:createFromPreventivo', fatture.createFromPreventivo);
        on('fatture:update', fatture.update);
        on('fatture:setStato', fatture.setStato);
        on('fatture:remove', fatture.remove);
        on('fatture:addVoce', fatture.addVoce);
        on('fatture:updateVoce', fatture.updateVoce);
        on('fatture:removeVoce', fatture.removeVoce);
        on('fatture:getScadenze', fatture.getScadenze);
        on('fatture:registraIncasso', fatture.registraIncasso);
        on('fatture:exportFatturaPA', fatturapaXml.exportFatturaPA);

        on('ddt:getAll', ddt.getAll);
        on('ddt:getById', ddt.getById);
        on('ddt:create', ddt.create);
        on('ddt:update', ddt.update);
        on('ddt:remove', ddt.remove);
        on('ddt:addVoce', ddt.addVoce);
        on('ddt:removeVoce', ddt.removeVoce);

        on('finanze:getAll', finanze.getAll);
        on('finanze:create', finanze.create);
        on('finanze:update', finanze.update);
        on('finanze:remove', finanze.remove);
        on('finanze:getStats', finanze.getStats);

        on('impostazioni:getAll', impostazioni.getAll);
        on('impostazioni:setMultiple', impostazioni.setMultiple);

        on('documenti:generatePreventivoPdf', documenti.generatePreventivoPdf);
        on('documenti:generateFatturaPdf', documenti.generateFatturaPdf);
        on('documenti:generatePreventivoExcel', documenti.generatePreventivoExcel);
        on('documenti:generateFatturaExcel', documenti.generateFatturaExcel);
        on('documenti:salvaFile', documenti.salvaFile);

        console.log('[BusinessSuite] Backend registrato con successo.');
        return true;
    } catch (error) {
        console.error('[BusinessSuite] registerBackendHandlers failure:', error);
        return false;
    }
}

module.exports = {
    registerBackendHandlers
};
