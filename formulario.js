
const form = document.querySelector("#problem-form");

const description = document.querySelector("#description");

const charCount = document.querySelector("#char-count");

const message = document.querySelector("#form-message");

// Contador de caracteres
description.addEventListener("input", () => {
  charCount.textContent = `${description.value.length}/500`;
});

// Envio do formulário
form.addEventListener("submit", (event) => {

  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);

  const registro = Object.fromEntries(formData.entries());

  // Mostra os dados no console
  console.log("Registro preenchido:", registro);

  // Mensagem de confirmação
  message.textContent =
    "Registro preenchido com sucesso! Esta é uma demonstração; nenhum dado foi enviado.";

  message.classList.add("is-visible");

  message.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

});
