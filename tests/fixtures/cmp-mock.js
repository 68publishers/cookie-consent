/* In-page mock of the CMP API (consent-management-platform, API v1), shapes taken from
 * src/ReadModel/Cookie/CookieApiView.php and src/Api/V1/Controller/*Controller.php.
 * Intercepts fetch() for /api/v1/{consent,consent-settings,cookies}/ on any host, so tests never reach a real CMP.
 * Options: window.__CMP_MOCK__ = { consentSettingsExists: bool, cookies: [...], fail: bool, delay: ms, passthrough: bool }.
 * passthrough: requests go to the real CMP (the URL of the configuration), they and their responses are only recorded.
 * Captured requests: window.__cmpRequests = [{ method, url, path, query, body }]. */
(function () {
    var DEFAULT_COOKIES = [
        { name: 'cc-settings', purpose: 'Stores the cookie consent settings.', processingTime: '1 year', cookieProvider: { code: 'example_project', name: 'Example Project', type: '1st_party', link: 'https://www.example.com/' }, category: { name: 'Necessary', code: 'functionality_storage' } },
        { name: 'PHPSESSID', purpose: 'Session identifier.', processingTime: 'session', cookieProvider: { code: 'example_project', name: 'Example Project', type: '1st_party', link: 'https://www.example.com/' }, category: { name: 'Necessary', code: 'functionality_storage' } },
        { name: '_ga', purpose: 'Distinguishes users.', processingTime: '2 years', cookieProvider: { code: 'google_analytics', name: 'Google Analytics', type: '3rd_party', link: 'https://policies.google.com/privacy' }, category: { name: 'Analytics', code: 'analytics_storage' } },
        { name: '_ga_*', purpose: 'Session state.', processingTime: '2 years', cookieProvider: { code: 'google_analytics', name: 'Google Analytics', type: '3rd_party', link: 'https://policies.google.com/privacy' }, category: { name: 'Analytics', code: 'analytics_storage' } },
        { name: '_gcl_au', purpose: 'Conversion tracking.', processingTime: '90 days', cookieProvider: { code: 'google_ads', name: 'Google Ads', type: '3rd_party', link: 'https://policies.google.com/technologies/ads' }, category: { name: 'Advertising', code: 'ad_storage' } },
        { name: '_fbp', purpose: 'Ad delivery.', processingTime: '90 days', cookieProvider: { code: 'meta', name: 'Meta', type: '3rd_party', link: 'https://www.facebook.com/privacy/policy/' }, category: { name: 'Advertising', code: 'ad_storage' } },
        { name: '__ecdp_id', purpose: 'Content personalization.', processingTime: '1 year', cookieProvider: { code: 'example_cdp', name: 'Example CDP', type: '3rd_party', link: 'https://cdp.example.com/privacy' }, category: { name: 'Personalization', code: 'personalization_storage' } },
    ];

    var API = /\/api\/v(\d+)\/(consent-settings|consent|cookies)\/([^?]*)/;
    var originalFetch = window.fetch.bind(window);

    window.__cmpRequests = [];

    function json(status, body) {
        return new Response(JSON.stringify(body), { status: status, headers: { 'content-type': 'application/json' } });
    }

    window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : input.url;
        var match = url.match(API);

        if (!match) {
            return originalFetch(input, init);
        }

        var options = window.__CMP_MOCK__ || {};
        var method = ((init && init.method) || 'GET').toUpperCase();
        var parsed = new URL(url, window.location.href);
        var body = init && init.body ? JSON.parse(init.body) : null;
        var request = { method: method, url: url, endpoint: match[2], path: match[3], query: Object.fromEntries(parsed.searchParams.entries()), body: body };

        window.__cmpRequests.push(request);

        if (options.passthrough) {
            return originalFetch(input, init).then(function (response) {
                return response.clone().json().then(function (json) {
                    request.status = response.status;
                    request.response = json;
                    return response;
                }, function () {
                    request.status = response.status;
                    return response;
                });
            }, function (error) {
                request.status = 0;
                request.error = String(error);
                throw error;
            });
        }

        var respond = function () {
            if (options.fail) {
                return json(500, { status: 'error', data: { code: 500, error: 'Mocked failure.' } });
            }
            if (match[2] === 'cookies') {
                var cookies = options.cookies || DEFAULT_COOKIES;
                var providers = {};
                cookies.forEach(function (c) {
                    providers[c.cookieProvider.code] = Object.assign({ purpose: '' }, c.cookieProvider);
                });
                return json(200, { status: 'success', data: { providers: Object.values(providers), cookies: cookies } });
            }
            if (match[2] === 'consent') {
                return json(200, { status: 'success', data: { consentSettingsExists: options.consentSettingsExists !== false } });
            }
            return json(200, { status: 'success', data: [] });
        };

        return new Promise(function (resolve) {
            setTimeout(function () { resolve(respond()); }, options.delay || 0);
        });
    };
})();
