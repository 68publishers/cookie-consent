'use strict';

module.exports = function (wrapper, cmpApiOptions) {
    if (!cmpApiOptions.enabled || !cmpApiOptions.url || !cmpApiOptions.project) {
        return;
    }

    const fetch = window.fetch ? window.fetch : require('whatwg-fetch').fetch;

    const run = (consent) => {
        const user = wrapper.user;
        const configurationExport = wrapper.configurationExport;
        const url = cmpApiOptions.url.replace(new RegExp('\/$'), '');

        for (let storageName in consent) {
            consent[storageName] = 'granted' === consent[storageName];
        }

        fetch(`${url}/api/v${cmpApiOptions.version.toString()}/consent/${cmpApiOptions.project}/${user.identity.toString()}`, {
            method: 'put',
            body: JSON.stringify({
                settingsChecksum: configurationExport.checksum,
                consents: consent,
                attributes: user.attributes,
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

            fetch(`${url}/api/v${cmpApiOptions.version.toString()}/consent-settings/${cmpApiOptions.project}/${configurationExport.checksum}`, {
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
