import { readRawCookies, parseCookieValue, writeCookie } from '../Utils/Cookies.mjs';
import { uuidV4 } from '../Utils/Crypto.mjs';

const DAY = 86400000;

/**
 * Keeps the consent cookie readable by both plugin generations:
 * - forward: a cookie written by plugin 2.9 (wrapper 1.x) is converted before CookieConsent.run(),
 *   so a visitor with a valid consent does not see the widget again after the upgrade,
 * - backward: after every write of plugin 3.x the 2.9 fields are added back,
 *   so a rollback to wrapper 1.6.x does not show the widget again either.
 */
export class CookieMigrator {
    /**
     * @param {{name: string, domain: string, path: string, sameSite: string, expiresAfterDays: number}} cookieOptions
     */
    constructor(cookieOptions) {
        this._options = cookieOptions;
    }

    static isLegacy(value) {
        return !!value && 'object' === typeof value && Array.isArray(value.categories) && !('consentId' in value);
    }

    migrateForward() {
        const value = parseCookieValue(readRawCookies(this._options.name)[0] ?? null);

        if (!CookieMigrator.isLegacy(value)) {
            return false;
        }

        const data = value.data && 'object' === typeof value.data ? value.data : null;
        const consentTimestamp = validDate(value.consent_date) || validDate(data && data.last_action_date) || new Date();
        const lastConsentTimestamp = validDate(value.last_consent_update) || consentTimestamp;
        const services = {};

        value.categories.forEach(category => { services[category] = []; });

        const migrated = this.withLegacyFields({
            categories: value.categories,
            revision: 'number' === typeof value.revision ? value.revision : 0,
            data: data,
            consentTimestamp: consentTimestamp.toISOString(),
            consentId: value.consent_uuid || uuidV4(),
            services: services,
            lastConsentTimestamp: lastConsentTimestamp.toISOString(),
            expirationTime: lastConsentTimestamp.getTime() + this._options.expiresAfterDays * DAY,
        });

        writeCookie(this._options, migrated, new Date(migrated.expirationTime));

        return true;
    }

    /**
     * @param {object|null} cookie the cookie object of plugin 3.x (CookieConsent.getCookie())
     */
    migrateBackward(cookie) {
        if (!cookie || !cookie.consentId || !Array.isArray(cookie.categories)) {
            return false;
        }

        const value = this.withLegacyFields(cookie);
        const expires = cookie.expirationTime
            ? new Date(cookie.expirationTime)
            : new Date(Date.now() + this._options.expiresAfterDays * DAY);

        writeCookie(this._options, value, expires);

        return true;
    }

    withLegacyFields(value) {
        return {
            ...value,
            // fields read by plugin 2.9 (wrapper 1.x); "rfc_cookie" because the value is URI encoded
            level: value.categories,
            consent_uuid: value.consentId,
            consent_date: value.consentTimestamp,
            last_consent_update: value.lastConsentTimestamp || value.consentTimestamp,
            rfc_cookie: true,
        };
    }
}

function validDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return isNaN(date.getTime()) ? null : date;
}
