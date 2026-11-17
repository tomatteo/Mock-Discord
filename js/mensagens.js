document.addEventListener("DOMContentLoaded", () => {
    const inputBusca = document.getElementById("campo-busca-mensagens");

    if (inputBusca) {
        inputBusca.addEventListener("input", () => {
            const termo = inputBusca.value.toLowerCase().trim();
            const mensagens = document.querySelectorAll("#lista-mensagens .item-mensagem");

            mensagens.forEach((msg) => {
                const texto = msg.querySelector(".texto-mensagem").textContent.toLowerCase();
                const autor = msg.querySelector(".autor-mensagem").textContent.toLowerCase();
                msg.style.display = (texto.includes(termo) || autor.includes(termo)) ? "flex" : "none";
            });
        });
    }
});