// frontend/js/core/config.js
(function () {
    "use strict";

    console.log("🔧 Inicializando AppConfig...");

    // Opción 1: Buscar meta tag
    let apiBaseUrl = null;
    const apiMeta = document.querySelector('meta[name="api-base-url"]');

    if (apiMeta) {
        apiBaseUrl = apiMeta.content.trim();
        console.log("📌 Meta tag encontrado:", apiBaseUrl);
    } else {
        console.warn("⚠️ No se encontró meta tag 'api-base-url'");
    }

    // Opción 2: Valor por defecto si no hay meta tag o está vacío
    if (!apiBaseUrl) {
        apiBaseUrl = 'http://127.0.0.1:8080';
        console.log("📌 Usando URL por defecto:", apiBaseUrl);
    }

    // Verificar que la URL sea válida
    if (!apiBaseUrl.startsWith('http')) {
        console.error("❌ URL inválida:", apiBaseUrl);
        apiBaseUrl = 'http://127.0.0.1:8080';
        console.log("📌 Corrigiendo a URL por defecto:", apiBaseUrl);
    }

    // Crear configuración global
    const AppConfig = {
        apiBaseUrl: apiBaseUrl,
        pollingIntervalMs: 4000,
        statsIntervalMs: 30000,
        visualizer: {
            defaultMode: 'particles',
            maxFPS: 60
        }
    };

    // Asignar a window
    window.AppConfig = AppConfig;

    console.log("✅ AppConfig inicializado:", AppConfig);
    console.log("📍 Backend URL:", AppConfig.apiBaseUrl);

    // Debug adicional
    console.log("🔍 window.AppConfig definido:", typeof window.AppConfig !== 'undefined');
    console.log("🔍 window.AppConfig.apiBaseUrl:", window.AppConfig.apiBaseUrl);

})();