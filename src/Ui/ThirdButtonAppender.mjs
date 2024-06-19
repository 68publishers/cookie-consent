export class ThirdButtonAppender {
    append(wrapper, document) {
        const consentModalOptions = wrapper._config.consentModalOptions;

        if (!consentModalOptions.show_third_button) {
            return;
        }

        const buttonsContainer = document.getElementById('c-bns');

        if (!buttonsContainer) {
            return;
        }

        const role = 'settings' === consentModalOptions.secondary_button_role ? 'accept_necessary' : 'settings';
        const button = document.createElement('button');

        button.setAttribute('type', 'button');
        button.setAttribute('id', 'c-t-bn');
        button.setAttribute('class', 'c-bn');

        button.innerText = wrapper.translate(
            wrapper.unwrap().getConfig('current_lang'),
            'settings' === role ? 'consent_modal_secondary_btn_settings' : 'consent_modal_secondary_btn_accept_necessary',
        );

        button.addEventListener('click', function (e) {
            const plugin = wrapper.unwrap();

            if ('settings' === role) {
                plugin.showSettings(0);
            } else {
                plugin.hide();
                plugin.accept([]);
            }

            e.preventDefault();
        });

        document.getElementById('c-bns').appendChild(button);
    }
}
