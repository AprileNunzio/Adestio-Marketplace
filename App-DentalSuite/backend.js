const dbUtils = require('./backend/db_utils');
const pazientiBackend = require('./backend/pazienti_backend');
const agendaBackend = require('./backend/agenda_backend');
const prestazioniBackend = require('./backend/prestazioni_backend');
const staffBackend = require('./backend/staff_backend');
const contabilitaBackend = require('./backend/contabilita_backend');
const statisticheBackend = require('./backend/statistiche_backend');
const allegatiBackend = require('./backend/allegati_backend');

function registerBackendHandlers(registerApi, app, adestioDb) {
    try {
        dbUtils.configure(adestioDb);

        function on(action, fn) {
            try {
                registerApi(`dentalSuite:${action}`, (event, args) => fn(event, args));
            } catch (e) {}
        }

        on('pazienti:getAll', pazientiBackend.getAll);
        on('pazienti:getById', pazientiBackend.getById);
        on('pazienti:create', pazientiBackend.create);
        on('pazienti:update', pazientiBackend.update);
        on('pazienti:remove', pazientiBackend.remove);
        on('pazienti:saveAnamnesi', pazientiBackend.saveAnamnesi);
        on('pazienti:saveOdontogrammaDente', pazientiBackend.saveOdontogrammaDente);
        on('pazienti:addTrattamento', pazientiBackend.addTrattamento);
        on('pazienti:deleteTrattamento', pazientiBackend.deleteTrattamento);
        on('pazienti:addPrescrizione', pazientiBackend.addPrescrizione);
        on('pazienti:deletePrescrizione', pazientiBackend.deletePrescrizione);

        on('agenda:getAppuntamenti', agendaBackend.getAppuntamenti);
        on('agenda:createAppuntamento', agendaBackend.createAppuntamento);
        on('agenda:updateAppuntamento', agendaBackend.updateAppuntamento);
        on('agenda:updateStato', agendaBackend.updateStato);
        on('agenda:deleteAppuntamento', agendaBackend.deleteAppuntamento);

        on('prestazioni:getAll', prestazioniBackend.getAll);
        on('prestazioni:create', prestazioniBackend.create);
        on('prestazioni:update', prestazioniBackend.update);
        on('prestazioni:remove', prestazioniBackend.remove);

        on('staff:getAll', staffBackend.getAll);
        on('staff:create', staffBackend.create);
        on('staff:update', staffBackend.update);
        on('staff:remove', staffBackend.remove);
        on('staff:getLiquidazioni', staffBackend.getLiquidazioni);
        on('staff:creaLiquidazione', staffBackend.creaLiquidazione);

        on('contabilita:getPreventivi', contabilitaBackend.getPreventivi);
        on('contabilita:createPreventivo', contabilitaBackend.createPreventivo);
        on('contabilita:updatePreventivo', contabilitaBackend.updatePreventivo);
        on('contabilita:deletePreventivo', contabilitaBackend.deletePreventivo);
        on('contabilita:getIncassi', contabilitaBackend.getIncassi);
        on('contabilita:registraIncasso', contabilitaBackend.registraIncasso);
        on('contabilita:getSpese', contabilitaBackend.getSpese);
        on('contabilita:registraSpesa', contabilitaBackend.registraSpesa);
        on('contabilita:deleteSpesa', contabilitaBackend.deleteSpesa);

        on('statistiche:getGlobalStats', statisticheBackend.getGlobalStats);
        on('statistiche:getStatsByMedico', statisticheBackend.getStatsByMedico);
        on('statistiche:getStatsByBranca', statisticheBackend.getStatsByBranca);

        on('allegati:getByPaziente', allegatiBackend.getByPaziente);
        on('allegati:upload', allegatiBackend.uploadAllegato);
        on('allegati:delete', allegatiBackend.deleteAllegato);
        on('allegati:open', allegatiBackend.openAllegato);

        return true;
    } catch (e) {
        return false;
    }
}

module.exports = { registerBackendHandlers };
