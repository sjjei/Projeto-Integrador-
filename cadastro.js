/* Formulário de registro: validação, geolocalização, seleção no mapa e persistência local. */
(function () {
  'use strict';

  var form = document.querySelector('#problem-form');
  var description = document.querySelector('#description');
  var charCount = document.querySelector('#char-count');
  var message = document.querySelector('#form-message');
  var photo = document.querySelector('#photo');
  var locationInput = document.querySelector('#location');
  var locationStatus = document.querySelector('#location-status');
  var photoName = document.querySelector('#photo-name');
  var coordinates = null;
  var selectedMapPoint = null;
  var pickerBounds = { south: -22.86, west: -53.12, north: -22.67, east: -52.86 };
  var activePickerBounds = pickerBounds;
  var activePointers = {};
  var pinchDistance = 0;
  var lastTap = 0;

  document.querySelector('.form-submit span').textContent = 'Registrar problema';
  photo.addEventListener('change', handlePhotoChange);
  document.querySelector('#get-location').addEventListener('click', getDeviceLocation);
  document.querySelector('#open-location-picker').addEventListener('click', openLocationPicker);
  document.querySelector('#close-location-picker').addEventListener('click', closeLocationPicker);
  document.querySelector('#cancel-location-picker').addEventListener('click', closeLocationPicker);
  document.querySelector('#picker-surface').addEventListener('pointerdown', startMapPan);
  document.querySelector('#picker-surface').addEventListener('pointermove', moveMap);
  document.querySelector('#picker-surface').addEventListener('pointerup', finishMapPan);
  document.querySelector('#picker-surface').addEventListener('pointercancel', finishMapPan);
  document.querySelector('#picker-surface').addEventListener('wheel', zoomWithScroll, { passive: false });
  document.querySelector('#confirm-location-picker').addEventListener('click', confirmMapPoint);
  locationInput.addEventListener('input', function () { if (locationInput.value.trim()) locationInput.setCustomValidity(''); });
  description.addEventListener('input', function () { charCount.textContent = description.value.length + '/500'; });
  form.addEventListener('submit', saveRecord);

  function handlePhotoChange() {
    var file = photo.files[0];
    if (file && file.size > 5 * 1024 * 1024) { photo.value = ''; photoName.textContent = 'Imagem maior que 5 MB. Escolha outra.'; return; }
    photoName.textContent = file ? file.name : 'Nenhuma imagem selecionada.';
  }

  function getDeviceLocation() {
    if (!navigator.geolocation) { locationStatus.textContent = 'Geolocalização indisponível neste navegador.'; return; }
    locationStatus.textContent = 'Obtendo sua localização...';
    navigator.geolocation.getCurrentPosition(function (position) {
      coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      locationInput.setCustomValidity('');
      locationStatus.textContent = 'Localização capturada com sucesso.';
    }, function () {
      coordinates = null;
      locationStatus.textContent = 'Não foi possível obter a localização. Informe o endereço ou escolha um ponto no mapa.';
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  function openLocationPicker() {
    var picker = document.querySelector('#location-picker');
    var frame = document.querySelector('#picker-map-frame');
    picker.hidden = false;
    activePickerBounds = fitBoundsToViewport(pickerBounds, document.querySelector('#location-picker-map'));
    frame.src = osmEmbed(activePickerBounds);
    selectedMapPoint = null;
  }

  function closeLocationPicker() { document.querySelector('#location-picker').hidden = true; }

  function startMapPan(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers[event.pointerId] = { x: event.clientX, y: event.clientY };
    event.currentTarget.dataset.startX = event.clientX;
    event.currentTarget.dataset.startY = event.clientY;
    if (Object.keys(activePointers).length === 2) pinchDistance = distanceBetweenPointers();
  }

  function moveMap(event) {
    if (!activePointers[event.pointerId]) return;
    activePointers[event.pointerId] = { x: event.clientX, y: event.clientY };
    if (Object.keys(activePointers).length === 2) {
      var distance = distanceBetweenPointers();
      if (pinchDistance && Math.abs(distance - pinchDistance) > 3) { zoomMap(distance / pinchDistance); pinchDistance = distance; }
    }
  }

  function finishMapPan(event) {
    var surface = event.currentTarget;
    var wasDragging = Math.abs(event.clientX - Number(surface.dataset.startX || event.clientX)) > 5 || Math.abs(event.clientY - Number(surface.dataset.startY || event.clientY)) > 5;
    var rect = surface.getBoundingClientRect();
    var deltaX = event.clientX - Number(surface.dataset.startX || event.clientX);
    var deltaY = event.clientY - Number(surface.dataset.startY || event.clientY);
    if (Object.keys(activePointers).length === 1 && wasDragging) { activePickerBounds = panBounds(activePickerBounds, deltaX / rect.width, deltaY / rect.height); document.querySelector('#picker-map-frame').src = osmEmbed(activePickerBounds); }
    if (Object.keys(activePointers).length === 1 && !wasDragging) { var now = Date.now(); if (now - lastTap < 320) zoomMap(2); lastTap = now; }
    delete activePointers[event.pointerId];
    if (Object.keys(activePointers).length < 2) pinchDistance = 0;
  }

  function distanceBetweenPointers() { var points = Object.keys(activePointers).map(function (key) { return activePointers[key]; }); return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y); }

  function zoomWithScroll(event) { event.preventDefault(); zoomMap(event.deltaY < 0 ? 1.35 : .74); }

  function zoomMap(factor) {
    var bounds = activePickerBounds; var centerLongitude = (bounds.west + bounds.east) / 2; var centerLatitude = (bounds.south + bounds.north) / 2;
    var width = (bounds.east - bounds.west) / factor; var height = (bounds.north - bounds.south) / factor;
    activePickerBounds = { west: centerLongitude - width / 2, east: centerLongitude + width / 2, south: centerLatitude - height / 2, north: centerLatitude + height / 2 };
    document.querySelector('#picker-map-frame').src = osmEmbed(activePickerBounds);
  }

  function panBounds(bounds, deltaX, deltaY) {
    var longitudeShift = deltaX * (bounds.east - bounds.west);
    var latitudeShift = deltaY * (bounds.north - bounds.south);
    return { west: bounds.west - longitudeShift, east: bounds.east - longitudeShift, north: bounds.north + latitudeShift, south: bounds.south + latitudeShift };
  }

  function confirmMapPoint() {
    coordinates = { latitude: (activePickerBounds.south + activePickerBounds.north) / 2, longitude: (activePickerBounds.west + activePickerBounds.east) / 2 };
    locationInput.setCustomValidity('');
    locationInput.value = 'Ponto escolhido no mapa';
    locationStatus.textContent = 'Localização escolhida no mapa com sucesso.';
    closeLocationPicker();
  }

  function saveRecord(event) {
    event.preventDefault();
    if (!coordinates && !locationInput.value.trim()) locationInput.setCustomValidity('Informe a localização aproximada, use o GPS ou escolha um ponto no mapa.'); else locationInput.setCustomValidity('');
    if (!form.reportValidity()) return;
    var record = Object.fromEntries(new FormData(form).entries());
    record.nome = record.nome.trim(); record.descricao = record.descricao.trim(); record.local = (record.local || '').trim(); record.referencia = (record.referencia || '').trim();
    delete record.foto;
    record.id = Date.now(); record.status = 'em_acompanhamento'; record.data = new Date().toISOString();
    if (coordinates) record.coordenadas = coordinates;
    var records = JSON.parse(localStorage.getItem('registros') || '[]'); if (!Array.isArray(records)) records = [];
    function save(imageData) {
      if (imageData) record.foto = imageData;
      records.push(record);
      try { localStorage.setItem('registros', JSON.stringify(records)); } catch (error) { message.textContent = 'A foto é muito grande para o armazenamento local. Remova-a e tente novamente.'; message.classList.add('is-visible'); return; }
      window.location.assign('registros.html');
    }
    if (photo.files[0]) { var reader = new FileReader(); reader.onload = function () { save(reader.result); }; reader.readAsDataURL(photo.files[0]); } else save(null);
  }

  function fitBoundsToViewport(bounds, element) {
    var result = { south: bounds.south, west: bounds.west, north: bounds.north, east: bounds.east };
    var ratio = element.clientWidth && element.clientHeight ? element.clientWidth / element.clientHeight : 1.6;
    var boundsRatio = (result.east - result.west) / (result.north - result.south);
    if (boundsRatio < ratio) { var centerLongitude = (result.west + result.east) / 2; var halfLongitude = (result.north - result.south) * ratio / 2; result.west = centerLongitude - halfLongitude; result.east = centerLongitude + halfLongitude; }
    if (boundsRatio > ratio) { var centerLatitude = (result.south + result.north) / 2; var halfLatitude = (result.east - result.west) / ratio / 2; result.south = centerLatitude - halfLatitude; result.north = centerLatitude + halfLatitude; }
    return result;
  }

  function osmEmbed(bounds) { return 'https://www.openstreetmap.org/export/embed.html?bbox=' + bounds.west + '%2C' + bounds.south + '%2C' + bounds.east + '%2C' + bounds.north + '&layer=mapnik'; }
})();
