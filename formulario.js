
const form = document.getElementById("formProblema");
const descricao = document.getElementById("descricao");
const contador = document.getElementById("contador");
const mensagem = document.getElementById("mensagem");
const lista = document.getElementById("listaRegistros");
const total = document.getElementById("total");

const CHAVE = "espacoEloProblemas";

// Atualizar contador da descrição
descricao.addEventListener("input", () => {
  contador.textContent = `${descricao.value.length}/500`;
});

// Buscar registros salvos
function buscarRegistros() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) || [];
  } catch {
    return [];
  }
}

// Mostrar registros na tela
function mostrarRegistros() {
  const registros = buscarRegistros();

  lista.innerHTML = "";

  total.textContent =
    `${registros.length} ${registros.length === 1 ? "registro" : "registros"}`;

  if (registros.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Nenhum registro cadastrado ainda.";
    lista.appendChild(vazio);
    return;
  }

  registros.slice().reverse().forEach((registro) => {
    const item = document.createElement("article");
    item.className = "registro";

    const informacoes = document.createElement("div");

    const titulo = document.createElement("h3");
    titulo.textContent = registro.nome;

    const categoria = document.createElement("p");
    categoria.textContent = "Categoria: " + registro.categoria;

    const local = document.createElement("p");
    local.textContent = "📍 " + registro.localizacao;

    const data = document.createElement("p");
    data.textContent = "Cadastrado em: " + registro.data;

    informacoes.append(titulo, categoria, local, data);

    const status = document.createElement("span");
    status.className = "status";
    status.textContent = "● Registrado";

    item.append(informacoes, status);
    lista.appendChild(item);
  });
}

// Enviar formulário
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const categoria = document.getElementById("categoria").value.trim();
  const nome = document.getElementById("nome").value.trim();
  const descricaoTexto = descricao.value.trim();
  const localizacao = document.getElementById("localizacao").value.trim();
  const referencia = document.getElementById("referencia").value.trim();

  // Verificar campos obrigatórios
  if (!categoria || !nome || !descricaoTexto || !localizacao) {
    mensagem.textContent = "Preencha todos os campos obrigatórios!";
    mensagem.className = "erro";
    return;
  }

  // Criar registro
  const novoRegistro = {
    categoria: categoria,
    nome: nome,
    descricao: descricaoTexto,
    localizacao: localizacao,
    referencia: referencia,
    data: new Date().toLocaleDateString("pt-BR")
  };

  try {
    const registros = buscarRegistros();

    registros.push(novoRegistro);

    localStorage.setItem(CHAVE, JSON.stringify(registros));

    // Atualizar histórico
    mostrarRegistros();

    // Limpar formulário
    form.reset();
    contador.textContent = "0/500";

    mensagem.textContent = "Registro cadastrado com sucesso!";
    mensagem.className = "sucesso";

  } catch (erro) {
    mensagem.textContent =
      "Não foi possível salvar o registro neste navegador.";
    mensagem.className = "erro";
  }
});

// Limpar formulário
form.addEventListener("reset", () => {
  setTimeout(() => {
    contador.textContent = "0/500";
    mensagem.textContent = "";
    mensagem.className = "";
  }, 0);
});

// Carregar registros ao abrir o site
mostrarRegistros();
