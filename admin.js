(function () {
  var loginPanel = document.querySelector('#login-panel');
  var loginForm = document.querySelector('#login-form');
  var loginError = document.querySelector('#login-error');
  var statuses = { aberto: 'Aberta', em_acompanhamento: 'Em acompanhamento', em_analise: 'Em análise', concluido: 'Concluída', rejeitado: 'Rejeitada' };
  var mapInstance = null;
  var registros = read();
  var list = document.querySelector('#admin-list');

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(loginForm);
    if (data.get('usuario').trim().toLowerCase() === 'admin' && data.get('senha') === 'admin') {
      loginPanel.classList.add('is-hidden');
      setTimeout(function () { loginPanel.remove(); }, 450);
      return;
    }
    loginError.hidden = false;
  });
  loginForm.addEventListener('input', function () { loginError.hidden = true; });
  document.querySelector('#admin-search').addEventListener('input', function () { renderSuggestions(); renderAll(); });
  document.querySelector('#admin-search').addEventListener('blur', function () { setTimeout(function () { document.querySelector('#search-suggestions').hidden = true; }, 180); });
  document.querySelector('#admin-status-filter').addEventListener('change', renderAll);
  document.querySelector('#admin-category-filter').addEventListener('change', renderAll);
  document.querySelector('#export-csv').addEventListener('click', exportCsv);
  populateCategories();
  renderAll();

  function renderAll() {
    updateSummary();
    var filtered = getFiltered();
    renderCharts(filtered);
    renderMap(filtered);
    renderList(filtered);
    document.querySelector('#result-count').textContent = filtered.length + (filtered.length === 1 ? ' ocorrência encontrada.' : ' ocorrências encontradas.');
  }
  function renderSuggestions() {
    var input = document.querySelector('#admin-search');
    var suggestions = document.querySelector('#search-suggestions');
    var query = input.value.trim().toLowerCase();
    suggestions.innerHTML = '';
    if (!query) { suggestions.hidden = true; return; }
    var matches = registros.filter(function (r) { return [r.nome, r.descricao, r.local, r.referencia, r.tipo].join(' ').toLowerCase().indexOf(query) >= 0; }).slice(0, 6);
    if (!matches.length) { suggestions.innerHTML = '<p class="search-empty">Nenhuma ocorrência encontrada.</p>'; suggestions.hidden = false; return; }
    matches.forEach(function (record) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'search-result';
      button.innerHTML = '<strong>' + safe(record.nome || 'Sem título') + '</strong><span>' + safe(record.tipo || 'Outro') + ' · ' + safe(record.local || 'Local não informado') + '</span>';
      button.addEventListener('click', function () { input.value = record.nome || ''; suggestions.hidden = true; renderAll(); });
      suggestions.appendChild(button);
    });
    suggestions.hidden = false;
  }
  function updateSummary() {
    document.querySelector('#admin-total').textContent = registros.length;
    document.querySelector('#admin-open').textContent = registros.filter(function (r) { return normalizedStatus(r.status) !== 'concluido'; }).length;
    document.querySelector('#admin-done').textContent = registros.filter(function (r) { return normalizedStatus(r.status) === 'concluido'; }).length;
  }
  function getFiltered() {
    var query = document.querySelector('#admin-search').value.trim().toLowerCase();
    var status = document.querySelector('#admin-status-filter').value;
    var category = document.querySelector('#admin-category-filter').value;
    return registros.filter(function (r) {
      var text = [r.nome, r.descricao, r.local, r.referencia, r.tipo].join(' ').toLowerCase();
      return (!query || text.indexOf(query) >= 0) && (status === 'todos' || normalizedStatus(r.status) === status) && (category === 'todos' || (r.tipo || 'Outro') === category);
    });
  }
  function populateCategories() {
    var select = document.querySelector('#admin-category-filter');
    var current = select.value;
    select.innerHTML = '<option value="todos">Todas</option>';
    registros.map(function (r) { return r.tipo || 'Outro'; }).filter(function (value, index, values) { return values.indexOf(value) === index; }).sort().forEach(function (category) { var option = document.createElement('option'); option.value = category; option.textContent = category; select.appendChild(option); });
    select.value = current && Array.prototype.some.call(select.options, function (option) { return option.value === current; }) ? current : 'todos';
  }
  function renderCharts(source) {
    var counts = {};
    source.forEach(function (r) { var category = r.tipo || 'Outro'; counts[category] = (counts[category] || 0) + 1; });
    var chart = document.querySelector('#category-chart'); chart.innerHTML = '';
    var max = Math.max.apply(null, Object.keys(counts).map(function (key) { return counts[key]; }).concat([1]));
    Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (category) { var row = document.createElement('div'); row.className = 'category-row'; row.innerHTML = '<div class="category-label"><span>' + safe(category) + '</span><strong>' + counts[category] + '</strong></div><div class="category-track"><i style="width:' + (counts[category] / max * 100) + '%"></i></div>'; chart.appendChild(row); });
    if (!Object.keys(counts).length) chart.innerHTML = '<p class="chart-empty">Nenhum dado para exibir com estes filtros.</p>';
    var monthly = document.querySelector('#monthly-chart'); monthly.innerHTML = ''; var months = []; var now = new Date();
    for (var i = 5; i >= 0; i -= 1) { var month = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0'), label: month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), count: 0 }); }
    source.forEach(function (r) { var item = months.find(function (month) { return month.key === (r.data || '').slice(0, 7); }); if (item) item.count += 1; });
    var monthMax = Math.max.apply(null, months.map(function (month) { return month.count; }).concat([1]));
    months.forEach(function (month) { var item = document.createElement('div'); item.className = 'month-bar'; item.innerHTML = '<strong>' + month.count + '</strong><i style="height:' + Math.max(8, month.count / monthMax * 100) + '%"></i><small>' + safe(month.label) + '</small>'; monthly.appendChild(item); });
    var completed = source.filter(function (r) { return normalizedStatus(r.status) === 'concluido'; }).length;
    document.querySelector('#completion-rate').textContent = source.length ? Math.round(completed / source.length * 100) + '%' : '0%';
  }
  function renderMap(source) {
    var mapElement = document.querySelector('#all-map'); var empty = document.querySelector('#map-empty');
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapElement.innerHTML = '';
    var points = source.filter(function (r) { return r.coordenadas && isFinite(r.coordenadas.latitude) && isFinite(r.coordenadas.longitude); });
    if (!points.length) { empty.hidden = false; return; }
    empty.hidden = true; mapInstance = L.map('all-map'); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(mapInstance);
    var bounds = [];
    points.forEach(function (r) { var point = [Number(r.coordenadas.latitude), Number(r.coordenadas.longitude)]; bounds.push(point); L.marker(point).addTo(mapInstance).bindPopup('<strong>' + safe(r.nome || 'Ocorrência') + '</strong><br>' + safe(r.tipo || 'Outro') + '<br>' + safe(label(r.status)) + '<br><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + point[0] + ',' + point[1] + '">Abrir no Google Maps</a>'); });
    mapInstance.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }
  function renderList(source) {
    list.innerHTML = ''; document.querySelector('#admin-empty').hidden = source.length > 0; list.hidden = source.length === 0;
    source.slice().reverse().forEach(function (r) {
      var card = document.createElement('article'); card.className = 'admin-card';
      var map = r.coordenadas ? '<iframe class="map-frame" loading="lazy" title="Mapa da ocorrência" src="https://www.google.com/maps?q=' + encodeURIComponent(r.coordenadas.latitude + ',' + r.coordenadas.longitude) + '&z=16&output=embed"></iframe><a class="map-link" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + r.coordenadas.latitude + ',' + r.coordenadas.longitude + '">Abrir no Google Maps ↗</a>' : '<div class="map-missing">Localização do dispositivo não informada.</div>';
      card.innerHTML = '<div class="admin-card-content"><div class="history-card-top"><span class="history-category">' + safe(r.tipo || 'Outro') + '</span><span class="history-status status-' + safe(normalizedStatus(r.status)) + '">' + safe(label(r.status)) + '</span></div><h3>' + safe(r.nome || 'Sem título') + '</h3><p>' + safe(r.descricao || '') + '</p><div class="history-meta"><span>⌖ ' + safe(r.local || 'Local não informado') + '</span><span>' + date(r.data) + '</span></div>' + (r.foto ? '<img class="report-photo" src="' + r.foto + '" alt="Foto enviada na ocorrência">' : '') + '<div class="admin-actions"><label class="status-control-label" for="status-' + r.id + '">Atualizar status</label><select class="status-control" id="status-' + r.id + '" data-id="' + r.id + '">' + statusOptions(r.status) + '</select><button class="admin-edit" data-id="' + r.id + '" type="button">Editar</button><button class="admin-delete" data-id="' + r.id + '" type="button">Excluir</button></div></div><div class="admin-map">' + map + '</div>';
      list.appendChild(card);
    });
    list.querySelectorAll('.status-control').forEach(function (control) { control.addEventListener('change', function () { updateStatus(Number(control.dataset.id), control.value); }); });
    list.querySelectorAll('.admin-edit').forEach(function (button) { button.addEventListener('click', function () { edit(Number(button.dataset.id)); }); });
    list.querySelectorAll('.admin-delete').forEach(function (button) { button.addEventListener('click', function () { remove(Number(button.dataset.id)); }); });
  }
  function statusOptions(current) { return Object.keys(statuses).map(function (key) { return '<option value="' + key + '"' + (normalizedStatus(current) === key ? ' selected' : '') + '>' + statuses[key] + '</option>'; }).join(''); }
  function updateStatus(id, status) { var record = registros.find(function (item) { return item.id === id; }); if (!record) return; record.status = status; record.atualizadoEm = new Date().toISOString(); write(); showToast('Status atualizado com sucesso.'); renderAll(); }
  function edit(id) { var record = registros.find(function (item) { return item.id === id; }); if (!record) return; var name = prompt('Nome do problema:', record.nome || ''); if (name === null) return; var description = prompt('Descrição:', record.descricao || ''); if (description === null) return; if (!name.trim() || !description.trim()) { showToast('Nome e descrição não podem ficar vazios.'); return; } record.nome = name.trim(); record.descricao = description.trim(); record.atualizadoEm = new Date().toISOString(); write(); showToast('Ocorrência atualizada.'); renderAll(); }
  function remove(id) { if (!confirm('Excluir esta ocorrência? Esta ação não pode ser desfeita.')) return; registros = registros.filter(function (r) { return r.id !== id; }); write(); showToast('Ocorrência excluída.'); populateCategories(); renderAll(); }
  function exportCsv() { var source = getFiltered(); if (!source.length) { showToast('Não há ocorrências para exportar.'); return; } var columns = ['id', 'data', 'tipo', 'nome', 'descricao', 'local', 'referencia', 'status']; var csv = [columns.join(';')].concat(source.map(function (r) { return columns.map(function (column) { return csvCell(r[column]); }).join(';'); })).join('\r\n'); var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); var link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'ocorrencias-nova-londrina.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV exportado com sucesso.'); }
  function csvCell(value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"'; }
  function showToast(text) { var toast = document.querySelector('#admin-toast'); toast.textContent = text; toast.classList.add('is-visible'); clearTimeout(showToast.timer); showToast.timer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2800); }
  function normalizedStatus(value) { return Object.prototype.hasOwnProperty.call(statuses, value) ? value : 'em_acompanhamento'; }
  function read() { try { var data = JSON.parse(localStorage.getItem('registros') || '[]'); return Array.isArray(data) ? data : []; } catch (e) { return []; } }
  function write() { localStorage.setItem('registros', JSON.stringify(registros)); }
  function safe(value) { var div = document.createElement('div'); div.textContent = value == null ? '' : value; return div.innerHTML; }
  function date(value) { return value ? new Date(value).toLocaleDateString('pt-BR') : 'Data não informada'; }
  function label(value) { return statuses[normalizedStatus(value)]; }
})();
