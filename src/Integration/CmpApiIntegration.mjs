import { Events } from '../EventBus/Events.mjs';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const integrateConsentApi = function (wrapper, cmpApiOptions) {
    const run = async (consent) => {
        const user = wrapper.user;
        let configurationExport;

        try {
            configurationExport = await wrapper.configurationExport;
        } catch (e) {
            // http:// page: no WebCrypto for the checksum
            console.warn('CookieConsentWrapper: the consent is not sent into the CMP.', e);
            wrapper._eventBus.dispatch(Events.ON_CMP_CONSENT_NOT_SENT, e);

            return;
        }
        const url = cmpApiOptions.url.replace(new RegExp('/$'), '');
        const project = cmpApiOptions.resolveProject();
        const userConsent = {};

        for (let storageName in consent) {
            if (!wrapper._storagePool.has(storageName)) {
                continue;
            }

            const storage = wrapper._storagePool.get(storageName);

            if (storage.enabledByDefault || storage.displayInWidget || storage.syncConsentWith) {
                userConsent[storageName] = 'granted' === consent[storageName];
            }
        }

        const attributes = {};

        Object.keys(user.attributes).forEach(key => {
            const value = user.attributes[key];
            attributes[key] = 'function' === typeof value ? value() : value;
        });

        const body = {
            settingsChecksum: configurationExport.checksum,
            consents: userConsent,
            attributes: attributes,
            environment: cmpApiOptions.environment,
        };

        // "services" preferences mode: accepted services (providers) by category, normalized (CMP 1.3+, ignored by older versions)
        if (wrapper.servicesMode) {
            body.services = wrapper.acceptedServices;
        }

        fetch(`${url}/api/v${cmpApiOptions.version.toString()}/consent/${project}/${user.identity.toString()}`, {
            method: 'put',
            credentials: 'omit',
            body: JSON.stringify(body),
        }).then(response => {
            return response.json();
        }).then(json => {
            if ('success' !== json.status) {
                return Promise.reject(json);
            }

            if (!('data' in json) || !('consentSettingsExists' in json.data) || true === json.data.consentSettingsExists) {
                return;
            }

            fetch(`${url}/api/v${cmpApiOptions.version.toString()}/consent-settings/${project}/${configurationExport.checksum}`, {
                method: 'put',
                body: JSON.stringify(configurationExport.configuration),
            }).then((response => {
                return response.json().then(json => {
                    return 'success' === json.status ? Promise.resolve(json) : Promise.reject(json);
                })
            })).catch((e) => {
                console.warn('Sending consent settings into CMP failed.', e);
            });

        }).catch((e) => {
            console.warn('Sending consent into CMP failed.', e);
            wrapper._eventBus.dispatch(Events.ON_CMP_CONSENT_NOT_SENT, e);
        })
    };

    wrapper.on('consent:first-action', (consent) => run(consent));
    wrapper.on('consent:changed', (consent) => run(consent));
};

