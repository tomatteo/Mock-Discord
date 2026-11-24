document.addEventListener("DOMContentLoaded", () => {
    const abasAmigo = document.querySelectorAll(".aba-amigo");
    const secaoLista = document.getElementById("secao-lista-amigos");
    const secaoAdicionar = document.getElementById("secao-adicionar-amigo");
    const secaoSolicitacoes = document.getElementById("secao-solicitacoes");
    const buscaAmigos = document.querySelector(".barra-busca-amigos");
    const contadorAmigos = document.getElementById("contador-amigos");
    const listaAmigos = document.getElementById("lista-amigos");
    const inputBuscaAmigos = document.getElementById("input-busca-amigos");
    const inputBuscaDm = document.getElementById("busca-dm");
    let filtroAtual = "todos";

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
            secaoSolicitacoes.hidden = aba.dataset.filtro !== "solicitacoes";

            if (aba.dataset.filtro === "adicionar") {
                buscaAmigos.hidden = false;
                contadorAmigos.hidden = false;
                listaAmigos.hidden = false;
                secaoLista.classList.remove("ativo");
                secaoAdicionar.classList.add("ativo");
                return;
            }

            filtroAtual = aba.dataset.filtro === "disponiveis" ? "disponiveis" : "todos";
            secaoAdicionar.classList.remove("ativo");
            secaoLista.classList.add("ativo");
            const exibindoSolicitacoes = aba.dataset.filtro === "solicitacoes";
            buscaAmigos.hidden = exibindoSolicitacoes;
            contadorAmigos.hidden = exibindoSolicitacoes;
            listaAmigos.hidden = exibindoSolicitacoes;
            aplicarFiltro();
        });
    });

    inputBuscaAmigos.addEventListener("input", aplicarFiltro);
    window.addEventListener("mock-discord:presence-updated", aplicarFiltro);
    document.getElementById("btn-abrir-add-mobile")?.addEventListener("click", () => {
        document.querySelector(".layout-aplicativo").classList.add("mostrar-amigos");
        document.querySelector('[data-filtro="adicionar"]').click();
    });
    document.getElementById("btn-voltar-dms")?.addEventListener("click", () => {
        document.querySelector(".layout-aplicativo").classList.remove("mostrar-amigos");
    });

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

    botaoMicrofone?.addEventListener("click", () => {
        botaoMicrofone.classList.toggle("mutado");
        botaoMicrofone.querySelector("i").className = botaoMicrofone.classList.contains("mutado")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });

    botaoAudio?.addEventListener("click", () => {
        botaoAudio.classList.toggle("mutado");
    });
});