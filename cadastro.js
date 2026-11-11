(function () {
  var form = document.querySelector('#problem-form');
  var description = document.querySelector('#description');
  var charCount = document.querySelector('#char-count');
  var message = document.querySelector('#form-message');
  var photo = document.querySelector('#photo');
  var coordinates = null;
  document.querySelector('#get-location').addEventListener('click', function () {
    var status = document.querySelector('#location-status');
    if (!navigator.geolocation) { status.textContent = 'Geolocalizacao indisponivel neste navegador.'; return; }
    status.textContent = 'Obtendo sua localizacao...';
    navigator.geolocation.getCurrentPosition(function (position) {
      coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      status.textContent = 'Localizacao capturada com sucesso.';
    }, function () { status.textContent = 'Nao foi possivel obter a localizacao. Voce pode continuar sem ela.'; }, { enableHighAccuracy: true, timeout: 10000 });
  });
  description.addEventListener('input', function () { charCount.textContent = description.value.length + '/500'; });
  form.addEventListener('submit', function (event) {
    event.preventDefault(); if (!form.reportValidity()) return;
    var registro = Object.fromEntries(new FormData(form).entries());
    delete registro.foto;
    registro.id = Date.now(); registro.status = 'em_acompanhamento'; registro.data = new Date().toISOString();
    if (coordinates) registro.coordenadas = coordinates;
    var registros = JSON.parse(localStorage.getItem('registros') || '[]'); if (!Array.isArray(registros)) registros = [];
    function save(imageData) {
      if (imageData) registro.foto = imageData;
      registros.push(registro);
      try { localStorage.setItem('registros', JSON.stringify(registros)); } catch (error) { message.textContent = 'A foto e muito grande para o armazenamento local. Remova-a e tente novamente.'; message.classList.add('is-visible'); return; }
      message.textContent = 'Registro salvo com sucesso. Obrigado por participar!'; message.classList.add('is-visible'); form.reset(); charCount.textContent = '0/500'; coordinates = null;
    }
    if (photo.files[0]) { var reader = new FileReader(); reader.onload = function () { save(reader.result); }; reader.readAsDataURL(photo.files[0]); } else save(null);
  });
})();
