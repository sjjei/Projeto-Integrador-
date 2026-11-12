(function () {
  var form = document.querySelector('#problem-form');
  var description = document.querySelector('#description');
  var charCount = document.querySelector('#char-count');
  var message = document.querySelector('#form-message');
  var photo = document.querySelector('#photo');
  var locationInput = document.querySelector('#location');
  var photoName = document.querySelector('#photo-name');
  var coordinates = null;
  document.querySelector('.form-submit span').textContent = 'Registrar problema';
  photo.addEventListener('change', function () {
    var file = photo.files[0];
    if (file && file.size > 5 * 1024 * 1024) { photo.value = ''; photoName.textContent = 'Imagem maior que 5 MB. Escolha outra.'; return; }
    photoName.textContent = file ? file.name : 'Nenhuma imagem selecionada.';
  });
  document.querySelector('#get-location').addEventListener('click', function () {
    var status = document.querySelector('#location-status');
    if (!navigator.geolocation) { status.textContent = 'Geolocalizacao indisponivel neste navegador.'; return; }
    status.textContent = 'Obtendo sua localizacao...';
    navigator.geolocation.getCurrentPosition(function (position) {
      coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      locationInput.setCustomValidity('');
      status.textContent = 'Localizacao capturada com sucesso.';
    }, function () { coordinates = null; status.textContent = 'Nao foi possivel obter a localizacao. Informe o endereco aproximado para continuar.'; }, { enableHighAccuracy: true, timeout: 10000 });
  });
  locationInput.addEventListener('input', function () { if (locationInput.value.trim()) locationInput.setCustomValidity(''); });
  description.addEventListener('input', function () { charCount.textContent = description.value.length + '/500'; });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!coordinates && !locationInput.value.trim()) locationInput.setCustomValidity('Informe a localizacao aproximada ou use sua localizacao.'); else locationInput.setCustomValidity('');
    if (!form.reportValidity()) return;
    var registro = Object.fromEntries(new FormData(form).entries());
    registro.nome = registro.nome.trim(); registro.descricao = registro.descricao.trim(); registro.local = (registro.local || '').trim(); registro.referencia = (registro.referencia || '').trim();
    delete registro.foto;
    registro.id = Date.now(); registro.status = 'em_acompanhamento'; registro.data = new Date().toISOString();
    if (coordinates) registro.coordenadas = coordinates;
    var registros = JSON.parse(localStorage.getItem('registros') || '[]'); if (!Array.isArray(registros)) registros = [];
    function save(imageData) {
      if (imageData) registro.foto = imageData;
      fetch('/api/records', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(registro) }).then(function (response) { if (!response.ok) throw new Error('Falha ao salvar'); return response.json(); }).then(function () { registros.push(registro); localStorage.setItem('registros', JSON.stringify(registros)); window.location.assign('registros.html'); }).catch(function () { message.textContent = 'Não foi possível salvar agora. Verifique a conexão e tente novamente.'; message.classList.add('is-visible'); });
    }
    if (photo.files[0]) { var reader = new FileReader(); reader.onload = function () { save(reader.result); }; reader.readAsDataURL(photo.files[0]); } else save(null);
  });
})();
