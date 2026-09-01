console.log("heu bonsoir ? ")
const addressEl = document.getElementById('eventAddress');
const toast = document.getElementById('copyToast');
const cursorTooltip = document.getElementById('cursorTooltip');

addressEl.addEventListener('mouseenter', () => {
cursorTooltip.classList.add('show');
});

addressEl.addEventListener('mousemove', (e) => {
cursorTooltip.style.left = e.clientX + 'px';
cursorTooltip.style.top = e.clientY + 'px';
});

addressEl.addEventListener('mouseleave', () => {
cursorTooltip.classList.remove('show');
});

addressEl.addEventListener('click', copyAddress);
addressEl.addEventListener('keydown', (e) => {
if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    copyAddress();
}
});

function copyAddress() {
const text = addressEl.textContent.trim();
navigator.clipboard.writeText(text).then(() => {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}).catch(() => {
    toast.textContent = "Impossible de copier";
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
});
}
