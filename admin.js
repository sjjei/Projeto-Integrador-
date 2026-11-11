(function () {
  var loginPanel = document.querySelector('#login-panel');
  var loginForm = document.querySelector('#login-form');
  var loginError = document.querySelector('#login-error');
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(loginForm);
    if (data.get('usuario') === 'admin' && data.get('senha') === 'admin') {
      loginPanel.classList.add('is-hidden');
      setTimeout(function () { loginPanel.remove(); }, 450);
      return;
    }
    loginError.hidden = false;
  });
  var registros = read();
  var list = document.querySelector('#admin-list');
  document.querySelector('#admin-total').textContent = registros.length;
  document.querySelector('#admin-open').textContent = registros.filter(function (r) { return r.status !== 'concluido'; }).length;
  document.querySelector('#admin-done').textContent = registros.filter(function (r) { return r.status === 'concluido'; }).length;
  renderDashboard();
  if (!registros.length) return;
  document.querySelector('#admin-empty').hidden = true; list.hidden = false; renderList();

  function renderDashboard() {
    var counts = {};
    registros.forEach(function (r) { var category = r.tipo || 'Outro'; counts[category] = (counts[category] || 0) + 1; });
    var chart = document.querySelector('#category-chart');
    var max = Math.max.apply(null, Object.keys(counts).map(function (key) { return counts[key]; }).concat([1]));
    Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (category) {
      var row = document.createElement('div'); row.className = 'category-row';
      row.innerHTML = '<div class="category-label"><span>' + safe(category) + '</span><strong>' + counts[category] + '</strong></div><div class="category-track"><i style="width:' + (counts[category] / max * 100) + '%"></i></div>';
      chart.appendChild(row);
    });
    var points = registros.filter(function (r) { return r.coordenadas && isFinite(r.coordenadas.latitude) && isFinite(r.coordenadas.longitude); });
    if (!points.length) { document.querySelector('#map-empty').hidden = false; return; }
    var map = L.map('all-map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var bounds = [];
    points.forEach(function (r) {
      var point = [Number(r.coordenadas.latitude), Number(r.coordenadas.longitude)]; bounds.push(point);
      L.marker(point).addTo(map).bindPopup('<strong>' + safe(r.nome || 'Ocorrencia') + '</strong><br>' + safe(r.tipo || 'Outro') + '<br><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + point[0] + ',' + point[1] + '">Abrir no Google Maps</a>');
    });
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }

  function renderList() {
    list.innerHTML = '';
    registros.slice().reverse().forEach(function (r) {
      var card = document.createElement('article'); card.className = 'admin-card';
      var map = r.coordenadas ? '<iframe class="map-frame" loading="lazy" title="Mapa da ocorrencia" src="https://www.google.com/maps?q=' + encodeURIComponent(r.coordenadas.latitude + ',' + r.coordenadas.longitude) + '&z=16&output=embed"></iframe><a class="map-link" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + r.coordenadas.latitude + ',' + r.coordenadas.longitude + '">Abrir no Google Maps ↗</a>' : '<div class="map-missing">Localizacao do dispositivo nao informada.</div>';
      card.innerHTML = '<div class="admin-card-content"><div class="history-card-top"><span class="history-category">' + safe(r.tipo || 'Outro') + '</span><span class="history-status status-' + safe(r.status) + '">' + label(r.status) + '</span></div><h3>' + safe(r.nome || 'Sem titulo') + '</h3><p>' + safe(r.descricao || '') + '</p><div class="history-meta"><span>⌖ ' + safe(r.local || 'Local nao informado') + '</span><span>' + date(r.data) + '</span></div>' + (r.foto ? '<img class="report-photo" src="' + r.foto + '" alt="Foto enviada na ocorrencia">' : '') + '<div class="admin-actions"><button class="admin-edit" data-id="' + r.id + '">Editar</button><button class="admin-complete ' + (r.status === 'concluido' ? 'is-done' : '') + '" data-id="' + r.id + '" ' + (r.status === 'concluido' ? 'disabled' : '') + '>' + (r.status === 'concluido' ? 'Concluida' : 'Concluir') + '</button><button class="admin-delete" data-id="' + r.id + '">Excluir</button></div></div><div class="admin-map">' + map + '</div>';
      list.appendChild(card);
    });
    list.querySelectorAll('.admin-edit').forEach(function (button) { button.addEventListener('click', function () { edit(Number(button.dataset.id)); }); });
    list.querySelectorAll('.admin-complete:not([disabled])').forEach(function (button) { button.addEventListener('click', function () { complete(Number(button.dataset.id)); }); });
    list.querySelectorAll('.admin-delete').forEach(function (button) { button.addEventListener('click', function () { remove(Number(button.dataset.id)); }); });
  }
  function edit(id) { var r = registros.find(function (item) { return item.id === id; }); if (!r) return; var name = prompt('Nome do problema:', r.nome || ''); if (name === null) return; var description = prompt('Descricao:', r.descricao || ''); if (description === null) return; var status = prompt('Status: aberto, em_acompanhamento ou concluido', r.status || 'em_acompanhamento'); if (status === null) return; r.nome = name; r.descricao = description; r.status = ['aberto', 'em_acompanhamento', 'concluido'].indexOf(status) >= 0 ? status : 'em_acompanhamento'; write(); location.reload(); }
  function complete(id) { var r = registros.find(function (item) { return item.id === id; }); if (!r) return; r.status = 'concluido'; r.concluidoEm = new Date().toISOString(); write(); location.reload(); }
  function remove(id) { if (!confirm('Excluir esta ocorrencia? Esta acao nao pode ser desfeita.')) return; registros = registros.filter(function (r) { return r.id !== id; }); write(); location.reload(); }
  function read() { try { var data = JSON.parse(localStorage.getItem('registros') || '[]'); return Array.isArray(data) ? data : []; } catch (e) { return []; } }
  function write() { localStorage.setItem('registros', JSON.stringify(registros)); }
  function safe(value) { var div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
  function date(value) { return value ? new Date(value).toLocaleDateString('pt-BR') : 'Data nao informada'; }
  function label(value) { return value === 'concluido' ? 'Concluida' : value === 'aberto' ? 'Aberta' : 'Em acompanhamento'; }
})();
