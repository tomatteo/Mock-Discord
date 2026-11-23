document.addEventListener("DOMContentLoaded", () => {
    const abasAmigo = document.querySelectorAll(".aba-amigo");
    const secaoLista = document.getElementById("secao-lista-amigos");
    const secaoAdicionar = document.getElementById("secao-adicionar-amigo");
    const inputBuscaAmigos = document.getElementById("input-busca-amigos");
    const inputBuscaDm = document.getElementById("busca-dm");
    let filtroAtual = "disponiveis";

    // Apenas mostra/esconde itens que o PHP já renderizou
    function aplicarFiltro() {
        const termo = inputBuscaAmigos.value.toLowerCase().trim();
        document.querySelectorAll("#lista-amigos .item-amigo").forEach((item) => {
            const nome = item.querySelector(".amigo-texto strong")?.textContent.toLowerCase() || "";
            const passaFiltro = filtroAtual === "todos" || item.dataset.status === "online";
            item.style.display = passaFiltro && nome.includes(termo) ? "" : "none";
        });
    }

    abasAmigo.forEach((aba) => {
        aba.addEventListener("click", () => {
            abasAmigo.forEach((item) => item.classList.remove("ativa"));
            aba.classList.add("ativa");

            if (aba.dataset.filtro === "adicionar") {
                secaoLista.classList.remove("ativo");
                secaoAdicionar.classList.add("ativo");
                return;
            }

            filtroAtual = aba.dataset.filtro;
            secaoAdicionar.classList.remove("ativo");
            secaoLista.classList.add("ativo");
            aplicarFiltro();
        });
    });

    inputBuscaAmigos.addEventListener("input", aplicarFiltro);

    if (inputBuscaDm) {
        inputBuscaDm.addEventListener("input", () => {
            const termo = inputBuscaDm.value.toLowerCase().trim();
            document.querySelectorAll(".lista-dms li").forEach((item) => {
                const nome = item.querySelector(".nome-dm").textContent.toLowerCase();
                item.style.display = nome.includes(termo) ? "block" : "none";
            });
        });
    }

    const botaoMicrofone = document.getElementById("btn-mic");
    const botaoAudio = document.getElementById("btn-audio");

    botaoMicrofone.addEventListener("click", () => {
        botaoMicrofone.classList.toggle("mutado");
        botaoMicrofone.querySelector("i").className = botaoMicrofone.classList.contains("mutado")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });

    botaoAudio.addEventListener("click", () => {
        botaoAudio.classList.toggle("mutado");
    });
});