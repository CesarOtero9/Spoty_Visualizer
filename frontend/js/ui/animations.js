// frontend/js/ui/animations.js
(function () {
    "use strict";

    const Anim = {
        fadeIn(el, time = 300) {
            el.style.opacity = 0;
            el.style.transition = `opacity ${time}ms ease`;

            requestAnimationFrame(() => {
                el.style.opacity = 1;
            });
        },

        fadeOut(el, time = 300) {
            el.style.opacity = 1;
            el.style.transition = `opacity ${time}ms ease`;

            requestAnimationFrame(() => {
                el.style.opacity = 0;
            });
        }
    };

    // Hacerlo global
    window.Anim = Anim;
})();