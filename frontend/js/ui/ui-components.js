// frontend/js/ui/ui-components.js
// Componentes reutilizables de UI (botones, tarjetas, títulos, etc.)

(function () {
    function el(tag, className = '', children = []) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (!Array.isArray(children)) children = [children];
        for (const child of children) {
            if (child == null) continue;
            if (typeof child === 'string') {
                node.appendChild(document.createTextNode(child));
            } else {
                node.appendChild(child);
            }
        }
        return node;
    }

    function createIconSpan(iconText) {
        const span = el('span', 'ui-icon');
        span.textContent = iconText;
        return span;
    }

    function createButton({ label, icon = null, variant = 'primary', size = 'md', onClick = null, full = false }) {
        const btn = el('button', `ui-btn ui-btn--${variant} ui-btn--${size}${full ? ' ui-btn--full' : ''}`);
        const content = [];

        if (icon) {
            const iconSpan = createIconSpan(icon);
            content.push(iconSpan);
        }

        content.push(el('span', 'ui-btn__label', label));
        content.forEach(c => btn.appendChild(c));

        if (typeof onClick === 'function') {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                onClick(e);
            });
        }

        return btn;
    }

    function createSectionTitle(text, subtitle = '') {
        const container = el('div', 'ui-section-title');
        const h2 = el('h2', 'ui-section-title__main', text);
        container.appendChild(h2);

        if (subtitle) {
            const sub = el('p', 'ui-section-title__subtitle', subtitle);
            container.appendChild(sub);
        }

        return container;
    }

    function createUserBadge(user) {
        const container = el('div', 'ui-user-badge');

        const avatar = el('div', 'ui-user-badge__avatar');
        if (user?.avatar) {
            const img = el('img');
            img.src = user.avatar;
            img.alt = user.name || 'Spotify user';
            avatar.appendChild(img);
        } else {
            const initials = (user?.name || 'SP')
                .split(' ')
                .map(p => p[0]?.toUpperCase())
                .join('')
                .slice(0, 2) || 'SP';
            avatar.textContent = initials;
        }

        const info = el('div', 'ui-user-badge__info');
        const name = el('div', 'ui-user-badge__name', user?.name || 'Invitado');
        const email = el('div', 'ui-user-badge__email', user?.email || 'No conectado');

        info.appendChild(name);
        info.appendChild(email);

        container.appendChild(avatar);
        container.appendChild(info);

        return container;
    }

    function createStatCard({ label, value, sublabel = '', icon = null }) {
        const card = el('div', 'ui-stat-card');

        if (icon) {
            const iconNode = el('div', 'ui-stat-card__icon', createIconSpan(icon));
            card.appendChild(iconNode);
        }

        const valueNode = el('div', 'ui-stat-card__value', String(value ?? '–'));
        const labelNode = el('div', 'ui-stat-card__label', label);

        card.appendChild(valueNode);
        card.appendChild(labelNode);

        if (sublabel) {
            const sub = el('div', 'ui-stat-card__sublabel', sublabel);
            card.appendChild(sub);
        }

        return card;
    }

    function createTrackMiniCard(track, extraInfo = '') {
        const card = el('div', 'ui-track-mini');

        const cover = el('div', 'ui-track-mini__cover');
        const info = el('div', 'ui-track-mini__info');

        if (track?.album?.images && track.album.images[0]?.url) {
            const img = el('img');
            img.src = track.album.images[0].url;
            img.alt = track.name || 'Track cover';
            cover.appendChild(img);
        } else {
            cover.textContent = '♪';
        }

        const title = el('div', 'ui-track-mini__title', track?.name || 'Canción desconocida');
        const artists = (track?.artists || [])
            .map(a => a.name)
            .join(', ') || 'Artista desconocido';

        const subtitle = el('div', 'ui-track-mini__subtitle', artists);

        const extra = el('div', 'ui-track-mini__extra', extraInfo);

        info.appendChild(title);
        info.appendChild(subtitle);
        if (extraInfo) info.appendChild(extra);

        card.appendChild(cover);
        card.appendChild(info);

        return card;
    }

    // Exponer en global
    window.UIComponents = {
        el,
        createIconSpan,
        createButton,
        createSectionTitle,
        createUserBadge,
        createStatCard,
        createTrackMiniCard,
    };
})();
