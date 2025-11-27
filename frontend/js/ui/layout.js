// frontend/js/ui/layout.js
// Estructura general del dashboard: sidebar, header, main, visualizer canvas, etc.

(function () {
    const { el, createButton, createUserBadge, createSectionTitle, createStatCard, createTrackMiniCard } =
        window.UIComponents || {};
    const Anim = window.UIAnimations || {};

    if (!el) {
        console.error('UIComponents no está cargado antes de LayoutManager');
    }

    class LayoutManager {
        constructor(rootId = 'app') {
            this.root = document.getElementById(rootId);
            if (!this.root) {
                throw new Error(`No se encontró el elemento root con id="${rootId}"`);
            }

            this.currentUser = null;

            this.loginHandler = null;
            this.logoutHandler = null;

            this._buildShell();
            this._wireBasicEvents();
        }

        _buildShell() {
            this.root.classList.add('app-root');

            // Shell principal
            const shell = el('div', 'app-shell');

            // Sidebar
            this.sidebar = el('aside', 'app-sidebar');

            const logo = el('div', 'app-logo', [
                el('div', 'app-logo__icon', '♫'),
                el('div', 'app-logo__text', [
                    el('span', 'app-logo__title', 'Music Visualizer'),
                    el('span', 'app-logo__subtitle', 'Powered by Spotify')
                ])
            ]);

            this.userBadgeContainer = el('div', 'app-sidebar__user');
            this.userBadgeContainer.appendChild(createUserBadge(null));

            this.loginButton = createButton({
                label: 'Conectar con Spotify',
                icon: '▶',
                variant: 'primary',
                size: 'md',
                full: true,
                onClick: () => this._onLoginClick()
            });

            this.logoutButton = createButton({
                label: 'Cerrar sesión',
                icon: '⏏',
                variant: 'ghost',
                size: 'sm',
                full: true,
                onClick: () => this._onLogoutClick()
            });
            this.logoutButton.style.display = 'none';

            const nav = el('nav', 'app-sidebar__nav', [
                createSectionTitle('Panel', 'Tu universo musical'),
                el('div', 'app-sidebar__nav-buttons', [
                    createButton({
                        label: 'Visualizer',
                        icon: '🔊',
                        variant: 'ghost',
                        size: 'sm',
                        onClick: () => this._scrollToSection('visualizer-section')
                    }),
                    createButton({
                        label: 'Top Tracks',
                        icon: '⭐',
                        variant: 'ghost',
                        size: 'sm',
                        onClick: () => this._scrollToSection('top-tracks-section')
                    }),
                    createButton({
                        label: 'Estadísticas',
                        icon: '📊',
                        variant: 'ghost',
                        size: 'sm',
                        onClick: () => this._scrollToSection('stats-section')
                    })
                ])
            ]);

            const sidebarFooter = el('div', 'app-sidebar__footer', [
                this.loginButton,
                this.logoutButton,
                el('p', 'app-sidebar__note', 'Tu música, tus colores, en tiempo real.')
            ]);

            this.sidebar.appendChild(logo);
            this.sidebar.appendChild(this.userBadgeContainer);
            this.sidebar.appendChild(nav);
            this.sidebar.appendChild(sidebarFooter);

            // Main content
            this.main = el('main', 'app-main');

            // Header
            this.header = el('header', 'app-main__header', [
                el('div', 'app-main__header-text', [
                    el('h1', 'app-main__title', 'Spotify Visualizer'),
                    el('p', 'app-main__subtitle', 'Sincroniza tus canciones con un universo visual.')
                ]),
                this._buildHeaderUserArea()
            ]);

            // Sección Now Playing + Stats
            this.nowPlayingSection = el('section', 'app-section app-section--nowplaying');
            this.nowPlayingSection.id = 'now-playing-section';

            const nowPlayingHeader = createSectionTitle('Reproduciendo ahora', 'Lo que suena en tu Spotify');
            this.nowPlayingCard = el('div', 'now-playing-card');

            // Estructura interna de now playing
            this.nowPlayingCover = el('div', 'now-playing-card__cover');
            this.nowPlayingInfo = el('div', 'now-playing-card__info');
            this.nowPlayingMeta = el('div', 'now-playing-card__meta');

            this.nowPlayingInfo.appendChild(el('h3', 'now-playing-card__title', 'Nada sonando'));
            this.nowPlayingInfo.appendChild(el('p', 'now-playing-card__artist', 'Conéctate con Spotify para empezar'));

            this.nowPlayingMeta.appendChild(el('div', 'now-playing-card__meta-item', 'Energy: –'));
            this.nowPlayingMeta.appendChild(el('div', 'now-playing-card__meta-item', 'Tempo: –'));
            this.nowPlayingMeta.appendChild(el('div', 'now-playing-card__meta-item', 'Danceability: –'));

            this.nowPlayingCard.appendChild(this.nowPlayingCover);
            this.nowPlayingCard.appendChild(this.nowPlayingInfo);
            this.nowPlayingCard.appendChild(this.nowPlayingMeta);

            this.nowPlayingSection.appendChild(nowPlayingHeader);
            this.nowPlayingSection.appendChild(this.nowPlayingCard);

            // Sección Visualizer (canvas)
            this.visualizerSection = el('section', 'app-section app-section--visualizer');
            this.visualizerSection.id = 'visualizer-section';

            const visualizerHeader = createSectionTitle(
                'Visualizer',
                'Partículas, ondas y barras sincronizadas con tu música'
            );

            this.visualizerCanvasContainer = el('div', 'visualizer-container');
            this.visualizerCanvas = el('canvas', 'visualizer-canvas');
            this.visualizerCanvas.id = 'visualizer-canvas';

            this.visualizerCanvasContainer.appendChild(this.visualizerCanvas);

            this.visualizerSection.appendChild(visualizerHeader);
            this.visualizerSection.appendChild(this.visualizerCanvasContainer);

            // Sección Top Tracks + Recientes
            this.topTracksSection = el('section', 'app-section app-section--toptracks');
            this.topTracksSection.id = 'top-tracks-section';

            const topHeader = createSectionTitle('Tus top tracks', 'Lo que más has escuchado');
            this.topTracksList = el('div', 'top-tracks-list');

            const recentHeader = createSectionTitle('Escuchado recientemente', 'Últimas rolas que han sonado');
            this.recentTracksList = el('div', 'recent-tracks-list');

            this.topTracksSection.appendChild(topHeader);
            this.topTracksSection.appendChild(this.topTracksList);
            this.topTracksSection.appendChild(recentHeader);
            this.topTracksSection.appendChild(this.recentTracksList);

            // Sección Stats
            this.statsSection = el('section', 'app-section app-section--stats');
            this.statsSection.id = 'stats-section';

            const statsHeader = createSectionTitle('Estadísticas rápidas', 'Un vistazo a tu perfil musical');
            this.statsGrid = el('div', 'stats-grid');

            // Stats vacías iniciales
            this.statsGrid.appendChild(createStatCard({
                label: 'Tracks reproducidos',
                value: '–',
                sublabel: 'En este período',
                icon: '🎵'
            }));
            this.statsGrid.appendChild(createStatCard({
                label: 'Artistas únicos',
                value: '–',
                sublabel: 'Que te acompañan',
                icon: '👤'
            }));
            this.statsGrid.appendChild(createStatCard({
                label: 'Energia promedio',
                value: '–',
                sublabel: 'Para tus visuales',
                icon: '⚡'
            }));

            this.statsSection.appendChild(statsHeader);
            this.statsSection.appendChild(this.statsGrid);

            // Montar todo
            this.main.appendChild(this.header);
            this.main.appendChild(this.nowPlayingSection);
            this.main.appendChild(this.visualizerSection);
            this.main.appendChild(this.topTracksSection);
            this.main.appendChild(this.statsSection);

            shell.appendChild(this.sidebar);
            shell.appendChild(this.main);

            this.root.appendChild(shell);

            // Avisar que el canvas está listo para que visualizer.js pueda engancharse
            window.dispatchEvent(new CustomEvent('layout:canvas-ready', {
                detail: { canvas: this.visualizerCanvas }
            }));

            // Animar fondo inicial
            if (Anim?.applyBackgroundGradient) {
                Anim.applyBackgroundGradient(this.root, '#0f172a', '#22c55e');
            }
        }

        _buildHeaderUserArea() {
            this.headerUserArea = el('div', 'app-main__header-user');

            this.headerUserAvatar = el('div', 'header-user__avatar', '🙂');
            this.headerUserName = el('div', 'header-user__name', 'No conectado');
            this.headerUserTag = el('div', 'header-user__tag', '@spotify');

            this.headerUserArea.appendChild(this.headerUserAvatar);
            this.headerUserArea.appendChild(this.headerUserName);
            this.headerUserArea.appendChild(this.headerUserTag);

            return this.headerUserArea;
        }

        _wireBasicEvents() {
            if (Anim?.addHoverGlow) {
                Anim.addHoverGlow(this.nowPlayingCard);
                Anim.addHoverGlow(this.visualizerCanvasContainer);
            }

            // Escuchar eventos de autenticación globales (del AuthManager)
            window.addEventListener('auth:login', (e) => {
                const { user } = e.detail || {};
                if (user) this.setUser(user);
                this.setLoggedInState(true);
            });

            window.addEventListener('auth:session-restored', () => {
                this.setLoggedInState(true);
            });

            window.addEventListener('auth:user-profile', (e) => {
                const { user } = e.detail || {};
                if (user) this.setUser(user);
            });

            window.addEventListener('auth:logout', () => {
                this.setLoggedInState(false);
                this.setUser(null);
                this._setNowPlayingEmpty();
            });

            // Evento opcional desde visualizer.js para actualizar fondo según colores del álbum
            window.addEventListener('visualizer:album-colors', (e) => {
                const { dominantHex, secondaryHex } = e.detail || {};
                if (Anim?.applyBackgroundGradient && dominantHex) {
                    Anim.applyBackgroundGradient(this.root, dominantHex, secondaryHex || '#22c55e');
                }
            });
        }

        _onLoginClick() {
            if (typeof this.loginHandler === 'function') {
                this.loginHandler();
            } else {
                console.warn('No hay loginHandler asignado en LayoutManager');
            }
        }

        _onLogoutClick() {
            if (typeof this.logoutHandler === 'function') {
                this.logoutHandler();
            } else {
                console.warn('No hay logoutHandler asignado en LayoutManager');
            }
        }

        _scrollToSection(sectionId) {
            const section = document.getElementById(sectionId);
            if (!section) return;
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // =============== API pública para app.js =================

        setLoginHandler(fn) {
            this.loginHandler = fn;
        }

        setLogoutHandler(fn) {
            this.logoutHandler = fn;
        }

        setUser(user) {
            this.currentUser = user;

            // Sidebar badge
            this.userBadgeContainer.innerHTML = '';
            this.userBadgeContainer.appendChild(createUserBadge(user));

            // Header mini user
            if (user) {
                const initials = user.name
                    .split(' ')
                    .map(p => p[0]?.toUpperCase())
                    .join('')
                    .slice(0, 2) || 'SP';

                this.headerUserAvatar.textContent = initials;
                this.headerUserName.textContent = user.name || 'Usuario Spotify';
                this.headerUserTag.textContent = user.email || '@spotify';
            } else {
                this.headerUserAvatar.textContent = '🙂';
                this.headerUserName.textContent = 'No conectado';
                this.headerUserTag.textContent = '@spotify';
            }
        }

        setLoggedInState(isLoggedIn) {
            if (isLoggedIn) {
                this.loginButton.style.display = 'none';
                this.logoutButton.style.display = 'block';
            } else {
                this.loginButton.style.display = 'block';
                this.logoutButton.style.display = 'none';
            }
        }

        updateNowPlaying(trackData) {
            if (!trackData || !trackData.item) {
                this._setNowPlayingEmpty();
                return;
            }

            const item = trackData.item;
            const features = trackData.audio_features || {};
            const coverUrl = item.album?.images?.[0]?.url || null;
            const trackName = item.name || 'Sin título';
            const artists = (item.artists || []).map(a => a.name).join(', ') || 'Artista desconocido';

            // Portada
            this.nowPlayingCover.innerHTML = '';
            if (coverUrl) {
                const img = el('img');
                img.src = coverUrl;
                img.alt = trackName;
                this.nowPlayingCover.appendChild(img);
            } else {
                this.nowPlayingCover.textContent = '♪';
            }

            // Info principal
            this.nowPlayingInfo.innerHTML = '';
            this.nowPlayingInfo.appendChild(el('h3', 'now-playing-card__title', trackName));
            this.nowPlayingInfo.appendChild(el('p', 'now-playing-card__artist', artists));

            // Meta
            this.nowPlayingMeta.innerHTML = '';
            this.nowPlayingMeta.appendChild(
                el('div', 'now-playing-card__meta-item', `Energy: ${(features.energy ?? 0).toFixed(2)}`)
            );
            this.nowPlayingMeta.appendChild(
                el('div', 'now-playing-card__meta-item', `Tempo: ${(features.tempo ?? 0).toFixed(0)} BPM`)
            );
            this.nowPlayingMeta.appendChild(
                el('div', 'now-playing-card__meta-item', `Danceability: ${(features.danceability ?? 0).toFixed(2)}`)
            );

            if (Anim?.pulseOnUpdate) {
                Anim.pulseOnUpdate(this.nowPlayingCard);
            }

            // Notificar al resto de la app (por ejemplo visualizer.js) que hay track nuevo
            window.dispatchEvent(new CustomEvent('layout:now-playing-updated', {
                detail: { trackData }
            }));
        }

        _setNowPlayingEmpty() {
            this.nowPlayingCover.innerHTML = '♪';
            this.nowPlayingInfo.innerHTML = '';
            this.nowPlayingInfo.appendChild(el('h3', 'now-playing-card__title', 'Nada sonando'));
            this.nowPlayingInfo.appendChild(el('p', 'now-playing-card__artist', 'Reproduce algo en Spotify 🟢'));
            this.nowPlayingMeta.innerHTML = '';
            this.nowPlayingMeta.appendChild(el('div', 'now-playing-card__meta-item', 'Energy: –'));
            this.nowPlayingMeta.appendChild(el('div', 'now-playing-card__meta-item', 'Tempo: –'));
            this.nowPlayingMeta.appendChild(el('div', 'now-playing-card__meta-item', 'Danceability: –'));
        }

        updateStats(stats) {
            if (!stats) return;
            this.statsGrid.innerHTML = '';

            const totalTracks = stats.total_tracks_played ?? '–';
            const totalArtists = stats.total_artists ?? '–';
            const energy = stats.audio_features?.avg_energy ?? null;
            const tempo = stats.audio_features?.avg_tempo ?? null;
            const dance = stats.audio_features?.avg_danceability ?? null;

            this.statsGrid.appendChild(createStatCard({
                label: 'Tracks reproducidos',
                value: totalTracks,
                sublabel: 'En el período analizado',
                icon: '🎵'
            }));

            this.statsGrid.appendChild(createStatCard({
                label: 'Artistas únicos',
                value: totalArtists,
                sublabel: 'Diversidad de tu mezcla',
                icon: '👤'
            }));

            const energyStr = energy != null ? energy.toFixed(2) : '–';
            const danceStr = dance != null ? dance.toFixed(2) : '–';
            const tempoStr = tempo != null ? `${tempo.toFixed(0)} BPM` : '–';

            this.statsGrid.appendChild(createStatCard({
                label: 'Perfil de energía',
                value: energyStr,
                sublabel: `Tempo medio: ${tempoStr} · Dance: ${danceStr}`,
                icon: '⚡'
            }));
        }

        updateTopTracks(tracksData) {
            this.topTracksList.innerHTML = '';

            const items = tracksData?.items || [];
            if (!items.length) {
                this.topTracksList.appendChild(
                    el('p', 'ui-empty-message', 'No se pudieron cargar tus top tracks todavía.')
                );
                return;
            }

            items.forEach((track, idx) => {
                const extra = `#${idx + 1}`;
                const card = createTrackMiniCard(track, extra);
                this.topTracksList.appendChild(card);
            });
        }

        updateRecentTracks(recentData) {
            this.recentTracksList.innerHTML = '';

            const items = recentData?.items || [];
            if (!items.length) {
                this.recentTracksList.appendChild(
                    el('p', 'ui-empty-message', 'Aún no hay historial reciente disponible.')
                );
                return;
            }

            items.forEach((entry) => {
                const track = entry.track || entry; // por si ya viene normalizado
                const playedAt = entry.played_at ? new Date(entry.played_at) : null;
                const extra = playedAt
                    ? `Reproducida: ${playedAt.toLocaleString()}`
                    : '';

                const card = createTrackMiniCard(track, extra);
                this.recentTracksList.appendChild(card);
            });
        }
    }

    window.LayoutManager = LayoutManager;
})();
