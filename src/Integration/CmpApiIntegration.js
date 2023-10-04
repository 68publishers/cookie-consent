'use strict';

const integrateConsentApi = function (wrapper, cmpApiOptions) {
    const fetch = window.fetch ? window.fetch : require('whatwg-fetch').fetch;

    const run = (consent) => {
        const user = wrapper.user;
        const configurationExport = wrapper.configurationExport;
        const url = cmpApiOptions.url.replace(new RegExp('\/$'), '');
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

        fetch(`${url}/api/v${cmpApiOptions.version.toString()}/consent/${project}/${user.identity.toString()}`, {
            method: 'put',
            credentials: 'omit',
            body: JSON.stringify({
                settingsChecksum: configurationExport.checksum,
                consents: userConsent,
                attributes: user.attributes,
                environment: cmpApiOptions.environment,
            }),
        }).then(response => {
            return response.json();
        }).then(json => {
            if ('success' !== json.status) {
                return Promise.reject(json);
            }

            if (!json.hasOwnProperty('data') || !json.data.hasOwnProperty('consentSettingsExists') || true === json.data.consentSettingsExists) {
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
        type: (cookie, locale) => wrapper.translate(locale, 'cookie_type_' + cookie.cookieProvider.type),
        link: (cookie) => !cookie.cookieProvider.link.length ? '' : `<a href="${cookie.cookieProvider.link}" target="_blank" class="cc-link">${cookie.cookieProvider.link}</a>`,
        link_find_out_more: (cookie, locale) => !cookie.cookieProvider.link.length ? '' : `
            <a href="${cookie.cookieProvider.link}" target="_blank" class="cc-link">
                ${wrapper.translate(locale, 'find_out_more')}
            </a>
        `,
        category: (cookie) => cookie.category.name,
    };
    const headers = [];

    for (let i in cmpApiOptions.cookie_table_headers) {
        const header = cmpApiOptions.cookie_table_headers[i];

        if (!columnMappers.hasOwnProperty(header)) {
            console.warn(`Cookie header "${header}" is not allowed.`);

            continue;
        }

        headers.push(header);
    }

    if (0 >= headers.length) {
        return;
    }

    const fetch = window.fetch ? window.fetch : require('whatwg-fetch').fetch;
    const fetchedLocales = [];
    const cookieToRow = (cookie, locale) => {
        const row = {};

        for (let i in headers) {
            const header = headers[i];
            const mapper = columnMappers[header] || function () { return ''; };
            row[header] = mapper(cookie, locale);
        }

        return row;
    };

    const run = (loc) => {
        const locale = loc || wrapper.unwrap().getConfig('current_lang');

        if (-1 !== fetchedLocales.indexOf(locale)) {
            return;
        }

        fetchedLocales.push(locale);
        const url = cmpApiOptions.url.replace(new RegExp('\/$'), '');
        const project = cmpApiOptions.resolveProject();
        const queryComponents = [
            `locale=${locale}`,
        ];

        if ('string' === typeof cmpApiOptions.environment) {
            queryComponents.push(`environment=${cmpApiOptions.environment}`);
        }

        fetch(`${url}/api/v${cmpApiOptions.version.toString()}/cookies/${project}?${queryComponents.join('&')}`, {
            method: 'get',
            credentials: 'omit',
        }).then(response => {
            return response.json();
        }).then(json => {
            if ('success' !== json.status) {
                return Promise.reject(json);
            }

            if (!json.hasOwnProperty('data') || !json.data.hasOwnProperty('cookies') || 0 >= json.data.cookies.length) {
                return;
            }

            const cookieTable = wrapper.cookieTables.getCookieTable(locale);

            for (let i in headers) {
                cookieTable.addHeader(headers[i], wrapper.translate(locale, 'cookie_table_col_' + headers[i]));
            }

            for (let i in json.data.cookies) {
                const cookie = json.data.cookies[i];
                cookieTable.addRow(cookie.category.code, cookieToRow(cookie, locale));
            }

            wrapper.cookieTables.appendCookieTables(wrapper.unwrap().getConfig('languages'));
            wrapper.unwrap().updateLanguage(locale, true);
        }).catch((e) => {
            console.warn('Fetching cookies from CMP failed.', e);
        })
    };

    wrapper.on('init', () => run());
    wrapper.on('locale:change', (loc) => run(loc));
}

module.exports = function (wrapper, cmpApiOptions) {
    if (!cmpApiOptions.url || !cmpApiOptions.resolveProject()) {
        return;
    }

    if (true === cmpApiOptions.consent_api_enabled) {
        integrateConsentApi(wrapper, cmpApiOptions);
    }

    if (true === cmpApiOptions.cookies_api_enabled) {
        integrateCookiesApi(wrapper, cmpApiOptions);
    }
};
