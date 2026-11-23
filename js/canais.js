// Apenas comportamento de interface. Canais, mensagens e cargos vêm do PHP/banco.
document.addEventListener("DOMContentLoaded", () => {
    const listaMensagens = document.getElementById("lista-mensagens");
    const inputMensagem = document.getElementById("input-mensagem");
    const erroMensagem = document.getElementById("erro-mensagem");
    const formularioMensagem = document.getElementById("form-mensagem");
    const dialogoCanal = document.getElementById("dialogo-canal");
    const formularioCanal = document.getElementById("form-dialogo-canal");
    const inputNomeCanal = document.getElementById("input-nome-canal");
    const erroDialogo = document.getElementById("erro-dialogo-canal");

    listaMensagens.scrollTop = listaMensagens.scrollHeight;

    formularioMensagem.addEventListener("submit", (evento) => {
        if (!inputMensagem.value.trim()) {
            evento.preventDefault();
            erroMensagem.textContent = "Não é possível enviar uma mensagem vazia.";
            inputMensagem.focus();
            return;
        }
        erroMensagem.textContent = "";
    });

    function abrirDialogo(tipo) {
        formularioCanal.dataset.tipo = tipo;
        erroDialogo.textContent = "";
        document.getElementById("titulo-dialogo-canal").textContent = `Criar canal de ${tipo}`;
        document.getElementById("confirmar-dialogo-canal").textContent = "Criar canal";
        inputNomeCanal.value = "";
        inputNomeCanal.placeholder = tipo === "texto" ? "ex.: conversas" : "ex.: geral";
        dialogoCanal.showModal();
        inputNomeCanal.focus();
    }

    document.getElementById("botao-adicionar-texto").addEventListener("click", () => abrirDialogo("texto"));
    document.getElementById("botao-adicionar-voz").addEventListener("click", () => abrirDialogo("voz"));
    document.getElementById("cancelar-dialogo-canal").addEventListener("click", () => dialogoCanal.close());
    dialogoCanal.addEventListener("click", (evento) => {
        if (evento.target === dialogoCanal) dialogoCanal.close();
    });

    formularioCanal.addEventListener("submit", (evento) => {
        if (!inputNomeCanal.value.trim()) {
            evento.preventDefault();
            erroDialogo.textContent = "Digite um nome para o canal.";
            inputNomeCanal.focus();
        }
    });

    const btnMic = document.getElementById("botao-microfone");
    const btnAudio = document.getElementById("botao-audio");
    btnMic.addEventListener("click", () => {
        btnMic.classList.toggle("silenciado");
        btnMic.querySelector("i").className = btnMic.classList.contains("silenciado")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });
    btnAudio.addEventListener("click", () => {
        btnAudio.classList.toggle("silenciado");
    });
});