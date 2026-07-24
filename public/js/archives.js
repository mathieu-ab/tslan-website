function toggleAccordion(header) {
    const item = header.parentElement;

    item.classList.toggle('active');
}


function changeVideo(url, btn) {
    document.getElementById('video-player-2k25').src = url;

    const buttons = btn.parentElement.querySelectorAll('.selector-btn');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}


function jumpToVideo(baseUrl, seconds, buttonIndex) {
    const player = document.getElementById('video-player-2k25');
    const videoSection = document.querySelector('.video-section');

    const newUrl = `${baseUrl}?start=${seconds}&autoplay=1`;
    player.src = newUrl;

    videoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const buttons = document.querySelectorAll('.selector-btn');
    buttons.forEach(b => b.classList.remove('active'));
    if(buttons[buttonIndex]) {
        buttons[buttonIndex].classList.add('active');
    }
}