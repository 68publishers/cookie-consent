import { readRawCookies } from './Cookies.mjs';

/**
 * A consent cookie on another domain (e.g. "www.example.com" next to ".example.com" after a change of the cookie domain)
 * shadows the valid one and the widget keeps showing. Copies outside the configured domain are removed.
 * Clients solved it by a custom tag calling eraseCookies() with a fixed domain.
 * Only copies on the configured path are removed: a copy on another path keeps shadowing the valid cookie
 * (document.cookie does not tell the path, the paths of the current URL would have to be tried one by one).
 */
export function removeDuplicatedCookies({ name, domain, path }) {
    if (1 >= readRawCookies(name).length) {
        return false;
    }

    const hostname = window.location.hostname;
    const keep = (domain || hostname).replace(/^\./, '');
    const parts = hostname.split('.');
    const expired = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path || '/'}`;

    // host-only copy (the plugin writes a host-only cookie only on hosts without a dot, e.g. localhost)
    if (-1 !== hostname.indexOf('.')) {
        document.cookie = expired;
    }

    // copies on the host and its parent domains, except the configured one
    for (let i = 0; i < parts.length - 1; i++) {
        const candidate = parts.slice(i).join('.');

        if (candidate !== keep) {
            document.cookie = `${expired}; Domain=${candidate}`;
        }
    }

    return true;
}
