(function () {
  var registros = read();
  document.querySelector('#history-count').textContent = registros.length + (registros.length === 1 ? ' ocorrencia' : ' ocorrencias');
  if (!registros.length) return;
  document.querySelector('#history-empty').hidden = true;
  var list = document.querySelector('#history-list'); list.hidden = false;
  registros.slice().reverse().forEach(function (registro) {
    var card = document.createElement('article'); card.className = 'history-card';
    var status = registro.status === 'concluido' ? 'Concluido' : 'Em acompanhamento';
    card.innerHTML = '<div class="history-card-top"><span class="history-category">' + safe(registro.tipo || 'Outro') + '</span><span class="history-status">' + status + '</span></div><h3>' + safe(registro.nome || 'Sem titulo') + '</h3><p>' + safe(registro.descricao || '') + '</p><div class="history-meta"><span>⌖ ' + safe(registro.local || 'Local nao informado') + '</span><span>' + date(registro.data) + '</span></div><button class="history-delete" data-id="' + registro.id + '" type="button">Excluir ocorrência</button>';
    list.appendChild(card);
  });
  list.querySelectorAll('.history-delete').forEach(function (button) { button.addEventListener('click', function () { remove(Number(button.dataset.id)); }); });
  function remove(id) { if (!confirm('Excluir esta ocorrencia? Esta acao nao pode ser desfeita.')) return; registros = registros.filter(function (r) { return r.id !== id; }); localStorage.setItem('registros', JSON.stringify(registros)); location.reload(); }
  function read() { try { var data = JSON.parse(localStorage.getItem('registros') || '[]'); return Array.isArray(data) ? data : []; } catch (e) { return []; } }
  function date(value) { return value ? new Date(value).toLocaleDateString('pt-BR') : 'Data nao informada'; }
  function safe(value) { var div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
})();