const integrateCookiesApi = function (wrapper, cmpApiOptions) {
    const columnMappers = {
        name: (cookie) => cookie.name,
        purpose: (cookie) => cookie.purpose,
        processing_time: (cookie, locale) => {
            let type = cookie.processingTime;

            if ('session' === type || 'persistent' === type) {
                type = wrapper.translate(locale, 'processing_time_' + type);
            }

            return type;
        },
        provider: (cookie) => cookie.cookieProvider.name,
        type: (cookie, locale) => cookie.cookieProvider.type ? wrapper.translate(locale, 'cookie_type_' + cookie.cookieProvider.type) : '',
        link: (cookie) => !cookie.cookieProvider.link.length ? '' : `<a href="${cookie.cookieProvider.link}" target="_blank" class="cc-link">${cookie.cookieProvider.link}</a>`,
        link_find_out_more: (cookie, locale) => !cookie.cookieProvider.link.length ? '' : `
            <a href="${cookie.cookieProvider.link}" target="_blank" class="cc-link">
                ${wrapper.translate(locale, 'find_out_more')}
            </a>
        `,
        category: (cookie) => cookie.category.name,
    };
    const headers = [];

    for (let i = 0; i < cmpApiOptions.cookie_table_headers.length; i++) {
        const header = cmpApiOptions.cookie_table_headers[i];

        if (!(header in columnMappers)) {
            console.warn(`Cookie header "${header}" is not allowed.`);

            continue;
        }

        headers.push(header);
    }

    // providers of the CMP by storage (category code) and provider code, for the "services" preferences mode
    const services = {};
    const fetched = {};
    const cookieToRow = (cookie, locale) => {
        const row = { _provider: cookie.cookieProvider.code };

        if (cookie.name.includes('*')) {
            row._name = '^' + cookie.name.split('*').map(escapeRegExp).join('.+') + '$';
            row.is_regex = true;
        } else {
            row._name = cookie.name;
        }

        for (let i in headers) {
            const header = headers[i];
            const mapper = columnMappers[header] || function () { return ''; };
            row[header] = mapper(cookie, locale);
        }

        return row;
    };

    /**
     * Fetches the cookies of the locale once, fills the cookie table and the providers.
     * @returns {Promise<boolean>} true if new cookies were loaded
     */
    const fetchCookies = (locale) => {
        if (locale in fetched) {
            return fetched[locale];
        }

        const url = cmpApiOptions.url.replace(new RegExp('/$'), '');
        const project = cmpApiOptions.resolveProject();
        const queryComponents = [
            `locale=${locale}`,
        ];

        if ('string' === typeof cmpApiOptions.environment) {
            queryComponents.push(`environment=${cmpApiOptions.environment}`);
        }

        const request = fetch(`${url}/api/v${cmpApiOptions.version.toString()}/cookies/${project}?${queryComponents.join('&')}`, {
            method: 'get',
            credentials: 'omit',
        });

        return fetched[locale] = Promise.all([request, wrapper.loadLocale(locale)]).then(([response]) => {
            return response.json();
        }).then(json => {
            if ('success' !== json.status) {
                return Promise.reject(json);
            }

            if (!('data' in json) || !('cookies' in json.data) || 0 >= json.data.cookies.length) {
                return false;
            }

            for (const cookie of json.data.cookies) {
                const category = cookie.category.code;
                // a cookie without a provider keeps its row with empty provider columns and is not a service
                const provider = cookie.cookieProvider = cookie.cookieProvider || { name: '', type: '', link: '' };

                if (provider.code) {
                    services[category] = services[category] || {};
                    services[category][provider.code] = services[category][provider.code] || { name: provider.name, link: provider.link };
                }
            }

            if (0 >= headers.length) {
                return false;
            }

            const cookieTable = wrapper.cookieTables.getCookieTable(locale);

            cookieTable.addHeader('_name', '_name');

            for (let i = 0; i < headers.length; i++) {
                cookieTable.addHeader(headers[i], wrapper.translate(locale, 'cookie_table_col_' + headers[i]));
            }

            for (let i = 0; i < json.data.cookies.length; i++) {
                const cookie = json.data.cookies[i];
                cookieTable.addRow(cookie.category.code, cookieToRow(cookie, locale));
            }

            return true;
        }).catch((e) => {
            console.warn('Fetching cookies from CMP failed.', e);

            return false;
        });
    };

    const run = (loc) => {
        const locale = loc || wrapper.currentLocale;
        const alreadyRendered = locale in fetched;

        fetchCookies(locale).then((loaded) => {
            // a prefetched table is already part of the first rendering
            loaded && !alreadyRendered && wrapper.refreshTranslations(locale);
        });
    };

    wrapper.on('init', () => run());
    wrapper.on('locale:change', (loc) => run(loc));

    return {
        services,
        prefetch: (locale) => fetchCookies(locale),
    };
}

/**
 * @returns {{services: object, prefetch: function(string): Promise<boolean>}|null} the cookies API, if enabled
 */
export function integrateCmpApi(wrapper, cmpApiOptions) {
    if (!cmpApiOptions.url || !cmpApiOptions.resolveProject()) {
        return null;
    }

    if (true === cmpApiOptions.consent_api_enabled) {
        integrateConsentApi(wrapper, cmpApiOptions);
    }

    if (true === cmpApiOptions.cookies_api_enabled) {
        return integrateCookiesApi(wrapper, cmpApiOptions);
    }

    return null;
}
