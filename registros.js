(function () {
  var registros;
  try { registros = JSON.parse(localStorage.getItem('registros')) || []; } catch (e) { registros = []; }
  if (!Array.isArray(registros)) registros = [];
  document.querySelector('#history-count').textContent = registros.length + (registros.length === 1 ? ' ocorrência' : ' ocorrências');
  if (!registros.length) return;
  document.querySelector('#history-empty').hidden = true;
  var list = document.querySelector('#history-list');
  list.hidden = false;
  registros.slice().reverse().forEach(function (registro) {
    var card = document.createElement('article'); card.className = 'history-card';
    var date = registro.data ? new Date(registro.data).toLocaleDateString('pt-BR') : 'Data não informada';
    card.innerHTML = '<div class="history-card-top"><span class="history-category">' + escapeHtml(registro.tipo || 'Outro') + '</span><span class="history-status">Em acompanhamento</span></div><h3>' + escapeHtml(registro.nome || 'Sem título') + '</h3><p>' + escapeHtml(registro.descricao || '') + '</p><div class="history-meta"><span>⌖ ' + escapeHtml(registro.local || 'Local não informado') + '</span><span>' + date + '</span></div>';
    list.appendChild(card);
  });
  function escapeHtml(value) { var div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
})();
