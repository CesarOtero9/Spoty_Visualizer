// frontend/js/ui/layout.js
// =============================
// LayoutManager.js
// Control del DOM principal
// =============================

(function (window, document) {
    "use strict";

    class LayoutManager {
        constructor() {
            console.log("🎨 LayoutManager inicializado");

            // Elementos clave del DOM (ids que ya tienes en tu HTML)
            this.canvasContainer = document.getElementById("visualizerContainer");
            this.topArtistsContainer = document.getElementById("top-artists-list");
            this.topTracksContainer = document.getElementById("top-tracks-list");
            this.recentTracksContainer = document.getElementById("recent-tracks-list");
            this.profileName = document.getElementById("profile-name");
            this.profileImage = document.getElementById("profile-image");

            // Sistema simple de eventos internos (canvas-ready, theme-change, etc.)
            this.eventHandlers = {};
        }

        // =====================================================
        // COMPATIBILIDAD CON app.js (renderInitialLayout)
        // =====================================================

        /**
         * Tu app.js la llama al inicio.
         * Aquí puedes hacer cualquier setup inicial de layout.
         * Por ahora: solo inicializa el canvas y dispara "canvas-ready".
         */
        renderInitialLayout() {
            console.log("🧩 LayoutManager.renderInitialLayout() llamado");
            this.initializeCanvas();
        }

        // =====================================================
        // SISTEMA DE EVENTOS (canvas-ready, theme-change, etc.)
        // =====================================================

        on(eventName, handler) {
            if (!this.eventHandlers[eventName]) {
                this.eventHandlers[eventName] = [];
            }
            this.eventHandlers[eventName].push(handler);
        }

        trigger(eventName, data = null) {
            const handlers = this.eventHandlers[eventName];
            if (!handlers) return;
            handlers.forEach((h) => {
                try {
                    h(data);
                } catch (err) {
                    console.error("[LayoutManager] Error en handler de", eventName, err);
                }
            });
        }

        // =====================================================
        // PERFIL DEL USUARIO
        // =====================================================

        /**
         * Actualiza los datos básicos del perfil (nombre + foto).
         * Espera un objeto tipo perfil de Spotify.
         */
        updateUserProfile(profile) {
            if (!profile) return;

            if (this.profileName) {
                this.profileName.textContent =
                    profile.display_name || profile.id || "Usuario";
            }

            if (this.profileImage) {
                const img =
                    (profile.images &&
                        profile.images[0] &&
                        profile.images[0].url) ||
                    null;
                if (img) {
                    this.profileImage.src = img;
                }
            }
        }

        // =====================================================
        // 🎵 TOP ARTISTS - GRID
        // =====================================================

        /**
         * Renderiza el grid de artistas top dentro de #top-artists-list
         */
        updateTopArtists(artists) {
            if (!this.topArtistsContainer) {
                console.warn("⚠️ No encontré #top-artists-list");
                return;
            }

            this.topArtistsContainer.innerHTML = "";
            if (!Array.isArray(artists)) return;

            artists.forEach((artist) => {
                const div = document.createElement("div");
                div.classList.add("artist-item");

                const img =
                    (artist.images &&
                        artist.images[2] &&
                        artist.images[2].url) ||
                    (artist.images &&
                        artist.images[1] &&
                        artist.images[1].url) ||
                    "";

                div.innerHTML = `
                    <div class="artist-card">
                        ${
                            img
                                ? `<img src="${img}" class="artist-img" />`
                                : `<div class="artist-img artist-img--placeholder">♪</div>`
                        }
                        <div class="artist-name">${artist.name || "Artista"}</div>
                    </div>
                `;

                this.topArtistsContainer.appendChild(div);
            });

            console.log("🎨 Top Artists renderizados");
        }

        // =====================================================
        // 🎶 TOP TRACKS
        // =====================================================

        /**
         * Renderiza la lista de top tracks dentro de #top-tracks-list
         */
        updateTopTracks(tracks) {
            if (!this.topTracksContainer) {
                console.warn("⚠️ No encontré #top-tracks-list");
                return;
            }

            this.topTracksContainer.innerHTML = "";
            if (!Array.isArray(tracks)) return;

            tracks.forEach((track) => {
                const img =
                    (track.album &&
                        track.album.images &&
                        track.album.images[2] &&
                        track.album.images[2].url) ||
                    "";
                const artists = (track.artists || [])
                    .map((a) => a.name)
                    .join(", ");

                const div = document.createElement("div");
                div.classList.add("track-item");

                div.innerHTML = `
                    <div class="track-card">
                        ${
                            img
                                ? `<img src="${img}" class="track-img" />`
                                : `<div class="track-img track-img--placeholder">♪</div>`
                        }
                        <div class="track-info">
                            <div class="track-name">${track.name || "Track"}</div>
                            <div class="track-artist">${
                                artists || "Artista desconocido"
                            }</div>
                        </div>
                    </div>
                `;

                this.topTracksContainer.appendChild(div);
            });

            console.log("🎵 Top Tracks renderizados");
        }

        // =====================================================
        // ⏱️ RECENT TRACKS
        // =====================================================

        /**
         * Renderiza la lista de recientes dentro de #recent-tracks-list
         * items suele venir del endpoint /recent-tracks de Spotify (cada item tiene .track)
         */
        updateRecentTracks(items) {
            if (!this.recentTracksContainer) {
                console.warn("⚠️ No encontré #recent-tracks-list");
                return;
            }

            this.recentTracksContainer.innerHTML = "";
            if (!Array.isArray(items)) return;

            items.forEach((entry) => {
                const track = entry.track || entry;
                if (!track) return;

                const img =
                    (track.album &&
                        track.album.images &&
                        track.album.images[2] &&
                        track.album.images[2].url) ||
                    "";
                const artists = (track.artists || [])
                    .map((a) => a.name)
                    .join(", ");

                const div = document.createElement("div");
                div.classList.add("recent-track-item");

                div.innerHTML = `
                    <div class="recent-card">
                        ${
                            img
                                ? `<img src="${img}" class="recent-img" />`
                                : `<div class="recent-img recent-img--placeholder">♪</div>`
                        }
                        <div class="recent-info">
                            <div class="recent-name">${
                                track.name || "Track"
                            }</div>
                            <div class="recent-artist">${
                                artists || "Artista desconocido"
                            }</div>
                        </div>
                    </div>
                `;

                this.recentTracksContainer.appendChild(div);
            });

            console.log("⏱️ Recent Tracks renderizados");
        }

        // =====================================================
        // 🎨 SISTEMA DE TEMAS (colores dinámicos)
        // =====================================================

        /**
         * Aplica un tema usando variables CSS.
         * Espera algo como:
         * { primary, secondary, accent, background }
         */
        applyTheme(theme) {
            if (!theme) return;

            const root = document.documentElement;

            if (theme.primary)
                root.style.setProperty("--primary", theme.primary);
            if (theme.secondary)
                root.style.setProperty("--secondary", theme.secondary);
            if (theme.accent)
                root.style.setProperty("--accent", theme.accent);
            root.style.setProperty(
                "--background",
                theme.background || "#121212"
            );

            console.log("🎨 Tema aplicado:", theme);
        }

        // =====================================================
        // CANVAS (Visualizador de partículas)
        // =====================================================

        /**
         * Llama a los handlers registrados en "canvas-ready" para que
         * el visualizer (particles.js / visualizer.js) se inicialice.
         */
        initializeCanvas() {
            if (!this.canvasContainer) {
                console.warn(
                    "⚠️ No encontré el contenedor del canvas (visualizerContainer)"
                );
                return;
            }

            this.trigger("canvas-ready");
        }
    }

    // Exponer LayoutManager como global para app.js
    window.LayoutManager = LayoutManager;

})(window, document);

