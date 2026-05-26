// Ёлкино-Перепёлкино — interactions

// — Price season switch
document.querySelectorAll('.prices__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.prices__btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const season = btn.dataset.season;
    document.querySelectorAll('.pcard__price').forEach(el => {
      el.textContent = el.dataset[season];
    });
  });
});

// — Smooth scroll for sticky nav offset
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

// — Booking form (Telegram via tg-deeplink with prefilled message)
function submitBooking(e) {
  e.preventDefault();
  const f = e.target;
  const d = new FormData(f);
  const arrive = d.get('arrive') || '?';
  const depart = d.get('depart') || '?';
  const house = d.get('house') || '?';
  const guests = d.get('guests') || '?';
  const contact = d.get('contact') || '?';

  const msg =
`Здравствуйте! Хочу забронировать в Ёлкино-Перепёлкино.
Даты: ${arrive} → ${depart}
Дом: ${house}
Гостей: ${guests}
Связь: ${contact}`;

  // Open WhatsApp with prefilled message (fallback if no Telegram bot configured)
  const url = `https://wa.me/79051267668?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');

  // Show success in-line
  const btn = f.querySelector('button[type="submit"]');
  const note = f.querySelector('.book__note');
  if (btn) btn.textContent = '✓ Открываем WhatsApp…';
  if (note) note.textContent = 'Если WhatsApp не открылся — позвоните +7 (905) 126-76-68';

  return false;
}
window.submitBooking = submitBooking;

// — Lazy-reveal sections on scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.seg,.house,.kid,.amb,.pcard,.story').forEach(el => io.observe(el));

// — Aurora parallax on mouse
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', e => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});
function tick() {
  const layers = document.querySelectorAll('.aurora__layer');
  layers.forEach((l, i) => {
    const f = (i + 1) * 12;
    l.style.transform = `translate(${mouseX * f}px, ${mouseY * f}px)`;
  });
  requestAnimationFrame(tick);
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tick();
