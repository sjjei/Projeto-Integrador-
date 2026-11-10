(function () {
  var lista = [];

  try {
    lista = JSON.parse(localStorage.getItem("registros")) || [];
  } catch (e) {}

  if (!Array.isArray(lista)) lista = [];

  document.getElementById("total").textContent = lista.length;

  document.getElementById("andamento").textContent = lista.filter(function (r) {
    return r && r.status !== "concluido";
  }).length;

  if (!lista.length) return;

  var ul = document.getElementById("recentes");

  lista.slice(-3).reverse().forEach(function (r) {
    var li = document.createElement("li");
    var titulo = document.createElement("strong");
    var detalhe = document.createElement("span");

    li.className = "cartao";
    titulo.textContent = (r && r.nome) || "Sem título";
    detalhe.textContent = [r && r.tipo, r && r.local].filter(Boolean).join(" · ");

    li.append(titulo, detalhe);
    ul.append(li);
  });

  document.getElementById("vazio").hidden = true;
  ul.hidden = false;
})();