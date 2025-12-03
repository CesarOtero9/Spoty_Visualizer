// js/ui/ui-components.js
(function () {

    const UIComponents = {
        createButton({ label, icon, classes = [], attrs = {} }) {
            const btn = document.createElement('button');
            btn.className = ['ui-btn', ...classes].join(' ');
            const spanLabel = document.createElement('span');
            spanLabel.className = 'ui-btn__label';
            spanLabel.textContent = label;
            btn.appendChild(spanLabel);

            if (icon) {
                const spanIcon = document.createElement('span');
                spanIcon.className = 'ui-icon';
                spanIcon.textContent = icon;
                btn.appendChild(spanIcon);
            }

            Object.entries(attrs).forEach(([k, v]) => btn.setAttribute(k, v));
            return btn;
        },

        createSectionTitle(main, subtitle) {
            const root = document.createElement('div');
            root.className = 'ui-section-title';

            const mainEl = document.createElement('div');
            mainEl.className = 'ui-section-title__main';
            mainEl.textContent = main;

            const subEl = document.createElement('div');
            subEl.className = 'ui-section-title__subtitle';
            subEl.textContent = subtitle;

            root.appendChild(mainEl);
            root.appendChild(subEl);
            return root;
        }
    };

    window.UIComponents = UIComponents;
})();
