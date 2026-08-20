'use strict';

const session = require('./session');

function currentActorId() {
    return session.currentUserId() || '';
}

function stamp() {
    return { autore_id: currentActorId() };
}

module.exports = { currentActorId, stamp };
