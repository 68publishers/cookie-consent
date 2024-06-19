export class AbstractOptions {
    merge(options) {
        let property;

        for (property in options) {
            if (this.hasOwnProperty(property)) {
                this[property] = options[property];
            }
        }
    }
}
