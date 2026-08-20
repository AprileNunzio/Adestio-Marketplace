'use strict';

const ErrorCode = {
    VALIDATION: 'VALIDATION',
    NOT_FOUND: 'NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN',
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    CONFLICT: 'CONFLICT',
    STORAGE: 'STORAGE',
    UNEXPECTED: 'UNEXPECTED'
};

class DomainError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'DomainError';
        this.code = code;
    }
}

function validationError(message) {
    return new DomainError(ErrorCode.VALIDATION, message);
}

function notFoundError(message) {
    return new DomainError(ErrorCode.NOT_FOUND, message);
}

function forbiddenError(message) {
    return new DomainError(ErrorCode.FORBIDDEN, message);
}

function unauthenticatedError(message) {
    return new DomainError(ErrorCode.UNAUTHENTICATED, message);
}

function conflictError(message) {
    return new DomainError(ErrorCode.CONFLICT, message);
}

function storageError(message) {
    return new DomainError(ErrorCode.STORAGE, message);
}

function codeOf(error) {
    return error && error.code ? error.code : ErrorCode.UNEXPECTED;
}

module.exports = {
    ErrorCode,
    DomainError,
    validationError,
    notFoundError,
    forbiddenError,
    unauthenticatedError,
    conflictError,
    storageError,
    codeOf
};
