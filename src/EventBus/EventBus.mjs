export class EventBus {
    constructor() {
        this._generator = (() => {
            let lastId = 0;

            return {
                getNextIdentifier: function () {
                    return lastId++;
                },
            }
        })();

        this._listeners = {};
    }

    subscribe(event, callback, scope = null) {
        if (typeof callback !== 'function') {
            throw new TypeError('Listener must be of type function.');
        }

        const id = 'idx_' + this._generator.getNextIdentifier();

        this._listeners[event] = this._listeners[event] || {};
        this._listeners[event][id] = {
            callback: callback,
            scope: scope,
        };

        return function () {
            if (event in this._listeners && id in this._listeners[event]) {
                delete this._listeners[event][id];
            }
        };
    }

    dispatch(event, ...args) {
        const listeners = this._listeners[event] || {};
        let listenerId;
        let listener;

        for (listenerId in listeners) {
            listener = listeners[listenerId];

            listener.callback.call(listener.scope, ...args);
        }
    }
}
