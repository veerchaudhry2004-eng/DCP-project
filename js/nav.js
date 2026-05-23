document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navOverlay = document.getElementById('nav-overlay');
  if (!hamburger || !navOverlay) return;

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    navOverlay.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!navOverlay.contains(e.target) && !hamburger.contains(e.target)) {
      navOverlay.classList.remove('open');
    }
  });

  // Mark active link
  const current = window.location.pathname.split('/').pop() || 'index.html';
  navOverlay.querySelectorAll('a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
});
