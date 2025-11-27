// frontend/js/ui/animations.js
// Pequeñas animaciones / helpers visuales para darle vida al dashboard

(function () {
    function addHoverGlow(element) {
        if (!element) return;
        element.addEventListener('mouseenter', () => {
            element.classList.add('ui-hover-glow');
        });
        element.addEventListener('mouseleave', () => {
            element.classList.remove('ui-hover-glow');
        });
    }

    function pulseOnUpdate(element) {
        if (!element) return;
        element.classList.remove('ui-pulse-update');
        // Forzar reflow para reiniciar la animación
        void element.offsetWidth;
        element.classList.add('ui-pulse-update');
        setTimeout(() => {
            element.classList.remove('ui-pulse-update');
        }, 600);
    }

    function applyBackgroundGradient(rootElement, primaryHex = '#0f172a', secondaryHex = '#22c55e') {
        if (!rootElement) return;
        rootElement.style.background = `radial-gradient(circle at top left, ${secondaryHex} 0, transparent 45%),
                                        radial-gradient(circle at bottom right, ${primaryHex} 0, #020617 55%)`;
    }

    function shimmerSkeleton(element) {
        if (!element) return;
        element.classList.add('ui-skeleton');
    }

    function clearSkeleton(element) {
        if (!element) return;
        element.classList.remove('ui-skeleton');
    }

    window.UIAnimations = {
        addHoverGlow,
        pulseOnUpdate,
        applyBackgroundGradient,
        shimmerSkeleton,
        clearSkeleton,
    };
})();
