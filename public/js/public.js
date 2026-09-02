const gallery = document.querySelector('.event-gallery');

if (gallery) {
    const track = gallery.querySelector('.event-gallery-track');
    const slides = gallery.querySelectorAll('.event-gallery-slide');
    const dots = gallery.querySelectorAll('.event-gallery-dot');
    const previousButton = gallery.querySelector('.event-gallery-prev');
    const nextButton = gallery.querySelector('.event-gallery-next');
    let currentIndex = 0;
    let autoplay;

    function showSlide(index) {
        currentIndex = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === currentIndex;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-selected', isActive);
        });
    }

    function startAutoplay() {
        clearInterval(autoplay);
        autoplay = setInterval(() => showSlide(currentIndex + 1), 5000);
    }

    previousButton.addEventListener('click', () => {
        showSlide(currentIndex - 1);
        startAutoplay();
    });

    nextButton.addEventListener('click', () => {
        showSlide(currentIndex + 1);
        startAutoplay();
    });

    dots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', () => {
            showSlide(dotIndex);
            startAutoplay();
        });
    });

    gallery.addEventListener('mouseenter', () => clearInterval(autoplay));
    gallery.addEventListener('mouseleave', startAutoplay);
    gallery.addEventListener('focusin', () => clearInterval(autoplay));
    gallery.addEventListener('focusout', startAutoplay);

    showSlide(0);
    startAutoplay();
}
