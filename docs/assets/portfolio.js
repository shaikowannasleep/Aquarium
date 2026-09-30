/* Set CV_URL to a real file (e.g. 'assets/DinDun-CV.pdf') to switch the CV buttons
 * and reveal Download CV. Until then View CV opens LinkedIn and Download stays hidden. */
const CV_URL = '';
if (CV_URL) {
  document.querySelectorAll('[data-cv]').forEach(a => { a.href = CV_URL; a.target = '_blank'; a.rel = 'noopener'; });
  document.querySelectorAll('[data-cv-download]').forEach(a => { a.href = CV_URL; a.hidden = false; });
}
const links = [...document.querySelectorAll('.nav nav a')];
const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  links.forEach(a => a.removeAttribute('aria-current'));
  const a = map.get(e.target.id); if (a) a.setAttribute('aria-current', 'true');
}), { rootMargin: '-45% 0px -50% 0px' });
['top', 'about', 'experience', 'work', 'skills', 'contact'].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
