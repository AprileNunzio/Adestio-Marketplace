'use strict';

function toCents(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric * 100);
}

function fromCents(cents) {
    return Math.round(cents) / 100;
}

function round(value) {
    return fromCents(toCents(value));
}

function sum(values) {
    return fromCents(values.reduce((total, value) => total + toCents(value), 0));
}

function percentOf(value, percentage) {
    const base = toCents(value);
    const rate = Number(percentage);
    if (!Number.isFinite(rate)) return 0;
    return fromCents(Math.round((base * rate) / 100));
}

function subtractPercent(value, percentage) {
    return round(round(value) - percentOf(value, percentage));
}

function splitEvenly(total, parts) {
    const count = Math.max(1, Math.trunc(parts));
    const totalCents = toCents(total);
    const base = Math.floor(totalCents / count);
    const remainder = totalCents - base * count;
    return Array.from({ length: count }, (unused, index) =>
        fromCents(index === count - 1 ? base + remainder : base)
    );
}

module.exports = { toCents, fromCents, round, sum, percentOf, subtractPercent, splitEvenly };
