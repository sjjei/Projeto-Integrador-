/* Interações e indicadores da página inicial. */
(function () {
  var slides = Array.prototype.slice.call(document.querySelectorAll('.hero-slide'));
  if (slides.length) {
    var points = Array.prototype.slice.call(document.querySelectorAll('.hero-ponto'));
    var currentSlide = 0;
    var carouselTimer;
    function showSlide(index) {
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach(function (slide, position) { var active = position === currentSlide; slide.classList.toggle('is-active', active); slide.setAttribute('aria-hidden', active ? 'false' : 'true'); });
      points.forEach(function (point, position) { var active = position === currentSlide; point.classList.toggle('is-active', active); if (active) point.setAttribute('aria-current', 'true'); else point.removeAttribute('aria-current'); });
    }
    function restartCarousel() { clearInterval(carouselTimer); carouselTimer = setInterval(function () { showSlide(currentSlide + 1); }, 6000); }
    document.querySelectorAll('[data-carousel="prev"]').forEach(function (button) { button.addEventListener('click', function () { showSlide(currentSlide - 1); restartCarousel(); }); });
    document.querySelectorAll('[data-carousel="next"]').forEach(function (button) { button.addEventListener('click', function () { showSlide(currentSlide + 1); restartCarousel(); }); });
    points.forEach(function (point) { point.addEventListener('click', function () { showSlide(Number(point.dataset.slideTo)); restartCarousel(); }); });
    var carousel = document.querySelector('.hero-carrossel');
    carousel.addEventListener('mouseenter', function () { clearInterval(carouselTimer); });
    carousel.addEventListener('mouseleave', restartCarousel);
    carousel.addEventListener('focusin', function () { clearInterval(carouselTimer); });
    carousel.addEventListener('focusout', function (event) { if (!carousel.contains(event.relatedTarget)) restartCarousel(); });
    showSlide(0); restartCarousel();
  }
  var lista = [];
  try { lista = JSON.parse(localStorage.getItem('registros')) || []; } catch (e) {}
  if (!Array.isArray(lista)) lista = [];
  document.getElementById('total').textContent = lista.length;
  document.getElementById('andamento').textContent = lista.filter(function (r) { return r && r.status !== 'concluido'; }).length;
  if (!lista.length) return;
  var ul = document.getElementById('recentes');
  lista.slice(-3).reverse().forEach(function (r) {
    var li = document.createElement('li');
    var titulo = document.createElement('strong');
    var detalhe = document.createElement('span');
    var status = document.createElement('small');
    li.className = 'cartao';
    titulo.textContent = (r && r.nome) || 'Sem título';
    detalhe.textContent = [r && r.tipo, r && r.local].filter(Boolean).join(' · ');
    status.textContent = r && r.status === 'concluido' ? 'CONCLUÍDA' : 'EM ACOMPANHAMENTO';
    status.className = 'atividade-status';
    li.append(titulo, detalhe, status);
    ul.append(li);
  });
  document.getElementById('vazio').hidden = true;
  ul.hidden = false;

})();
