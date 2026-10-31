/* Browser shim of the GTM sandboxed JavaScript API used by gtm_template.tpl.
 * window.runGtmTemplate(code, data) runs the template code with `require` and `data`.
 * Script URLs of the package (unpkg or package_source) are rewritten to /pkg/ so the tested build is used. */
(function () {
    function toArgs() {
        return arguments;
    }

    function resolvePath(path) {
        var parts = path.split('.');
        var parent = window;
        for (var i = 0; i < parts.length - 1; i++) {
            parent = parent == null ? undefined : parent[parts[i]];
        }
        return { parent: parent, key: parts[parts.length - 1] };
    }

    function rewriteUrl(url) {
        var match = url.match(/\/dist\/(.*)$/);
        // absolute like the real injectScript, the wrapper looks up injected translations by the full src
        return match ? window.location.origin + (window.__GTM_PKG__ || '/pkg/') + match[1] : url;
    }

    window.__gtmLog = [];
    window.__gtmInjected = [];

    var api = {
        logToConsole: function () {
            window.__gtmLog.push(Array.prototype.slice.call(arguments).map(function (a) {
                return typeof a === 'string' ? a : JSON.stringify(a);
            }).join(' '));
        },
        setDefaultConsentState: function (state) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(toArgs('consent', 'default', state));
        },
        createArgumentsQueue: function (fnName, queueName) {
            window[queueName] = window[queueName] || [];
            if (typeof window[fnName] !== 'function') {
                window[fnName] = function () {
                    window[queueName].push(arguments);
                };
            }
            return function () {
                return window[fnName].apply(window, arguments);
            };
        },
        createQueue: function (queueName) {
            window[queueName] = window[queueName] || [];
            return function (value) {
                return window[queueName].push(value);
            };
        },
        queryPermission: function () {
            return true;
        },
        getCookieValues: function (name, decode) {
            return document.cookie.split(/;\s*/).filter(function (c) {
                return c.split('=')[0] === name;
            }).map(function (c) {
                var value = c.substring(c.indexOf('=') + 1);
                return decode === false ? value : decodeURIComponent(value);
            });
        },
        injectScript: function (url, onSuccess, onFailure) {
            var src = rewriteUrl(url);
            window.__gtmInjected.push(src);
            var script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = function () { onSuccess && onSuccess(); };
            script.onerror = function () { onFailure && onFailure(); };
            (document.head || document.documentElement).appendChild(script);
        },
        setInWindow: function (key, value, override) {
            if (override || typeof window[key] === 'undefined') {
                window[key] = value;
                return true;
            }
            return false;
        },
        copyFromWindow: function (path) {
            var ref = resolvePath(path);
            return ref.parent == null ? undefined : ref.parent[ref.key];
        },
        callInWindow: function (path) {
            var ref = resolvePath(path);
            var fn = ref.parent == null ? undefined : ref.parent[ref.key];
            return typeof fn === 'function' ? fn.apply(ref.parent, Array.prototype.slice.call(arguments, 1)) : undefined;
        },
        JSON: {
            parse: function (value) {
                try { return JSON.parse(value); } catch (e) { return undefined; }
            },
            stringify: function (value) {
                return JSON.stringify(value);
            },
        },
        Object: {
            keys: Object.keys,
            values: Object.values,
            entries: Object.entries,
            freeze: Object.freeze,
            delete: function (obj, key) { return delete obj[key]; },
        },
        makeInteger: function (value) {
            var n = Number(value);
            return isNaN(n) ? undefined : Math.trunc(n);
        },
        makeString: function (value) {
            return String(value);
        },
    };

    window.runGtmTemplate = function (code, data) {
        var result = { success: 0, failure: 0 };
        data = Object.assign({}, data, {
            gtmOnSuccess: function () { result.success++; },
            gtmOnFailure: function () { result.failure++; },
        });
        window.__gtmResult = result;
        new Function('require', 'data', code)(function (name) {
            if (!(name in api)) {
                throw new Error('GTM shim: unsupported API ' + name);
            }
            return api[name];
        }, data);
        return result;
    };
})();
