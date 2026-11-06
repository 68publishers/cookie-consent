export function readRawCookies(name) {
    return document.cookie
        .split(/;\s*/)
        .filter(c => c.split('=')[0] === name)
        .map(c => c.substring(c.indexOf('=') + 1));
}

export function parseCookieValue(value) {
    if (null === value || undefined === value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch (e) { // eslint-disable-line no-unused-vars
        try {
            return JSON.parse(decodeURIComponent(value));
        } catch (e) { // eslint-disable-line no-unused-vars
            return null;
        }
    }
}

export function readCookie(name) {
    return parseCookieValue(readRawCookies(name)[0] ?? null);
}

/**
 * Writes the consent cookie the same way as vanilla-cookieconsent v3 (URI encoded JSON).
 */
export function writeCookie({ name, domain, path, sameSite }, value, expires) {
    let cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires.toUTCString()}; Path=${path}; SameSite=${sameSite}`;

    // v3 sets Domain only for hostnames with a dot (it keeps localhost working)
    if (domain && -1 !== window.location.hostname.indexOf('.')) {
        cookie += `; Domain=${domain}`;
    }

    if ('https:' === window.location.protocol) {
        cookie += '; Secure';
    }

    document.cookie = cookie;
}

/**
 * Erases cookies by name or RegExp: the host-only copy and copies on the given domains.
 * (The plugin 3.x erases only domain cookies; Safari keeps a host-only cookie on "localhost"-like hosts.)
 * @param {(string|RegExp)[]} names
 * @param {string} path
 * @param {string[]} domains
 */
export function eraseCookies(names, path = '/', domains = []) {
    const existing = document.cookie.split(/;\s*/).map(c => c.split('=')[0]).filter(Boolean);
    const matched = new Set();

    for (const name of names) {
        if (name instanceof RegExp) {
            existing.filter(n => name.test(n)).forEach(n => matched.add(n));
        } else if (existing.includes(name)) {
            matched.add(name);
        }
    }

    const expires = '; expires=Thu, 01 Jan 1970 00:00:01 GMT';

    for (const name of matched) {
        document.cookie = `${name}=; path=${path}${expires}`;

        for (const domain of domains) {
            document.cookie = `${name}=; path=${path}; domain=${0 === domain.indexOf('.') ? domain : '.' + domain}${expires}`;
        }
    }

    return [...matched];
}
