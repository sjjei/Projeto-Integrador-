(function () {
  var registros = read();
  document.querySelector('#history-count').textContent = registros.length + (registros.length === 1 ? ' ocorrencia' : ' ocorrencias');
  if (!registros.length) return;
  document.querySelector('#history-empty').hidden = true;
  var list = document.querySelector('#history-list'); list.hidden = false;
  registros.slice().reverse().forEach(function (registro) {
    var card = document.createElement('article'); card.className = 'history-card';
    var status = registro.status === 'concluido' ? 'Concluido' : 'Em acompanhamento';
    var visual = '';
    if (hasCoordinates(registro)) {
      var point = Number(registro.coordenadas.latitude) + ',' + Number(registro.coordenadas.longitude);
      visual += '<div class="history-map"><iframe loading="lazy" title="Mapa da ocorrencia" src="' + osmEmbed(registro.coordenadas.latitude, registro.coordenadas.longitude) + '"></iframe><a href="https://www.openstreetmap.org/?mlat=' + registro.coordenadas.latitude + '&mlon=' + registro.coordenadas.longitude + '#map=16/' + point + '" target="_blank" rel="noopener">Abrir mapa ↗</a></div>';
    }
    card.innerHTML = '<div class="history-card-content"><div class="history-card-top"><span class="history-category">' + safe(registro.tipo || 'Outro') + '</span><span class="history-status">' + status + '</span></div><h3>' + safe(registro.nome || 'Sem titulo') + '</h3><p>' + safe(registro.descricao || '') + '</p><div class="history-meta"><span>⌖ ' + safe(registro.local || 'Local nao informado') + '</span><span>' + date(registro.data) + '</span></div><button class="history-delete" data-id="' + registro.id + '" type="button">Excluir ocorrencia</button></div>' + (visual ? '<div class="history-card-visuals">' + visual + '</div>' : '');
    if (registro.foto) {
      var photoFigure = document.createElement('figure'); photoFigure.className = 'history-photo';
      var photoImage = document.createElement('img'); photoImage.src = registro.foto; photoImage.alt = 'Foto da ocorrencia registrada'; photoImage.loading = 'lazy';
      photoFigure.appendChild(photoImage); card.querySelector('.history-meta').after(photoFigure);
    }
    list.appendChild(card);
  });
  list.querySelectorAll('.history-delete').forEach(function (button) { button.addEventListener('click', function () { remove(Number(button.dataset.id)); }); });
  function remove(id) { if (!confirm('Excluir esta ocorrencia? Esta acao nao pode ser desfeita.')) return; registros = registros.filter(function (r) { return r.id !== id; }); localStorage.setItem('registros', JSON.stringify(registros)); location.reload(); }
  function read() { try { var data = JSON.parse(localStorage.getItem('registros') || '[]'); return Array.isArray(data) ? data : []; } catch (e) { return []; } }
  function date(value) { return value ? new Date(value).toLocaleDateString('pt-BR') : 'Data nao informada'; }
  function hasCoordinates(registro) { return registro.coordenadas && isFinite(Number(registro.coordenadas.latitude)) && isFinite(Number(registro.coordenadas.longitude)); }
  function osmEmbed(latitude, longitude) { var delta = 0.004; var south = Number(latitude) - delta; var west = Number(longitude) - delta; var north = Number(latitude) + delta; var east = Number(longitude) + delta; return 'https://www.openstreetmap.org/export/embed.html?bbox=' + west + '%2C' + south + '%2C' + east + '%2C' + north + '&layer=mapnik&marker=' + latitude + '%2C' + longitude; }
  function safe(value) { var div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
})();
