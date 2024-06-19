export class AbstractOptions {
    merge(options) {
        let property;

        for (property in options) {
            if (property in this) {
                this[property] = options[property];
            }
        }
    }
}
