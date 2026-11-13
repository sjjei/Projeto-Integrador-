/*
 * Painel administrativo da plataforma.
 * Responsabilidades: autenticação local, filtros, indicadores, mapa e edição.
 */
(function () {
  'use strict';

  var STATUS = {
    aberto: 'Aberta',
    em_acompanhamento: 'Em acompanhamento',
    em_analise: 'Em análise',
    concluido: 'Concluída',
    rejeitado: 'Rejeitada'
  };
  var registros = readRecords();
  var editingId = null;
  var loginAttempts = 0;
  var loginPanel = document.querySelector('#login-panel');
  var adminContent = document.querySelector('#admin-content');
  var adminHeader = document.querySelector('.topo');
  var list = document.querySelector('#admin-list');

  adminHeader.hidden = true;
  bindEvents();
  populateCategories();
  renderAll();

  function bindEvents() {
    document.querySelector('#login-form').addEventListener('submit', login);
    document.querySelector('#login-form').addEventListener('input', function () { document.querySelector('#login-error').hidden = true; });
    document.querySelector('#admin-search').addEventListener('input', function () { renderSuggestions(); renderAll(); });
    document.querySelector('#admin-search').addEventListener('blur', function () { setTimeout(function () { document.querySelector('#search-suggestions').hidden = true; }, 180); });
    document.querySelector('#admin-status-filter').addEventListener('change', renderAll);
    document.querySelector('#admin-category-filter').addEventListener('change', renderAll);
    document.querySelector('#export-csv').addEventListener('click', exportCsv);
    document.querySelector('#edit-form').addEventListener('submit', saveEdit);
    document.querySelector('#edit-cancel').addEventListener('click', closeEdit);
    document.querySelector('#edit-cancel-top').addEventListener('click', closeEdit);
  }

  async function login(event) {
    event.preventDefault();
    var form = new FormData(event.currentTarget);
    var error = document.querySelector('#login-error');
    if (loginAttempts >= 5) { error.textContent = 'Muitas tentativas. Recarregue a página para tentar novamente.'; error.hidden = false; return; }
    var passwordHash = await hashText(form.get('senha'));
    if (String(form.get('usuario')).trim().toLowerCase() === 'admin' && passwordHash === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918') { unlockAdmin(); return; }
    loginAttempts += 1;
    error.hidden = false;
  }

  function unlockAdmin() {
    loginPanel.classList.add('is-hidden');
    adminContent.hidden = false;
    adminHeader.hidden = false;
    setTimeout(function () { renderAll(); }, 120);
    setTimeout(function () { renderAll(); }, 520);
    setTimeout(function () { loginPanel.remove(); }, 450);
  }

  async function hashText(value) {
    var bytes = new TextEncoder().encode(value);
    var digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
  }

  function renderAll() {
    var filtered = getFilteredRecords();
    renderSummary();
    renderCharts(filtered);
    renderMap(registros); // O mapa sempre mostra todos os pontos da cidade.
    renderList(filtered);
    document.querySelector('#result-count').textContent = filtered.length + (filtered.length === 1 ? ' ocorrência encontrada.' : ' ocorrências encontradas.');
  }

  function renderSummary() {
    document.querySelector('#admin-total').textContent = registros.length;
    document.querySelector('#admin-open').textContent = registros.filter(function (item) { return normalizeStatus(item.status) !== 'concluido'; }).length;
    document.querySelector('#admin-done').textContent = registros.filter(function (item) { return normalizeStatus(item.status) === 'concluido'; }).length;
  }

  function getFilteredRecords() {
    var query = document.querySelector('#admin-search').value.trim().toLowerCase();
    var status = document.querySelector('#admin-status-filter').value;
    var category = document.querySelector('#admin-category-filter').value;
    return registros.filter(function (item) {
      var text = [item.nome, item.descricao, item.local, item.referencia, item.tipo].join(' ').toLowerCase();
      return (!query || text.indexOf(query) >= 0) && (status === 'todos' || normalizeStatus(item.status) === status) && (category === 'todos' || (item.tipo || 'Outro') === category);
    });
  }

  function renderSuggestions() {
    var input = document.querySelector('#admin-search');
    var suggestions = document.querySelector('#search-suggestions');
    var query = input.value.trim().toLowerCase();
    suggestions.innerHTML = '';
    if (!query) { suggestions.hidden = true; return; }
    var matches = registros.filter(function (item) { return [item.nome, item.descricao, item.local, item.referencia, item.tipo].join(' ').toLowerCase().indexOf(query) >= 0; }).slice(0, 6);
    if (!matches.length) { suggestions.innerHTML = '<p class="search-empty">Nenhuma ocorrência encontrada.</p>'; suggestions.hidden = false; return; }
    matches.forEach(function (record) {
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'search-result';
      button.innerHTML = '<strong>' + safe(record.nome || 'Sem título') + '</strong><span>' + safe(record.tipo || 'Outro') + ' · ' + safe(record.local || 'Local não informado') + '</span>';
      button.addEventListener('click', function () { input.value = record.nome || ''; suggestions.hidden = true; renderAll(); });
      suggestions.appendChild(button);
    });
    suggestions.hidden = false;
  }

  function populateCategories() {
    var select = document.querySelector('#admin-category-filter');
    var current = select.value;
    select.innerHTML = '<option value="todos">Todas</option>';
    registros.map(function (item) { return item.tipo || 'Outro'; }).filter(unique).sort().forEach(function (category) { select.insertAdjacentHTML('beforeend', '<option value="' + safe(category) + '">' + safe(category) + '</option>'); });
    select.value = Array.prototype.some.call(select.options, function (option) { return option.value === current; }) ? current : 'todos';
  }

  function renderCharts(source) {
    var counts = {};
    source.forEach(function (item) { var category = item.tipo || 'Outro'; counts[category] = (counts[category] || 0) + 1; });
    var chart = document.querySelector('#category-chart');
    chart.innerHTML = '';
    var max = Math.max.apply(null, Object.keys(counts).map(function (key) { return counts[key]; }).concat([1]));
    Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (category) { chart.insertAdjacentHTML('beforeend', '<div class="category-row"><div class="category-label"><span>' + safe(category) + '</span><strong>' + counts[category] + '</strong></div><div class="category-track"><i style="width:' + counts[category] / max * 100 + '%"></i></div></div>'); });
    if (!Object.keys(counts).length) chart.innerHTML = '<p class="chart-empty">Nenhum dado para exibir com estes filtros.</p>';

    var monthly = document.querySelector('#monthly-chart');
    var months = []; var now = new Date(); monthly.innerHTML = '';
    for (var index = 5; index >= 0; index -= 1) { var month = new Date(now.getFullYear(), now.getMonth() - index, 1); months.push({ key: month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0'), label: month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), count: 0 }); }
    source.forEach(function (item) { var month = months.find(function (entry) { return entry.key === (item.data || '').slice(0, 7); }); if (month) month.count += 1; });
    var monthMax = Math.max.apply(null, months.map(function (month) { return month.count; }).concat([1]));
    months.forEach(function (month) { monthly.insertAdjacentHTML('beforeend', '<div class="month-bar"><strong>' + month.count + '</strong><i style="height:' + Math.max(8, month.count / monthMax * 100) + '%"></i><small>' + safe(month.label) + '</small></div>'); });
    var completed = source.filter(function (item) { return normalizeStatus(item.status) === 'concluido'; }).length;
    document.querySelector('#completion-rate').textContent = source.length ? Math.round(completed / source.length * 100) + '%' : '0%';
  }

  /* O mapa usa o mesmo iframe OpenStreetMap das páginas de histórico. */
  function renderMap(source) {
    var map = document.querySelector('#all-map'); var empty = document.querySelector('#map-empty');
    var points = source.filter(hasCoordinates);
    if (!points.length) { map.innerHTML = ''; empty.hidden = false; return; }
    var latitudes = points.map(function (item) { return Number(item.coordenadas.latitude); });
    var longitudes = points.map(function (item) { return Number(item.coordenadas.longitude); });
    var south = Math.min.apply(null, latitudes); var north = Math.max.apply(null, latitudes); var west = Math.min.apply(null, longitudes); var east = Math.max.apply(null, longitudes);
    var latitudePadding = Math.max((north - south) * .12, .0035); var longitudePadding = Math.max((east - west) * .12, .0035);
    south -= latitudePadding; north += latitudePadding; west -= longitudePadding; east += longitudePadding;
    var ratio = map.clientWidth && map.clientHeight ? map.clientWidth / map.clientHeight : 2.4;
    var boundsRatio = (east - west) / (north - south);
    if (boundsRatio < ratio) { var centerLongitude = (west + east) / 2; var halfLongitude = (north - south) * ratio / 2; west = centerLongitude - halfLongitude; east = centerLongitude + halfLongitude; }
    if (boundsRatio > ratio) { var centerLatitude = (south + north) / 2; var halfLatitude = (east - west) / ratio / 2; south = centerLatitude - halfLatitude; north = centerLatitude + halfLatitude; }
    var markers = points.map(function (item, index) {
      var latitude = Number(item.coordenadas.latitude); var longitude = Number(item.coordenadas.longitude);
      var left = Math.max(2, Math.min(98, (longitude - west) / (east - west) * 100)); var top = Math.max(2, Math.min(98, (north - latitude) / (north - south) * 100));
      return '<button class="city-map-marker" type="button" style="left:' + left + '%;top:' + top + '%" title="' + safe(item.nome || 'Ocorrência') + '" aria-label="Abrir ocorrência ' + safe(item.nome || 'sem título') + '" data-number="' + (index + 1) + '" data-name="' + safe(item.nome || 'Ocorrência') + '" data-type="' + safe(item.tipo || 'Outro') + '" data-status="' + safe(label(item.status)) + '"></button>';
    }).join('');
    map.innerHTML = '<iframe class="fallback-map" title="Mapa de todas as ocorrências" loading="eager" src="' + osmEmbedBounds(south, west, north, east) + '"></iframe><div class="city-map-count">' + points.length + (points.length === 1 ? ' ocorrência no mapa' : ' ocorrências no mapa') + '</div><div class="city-map-markers" aria-label="Pontos de ocorrência">' + markers + '</div><div class="city-map-popup" hidden></div>';
    empty.hidden = true;
    map.querySelectorAll('.city-map-marker').forEach(function (marker) { marker.addEventListener('click', function () { var popup = map.querySelector('.city-map-popup'); popup.innerHTML = '<strong>' + marker.dataset.name + '</strong><span>' + marker.dataset.type + '</span><small>' + marker.dataset.status + '</small>'; popup.hidden = false; }); });
  }

  function renderList(source) {
    list.innerHTML = ''; list.hidden = source.length === 0; document.querySelector('#admin-empty').hidden = source.length > 0;
    source.slice().reverse().forEach(function (item) {
      var card = document.createElement('article'); card.className = 'admin-card';
      var map = hasCoordinates(item) ? '<iframe class="map-frame" loading="lazy" title="Mapa da ocorrência" src="' + osmEmbed(item.coordenadas.latitude, item.coordenadas.longitude) + '"></iframe><a class="map-link" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=' + item.coordenadas.latitude + '&mlon=' + item.coordenadas.longitude + '#map=16/' + item.coordenadas.latitude + '/' + item.coordenadas.longitude + '">Abrir mapa</a>' : '<div class="map-missing">Localização do dispositivo não informada.</div>';
      card.innerHTML = '<div class="admin-card-content"><div class="history-card-top"><span class="history-category">' + safe(item.tipo || 'Outro') + '</span><span class="history-status status-' + normalizeStatus(item.status) + '">' + safe(label(item.status)) + '</span></div><h3>' + safe(item.nome || 'Sem título') + '</h3><p>' + safe(item.descricao || '') + '</p><div class="history-meta"><span>⌖ ' + safe(item.local || 'Local não informado') + '</span><span>' + formatDate(item.data) + '</span></div>' + (item.foto ? '<img class="report-photo" src="' + safe(item.foto) + '" alt="Foto enviada na ocorrência">' : '') + '<div class="admin-actions"><label class="status-control-label" for="status-' + item.id + '">Atualizar status</label><select class="status-control" id="status-' + item.id + '" data-id="' + item.id + '">' + statusOptions(item.status) + '</select><button class="admin-edit" data-id="' + item.id + '" type="button">Editar</button><button class="admin-delete" data-id="' + item.id + '" type="button">Excluir</button></div></div><div class="admin-map">' + map + '</div>';
      list.appendChild(card);
    });
    list.querySelectorAll('.status-control').forEach(function (control) { control.addEventListener('change', function () { updateStatus(Number(control.dataset.id), control.value); }); });
    list.querySelectorAll('.admin-edit').forEach(function (button) { button.addEventListener('click', function () { edit(Number(button.dataset.id)); }); });
    list.querySelectorAll('.admin-delete').forEach(function (button) { button.addEventListener('click', function () { remove(Number(button.dataset.id)); }); });
  }

  function statusOptions(current) { return Object.keys(STATUS).map(function (key) { return '<option value="' + key + '"' + (normalizeStatus(current) === key ? ' selected' : '') + '>' + STATUS[key] + '</option>'; }).join(''); }
  function updateStatus(id, status) { var item = registros.find(function (record) { return record.id === id; }); if (!item) return; item.status = status; item.atualizadoEm = new Date().toISOString(); writeRecords(); showToast('Status atualizado com sucesso.'); renderAll(); }
  function edit(id) { var item = registros.find(function (record) { return record.id === id; }); if (!item) return; editingId = id; document.querySelector('#edit-name').value = item.nome || ''; document.querySelector('#edit-description').value = item.descricao || ''; document.querySelector('#edit-form-error').hidden = true; document.querySelector('#edit-modal').hidden = false; document.querySelector('#edit-name').focus(); }
  function saveEdit(event) { event.preventDefault(); var name = document.querySelector('#edit-name').value.trim(); var description = document.querySelector('#edit-description').value.trim(); var error = document.querySelector('#edit-form-error'); if (name.length < 3 || description.length < 10) { error.textContent = 'Informe um nome com pelo menos 3 caracteres e uma descrição com pelo menos 10.'; error.hidden = false; return; } var item = registros.find(function (record) { return record.id === editingId; }); if (!item) return closeEdit(); item.nome = name; item.descricao = description; item.atualizadoEm = new Date().toISOString(); writeRecords(); closeEdit(); showToast('Ocorrência atualizada com sucesso.'); renderAll(); }
  function closeEdit() { editingId = null; document.querySelector('#edit-modal').hidden = true; }
  function remove(id) { if (!confirm('Excluir esta ocorrência? Esta ação não pode ser desfeita.')) return; registros = registros.filter(function (item) { return item.id !== id; }); writeRecords(); showToast('Ocorrência excluída.'); populateCategories(); renderAll(); }
  function exportCsv() { var source = getFilteredRecords(); if (!source.length) { showToast('Não há ocorrências para exportar.'); return; } var columns = ['id', 'data', 'tipo', 'nome', 'descricao', 'local', 'referencia', 'status']; var csv = [columns.join(';')].concat(source.map(function (item) { return columns.map(function (column) { return csvCell(item[column]); }).join(';'); })).join('\r\n'); var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); var link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'ocorrencias-nova-londrina.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV exportado com sucesso.'); }
  function showToast(text) { var toast = document.querySelector('#admin-toast'); toast.textContent = text; toast.classList.add('is-visible'); clearTimeout(showToast.timer); showToast.timer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2800); }
  function normalizeStatus(value) { return Object.prototype.hasOwnProperty.call(STATUS, value) ? value : 'em_acompanhamento'; }
  function label(value) { return STATUS[normalizeStatus(value)]; }
  function hasCoordinates(item) { return item.coordenadas && isFinite(item.coordenadas.latitude) && isFinite(item.coordenadas.longitude); }
  function unique(value, index, values) { return values.indexOf(value) === index; }
  function csvCell(value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"'; }
  function safe(value) { var element = document.createElement('div'); element.textContent = value == null ? '' : value; return element.innerHTML; }
  function formatDate(value) { return value ? new Date(value).toLocaleDateString('pt-BR') : 'Data não informada'; }
  function readRecords() { try { var data = JSON.parse(localStorage.getItem('registros') || '[]'); return Array.isArray(data) ? data.filter(function (item) { return item && typeof item === 'object'; }) : []; } catch (error) { return []; } }
  function writeRecords() { localStorage.setItem('registros', JSON.stringify(registros)); }
  function osmEmbed(latitude, longitude) { return 'https://www.openstreetmap.org/export/embed.html?bbox=' + (Number(longitude) - .004) + '%2C' + (Number(latitude) - .004) + '%2C' + (Number(longitude) + .004) + '%2C' + (Number(latitude) + .004) + '&layer=mapnik&marker=' + latitude + '%2C' + longitude; }
  function osmEmbedBounds(south, west, north, east) { return 'https://www.openstreetmap.org/export/embed.html?bbox=' + west + '%2C' + south + '%2C' + east + '%2C' + north + '&layer=mapnik'; }
})();
