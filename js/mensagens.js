document.addEventListener("DOMContentLoaded", () => {
    const formMensagem = document.getElementById("form-mensagem");
    const inputMensagem = document.getElementById("input-mensagem");
    const erroMensagem = document.getElementById("erro-mensagem");
    const containerMensagens = document.getElementById("lista-mensagens");
    const estadoVazio = document.getElementById("estado-vazio");
    const inputBusca = document.getElementById("campo-busca-mensagens");

    // Envio de nova mensagem com validação no cliente
    formMensagem.addEventListener("submit", (e) => {
        e.preventDefault();
        const texto = inputMensagem.value.trim();

        if (!texto) {
            erroMensagem.textContent = "Não é possível enviar uma mensagem vazia.";
            inputMensagem.focus();
            return;
        }

        erroMensagem.textContent = "";
        estadoVazio.remove();

        const agora = new Date();
        const horaFormatada = agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });
        const dataFormatada = agora.toLocaleDateString("pt-BR");

        const novaMensagem = document.createElement("article");
        novaMensagem.classList.add("item-mensagem");

        const avatar = document.createElement("div");
        avatar.classList.add("avatar-mensagem");

        const content = document.createElement("div");
        content.classList.add("conteudo-mensagem");

        const meta = document.createElement("div");
        meta.classList.add("metadados-mensagem");

        const autor = document.createElement("strong");
        autor.classList.add("autor-mensagem");
        autor.textContent = "Você";

        const tempo = document.createElement("time");
        tempo.classList.add("horario-mensagem");
        tempo.textContent = `${dataFormatada}, ${horaFormatada}`;

        const paragrafo = document.createElement("p");
        paragrafo.classList.add("texto-mensagem");
        paragrafo.textContent = texto;

        meta.append(autor, tempo);
        content.append(meta, paragrafo);
        novaMensagem.append(avatar, content);

        containerMensagens.appendChild(novaMensagem);
        containerMensagens.scrollTop = containerMensagens.scrollHeight;
        inputMensagem.value = "";
    });

    // Filtro de busca de mensagens no canal
    if (inputBusca) {
        inputBusca.addEventListener("input", () => {
            const termo = inputBusca.value.toLowerCase().trim();
            const mensagens = containerMensagens.querySelectorAll(".item-mensagem");

            mensagens.forEach((msg) => {
                const texto = msg.querySelector(".texto-mensagem").textContent.toLowerCase();
                const autor = msg.querySelector(".autor-mensagem").textContent.toLowerCase();
                msg.style.display = (texto.includes(termo) || autor.includes(termo)) ? "flex" : "none";
            });
        });
    }
});