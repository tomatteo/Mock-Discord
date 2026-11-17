document.addEventListener("DOMContentLoaded", () => {
    const abasAmigo = document.querySelectorAll(".aba-amigo");
    const secaoLista = document.getElementById("secao-lista-amigos");
    const secaoAdicionar = document.getElementById("secao-adicionar-amigo");
    const itensAmigo = document.querySelectorAll(".item-amigo");
    const contadorAmigos = document.getElementById("contador-amigos");
    const inputBuscaAmigos = document.getElementById("input-busca-amigos");
    const inputBuscaDm = document.getElementById("busca-dm");
    const amigos = document.querySelectorAll(".item-amigo");

    let filtroAtual = "disponiveis";

    function atualizarListaAmigos() {
        const termo = inputBuscaAmigos.value.toLowerCase().trim();
        let visiveis = 0;

        itensAmigo.forEach((item) => {
            const nome = item.querySelector(".amigo-texto strong").textContent.toLowerCase();
            const status = item.dataset.status;

            const correspondeFiltro = (filtroAtual === "todos") || (status === "online");
            const correspondeBusca = nome.includes(termo);

            if (correspondeFiltro && correspondeBusca) {
                item.hidden = false;
                visiveis++;
            } else {
                item.hidden = true;
            }
        });

        const rotulo = filtroAtual === "todos" ? "TODOS OS AMIGOS" : "ONLINE";
        contadorAmigos.textContent = `${rotulo} — ${visiveis}`;
    }

    // alternar abas (disponiveis, todos, adicionar amigo)
    abasAmigo.forEach((aba) => {
        aba.addEventListener("click", () => {
            abasAmigo.forEach((a) => a.classList.remove("ativa"));
            aba.classList.add("ativa");

            const filtro = aba.dataset.filtro;
            if (filtro === "adicionar") {
                secaoLista.classList.remove("ativo");
                secaoAdicionar.classList.add("ativo");
            } else {
                filtroAtual = filtro;
                secaoAdicionar.classList.remove("ativo");
                secaoLista.classList.add("ativo");
                atualizarListaAmigos();
            }
        });
    });

    // busca na lista de amigos
    inputBuscaAmigos.addEventListener("input", atualizarListaAmigos);

    // Busca na barra lateral de conversas privadas.
    inputBuscaDm.addEventListener("input", () => {
        const termo = inputBuscaDm.value.toLowerCase().trim();
        document.querySelectorAll(".lista-dms li").forEach((li) => {
            const nome = li.querySelector(".nome-dm").textContent.toLowerCase();
            li.style.display = nome.includes(termo) ? "block" : "none";
        });
    });

    function abrirConversa(chaveAmigo) {
        window.location.href = `dm.html?${new URLSearchParams({ amigo: chaveAmigo })}`;
    }

    document.querySelectorAll(".item-dm[data-amigo]").forEach((item) => {
        item.href = `dm.html?${new URLSearchParams({ amigo: item.dataset.amigo })}`;
    });

    amigos.forEach((amigo) => {
        const infoAmigo = amigo.querySelector(".amigo-info");
        const linkMensagem = amigo.querySelector(".acao-circulo .bi-chat-fill")?.closest("a");
        if (linkMensagem) {
            linkMensagem.href = `dm.html?${new URLSearchParams({ amigo: amigo.dataset.amigo })}`;
        }

        infoAmigo.addEventListener("click", () => abrirConversa(amigo.dataset.amigo));
        infoAmigo.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                abrirConversa(amigo.dataset.amigo);
            }
        });
    });

    // validação do formulario add Amigo
    const formAdd = document.getElementById("form-adicionar-amigo");
    const inputNovoAmigo = document.getElementById("input-novo-amigo");
    const feedbackAmigo = document.getElementById("feedback-amigo");

    formAdd.addEventListener("submit", (e) => {
        e.preventDefault();
        const usuario = inputNovoAmigo.value.trim();

        if (!usuario) {
            feedbackAmigo.style.color = "#F23F43";
            feedbackAmigo.textContent = "Informe um nome de usuário válido.";
            return;
        }

        feedbackAmigo.style.color = "#23A559";
        feedbackAmigo.textContent = `Pedido de amizade enviado para ${usuario}!`;
        inputNovoAmigo.value = "";
    });

    // Controles de áudio do painel inferior.
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