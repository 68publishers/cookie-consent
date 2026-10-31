/* Emulates GTM "Click - All Elements" triggers: on every click, {{Click ID}} is the id of the clicked
 * element (gtm.element = event.target) and filters are evaluated like GTM does (EQUALS, CONTAINS, MATCH_REGEX).
 * Input: window.__CLICK_TRIGGERS__ = { name: [{ type, arg0, arg1 }] }, window.__GTM_VARIABLES__ = { name: () => value }.
 * Output: window.__firedTriggers = [name, ...]. */
(function () {
    window.__firedTriggers = [];
    window.__clickIds = [];

    function resolve(template, element) {
        return template.replace(/\{\{([^}]+)\}\}/g, function (m, name) {
            if (name === 'Click ID') {
                return element.id || '';
            }
            var fn = (window.__GTM_VARIABLES__ || {})[name];
            if (!fn) {
                throw new Error('Unknown GTM variable ' + name);
            }
            var value;
            try { value = fn(); } catch (e) { value = undefined; }
            return String(value);
        });
    }

    function matches(filter, element) {
        var value = resolve(filter.arg0, element);
        switch (filter.type) {
            case 'EQUALS': return value === filter.arg1;
            case 'CONTAINS': return value.indexOf(filter.arg1) !== -1;
            case 'MATCH_REGEX': return new RegExp(filter.arg1).test(value);
            default: throw new Error('Unsupported filter ' + filter.type);
        }
    }

    document.addEventListener('click', function (event) {
        var element = event.target;
        window.__clickIds.push(element.id || '');
        var triggers = window.__CLICK_TRIGGERS__ || {};
        Object.keys(triggers).forEach(function (name) {
            if (triggers[name].every(function (f) { return matches(f, element); })) {
                window.__firedTriggers.push(name);
            }
        });
    }, false);
})();
