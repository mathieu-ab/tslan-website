document.querySelectorAll('.card').forEach(card => {
  const video = card.querySelector('.card-video');

  card.addEventListener('mouseenter', () => {
    card.classList.add('is-hovered');
    
    video.currentTime = 0;
    video.play().catch(error => {
    });
  });

  card.addEventListener('mouseleave', () => {
    card.classList.remove('is-hovered');
    
    setTimeout(() => {
      if (!card.classList.contains('is-hovered')) {
        video.pause();
      }
    }, 700);
  });
});