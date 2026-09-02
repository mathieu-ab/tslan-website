const ticketButtons = document.querySelectorAll('.ticket-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!reducedMotion.matches) {
    ticketButtons.forEach((button) => {
        button.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') {
                return;
            }

            const bounds = button.getBoundingClientRect();
            const horizontalPosition = (event.clientX - bounds.left) / bounds.width;
            const verticalPosition = (event.clientY - bounds.top) / bounds.height;
            const rotateY = (horizontalPosition - 0.5) * 8;
            const rotateX = (0.5 - verticalPosition) * 8;

            button.style.setProperty('--ticket-rotate-x', `${rotateX}deg`);
            button.style.setProperty('--ticket-rotate-y', `${rotateY}deg`);
        });

        button.addEventListener('pointerleave', () => {
            button.style.setProperty('--ticket-rotate-x', '0deg');
            button.style.setProperty('--ticket-rotate-y', '0deg');
        });
    });
}
