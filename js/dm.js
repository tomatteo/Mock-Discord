document.addEventListener("DOMContentLoaded", () => {
    const inputBuscaDesktop = document.getElementById("input-busca-mensagens");
    const inputBuscaMobile = document.getElementById("input-busca-mobile");
    const inputMensagem = document.getElementById("input-mensagem-dm");
    const erroMensagem = document.getElementById("erro-mensagem-dm");
    const formMensagem = document.getElementById("form-mensagem-dm");
    const listaMensagens = document.getElementById("lista-mensagens-dm");
    const containerMensagens = document.getElementById("container-mensagens");

    containerMensagens.scrollTop = containerMensagens.scrollHeight;

    // Validação: só impede o envio se estiver vazio; o PHP recebe o resto
    formMensagem.addEventListener("submit", (e) => {
        if (!inputMensagem.value.trim()) {
            e.preventDefault();
            erroMensagem.textContent = "Digite uma mensagem antes de enviar.";
            inputMensagem.focus();
            return;
        }
        erroMensagem.textContent = "";
    });

    function filtrarMensagens(termo) {
        const busca = termo.toLowerCase().trim();
        listaMensagens.querySelectorAll(".item-mensagem").forEach((item) => {
            const texto = item.querySelector(".texto-mensagem").textContent.toLowerCase();
            const autor = item.querySelector(".autor-mensagem").textContent.toLowerCase();
            item.style.display = (texto.includes(busca) || autor.includes(busca)) ? "flex" : "none";
        });
    }

    inputBuscaDesktop.addEventListener("input", () => filtrarMensagens(inputBuscaDesktop.value));
    inputBuscaMobile.addEventListener("input", () => filtrarMensagens(inputBuscaMobile.value));

    const btnBuscaMobile = document.getElementById("btn-busca-mobile");
    const barraBuscaMobile = document.getElementById("barra-busca-mobile");
    btnBuscaMobile.addEventListener("click", () => {
        barraBuscaMobile.classList.toggle("aberta");
        if (barraBuscaMobile.classList.contains("aberta")) inputBuscaMobile.focus();
    });

    const inputBuscaDm = document.getElementById("busca-dm");
    inputBuscaDm.addEventListener("input", () => {
        const termo = inputBuscaDm.value.toLowerCase().trim();
        document.querySelectorAll(".lista-dms li").forEach((li) => {
            const nome = li.querySelector(".nome-dm").textContent.toLowerCase();
            li.style.display = nome.includes(termo) ? "block" : "none";
        });
    });

    const btnChamada = document.getElementById("btn-iniciar-chamada");
    const bannerChamada = document.getElementById("banner-chamada");
    const btnEncerrarChamada = document.getElementById("btn-encerrar-chamada");
    btnChamada.addEventListener("click", () => { bannerChamada.hidden = false; });
    btnEncerrarChamada.addEventListener("click", () => { bannerChamada.hidden = true; });

    const btnMic = document.getElementById("btn-mic");
    const btnAudio = document.getElementById("btn-audio");
    btnMic.addEventListener("click", () => {
        btnMic.classList.toggle("mutado");
        btnMic.querySelector("i").className = btnMic.classList.contains("mutado")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });
    btnAudio.addEventListener("click", () => {
        btnAudio.classList.toggle("mutado");
    });
});