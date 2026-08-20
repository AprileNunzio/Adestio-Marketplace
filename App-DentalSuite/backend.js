const { initDB } = require('./backend/db_utils');
const pazientiBackend = require('./backend/pazienti_backend');
const prestazioniBackend = require('./backend/prestazioni_backend');
const agendaBackend = require('./backend/agenda_backend');
const staffBackend = require('./backend/staff_backend');
const contabilitaBackend = require('./backend/contabilita_backend');
const allegatiBackend = require('./backend/allegati_backend');
const statisticheBackend = require('./backend/statistiche_backend');
const rateHandler = require('./backend/rate_handler');
const notificheHandler = require('./backend/notifiche_handler');
const strutturaBackend = require('./backend/struttura_backend');

function registerBackendHandlers(registerApi, app, context) {
    try {
        initDB(context);

        registerApi('pazienti:getAll', pazientiBackend.getAll);
        registerApi('pazienti:getById', pazientiBackend.getById);
        registerApi('pazienti:create', pazientiBackend.create);
        registerApi('pazienti:update', pazientiBackend.update);
        registerApi('pazienti:remove', pazientiBackend.remove);
        registerApi('pazienti:saveAnamnesi', pazientiBackend.saveAnamnesi);
        registerApi('pazienti:saveOdontogrammaDente', pazientiBackend.saveOdontogrammaDente);
        registerApi('pazienti:addTrattamento', pazientiBackend.addTrattamento);
        registerApi('pazienti:deleteTrattamento', pazientiBackend.deleteTrattamento);
        registerApi('pazienti:addPrescrizione', pazientiBackend.addPrescrizione);
        registerApi('pazienti:deletePrescrizione', pazientiBackend.deletePrescrizione);
        registerApi('pazienti:getTrattamenti', pazientiBackend.getTrattamenti);

        registerApi('prestazioni:getAll', prestazioniBackend.getAll);
        registerApi('prestazioni:save', prestazioniBackend.save);
        registerApi('prestazioni:remove', prestazioniBackend.remove);

        registerApi('agenda:getAppuntamenti', agendaBackend.getAppuntamenti);
        registerApi('agenda:saveAppuntamento', agendaBackend.saveAppuntamento);
        registerApi('agenda:deleteAppuntamento', agendaBackend.deleteAppuntamento);

        registerApi('staff:getAll', staffBackend.getAll);
        registerApi('staff:save', staffBackend.save);
        registerApi('staff:remove', staffBackend.remove);
        registerApi('staff:getCurrentUser', staffBackend.getCurrentUser);
        registerApi('staff:calcolaLiquidazione', staffBackend.calcolaLiquidazione);
        registerApi('staff:salvaLiquidazione', staffBackend.salvaLiquidazione);

        registerApi('contabilita:getPreventivi', contabilitaBackend.getPreventivi);
        registerApi('contabilita:savePreventivo', contabilitaBackend.savePreventivo);
        registerApi('contabilita:getIncassi', contabilitaBackend.getIncassi);
        registerApi('contabilita:registraIncasso', contabilitaBackend.registraIncasso);
        registerApi('contabilita:getSpese', contabilitaBackend.getSpese);
        registerApi('contabilita:registraSpesa', contabilitaBackend.registraSpesa);

        registerApi('rate:getPianiByPaziente', rateHandler.getPianiByPaziente);
        registerApi('rate:creaPianoRateale', rateHandler.creaPianoRateale);
        registerApi('rate:saldaRata', rateHandler.saldaRata);
        registerApi('rate:getAllScadenziario', rateHandler.getAllScadenziario);

        registerApi('notifiche:sendManual', notificheHandler.sendManual);
        registerApi('notifiche:getByPaziente', notificheHandler.getByPaziente);

        registerApi('allegati:getAll', allegatiBackend.getAll);
        registerApi('allegati:upload', allegatiBackend.upload);
        registerApi('allegati:remove', allegatiBackend.remove);

        registerApi('statistiche:getKpi', statisticheBackend.getKpi);

        registerApi('struttura:getAll', strutturaBackend.getAll);
        registerApi('struttura:saveSede', strutturaBackend.saveSede);
        registerApi('struttura:removeSede', strutturaBackend.removeSede);
        registerApi('struttura:saveSala', strutturaBackend.saveSala);
        registerApi('struttura:removeSala', strutturaBackend.removeSala);
        registerApi('struttura:savePoltrona', strutturaBackend.savePoltrona);
        registerApi('struttura:removePoltrona', strutturaBackend.removePoltrona);

        return true;
    } catch (e) {
        return false;
    }
}

module.exports = { registerBackendHandlers };
