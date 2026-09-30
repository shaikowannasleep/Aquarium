(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const label = document.querySelector('.theme-label');
  const icon = document.querySelector('.theme-icon');
  const setTheme = (theme) => {
    const light = theme === 'light';
    root.dataset.theme = theme;
    toggle.setAttribute('aria-pressed', String(light));
    toggle.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
    label.textContent = light ? 'DARK MODE' : 'LIGHT MODE';
    icon.textContent = light ? '☾' : '☼';
    document.querySelector('meta[name="theme-color"]').content = light ? '#f0f1e8' : '#07151e';
  };
  let storedTheme;
  try { storedTheme = localStorage.getItem('dung-lab-theme'); } catch (_) { /* storage disabled */ }
  setTheme(storedTheme === 'light' ? 'light' : 'dark');
  toggle.addEventListener('click', () => {
    const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(theme);
    try { localStorage.setItem('dung-lab-theme', theme); } catch (_) { /* storage disabled */ }
  });

  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open menu');
  }));

  const filters = [...document.querySelectorAll('.filter')];
  const projects = [...document.querySelectorAll('.project')];
  filters.forEach((button) => button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    filters.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    projects.forEach((project) => { project.hidden = selected !== 'all' && !project.dataset.category.split(' ').includes(selected); });
  }));
  document.getElementById('year').textContent = new Date().getFullYear();
})();
