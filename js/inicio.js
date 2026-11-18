document.addEventListener("DOMContentLoaded", () => {
    const abasAmigo = document.querySelectorAll(".aba-amigo");
    const secaoLista = document.getElementById("secao-lista-amigos");
    const secaoAdicionar = document.getElementById("secao-adicionar-amigo");
    const listaAmigos = document.getElementById("lista-amigos");
    const contadorAmigos = document.getElementById("contador-amigos");
    const inputBuscaAmigos = document.getElementById("input-busca-amigos");
    const inputBuscaDm = document.getElementById("busca-dm");
    const listaAtivoAgora = document.getElementById("lista-ativo-agora");
    const usuarios = [
        {
            id: "amigo1",
            nome: "amigo 1",
            adicionado: true,
            status: "online",
            chamada: { servidor: "Comunidade IFC", canal: "Geral" }
        },
        {
            id: "amigo2",
            nome: "amigo 2",
            adicionado: true,
            status: "online",
            chamada: { servidor: "Comunidade IFC", canal: "Geral" }
        },
        {
            id: "amigo3",
            nome: "amigo 3",
            adicionado: true,
            status: "offline",
            chamada: null
        }
    ];

    let filtroAtual = "disponiveis";

    function obterServidoresDoUsuario() {
        const servidores = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]");
        const nomesServidores = Array.isArray(servidores)
            ? servidores.map((servidor) => servidor.nome).filter(Boolean)
            : [];
        return new Set(["Comunidade IFC", ...nomesServidores]);
    }

    function criarIcone(classes) {
        const icone = document.createElement("i");
        icone.className = classes;
        icone.setAttribute("aria-hidden", "true");
        return icone;
    }

    function renderizarListaAmigos() {
        const termo = inputBuscaAmigos.value.toLowerCase().trim();
        let visiveis = 0;
        listaAmigos.replaceChildren();

        usuarios
            .filter((amigo) => amigo.adicionado)
            .forEach((amigo) => {
                const correspondeFiltro = filtroAtual === "todos" || amigo.status === "online";
                const correspondeBusca = amigo.nome.toLowerCase().includes(termo);
                if (!correspondeFiltro || !correspondeBusca) return;

                visiveis++;
                const item = document.createElement("li");
                item.className = "item-amigo";
                item.dataset.status = amigo.status;
                item.dataset.amigo = amigo.id;

                const informacoes = document.createElement("div");
                informacoes.className = "amigo-info";
                informacoes.tabIndex = 0;
                informacoes.setAttribute("role", "link");
                informacoes.setAttribute("aria-label", `Abrir conversa com ${amigo.nome}`);

                const avatar = document.createElement("div");
                avatar.className = "avatar-amigo";
                const indicador = document.createElement("span");
                indicador.className = `ponto-status ${amigo.status}`;
                avatar.appendChild(indicador);

                const textoAmigo = document.createElement("div");
                textoAmigo.className = "amigo-texto";
                const nomeAmigo = document.createElement("strong");
                nomeAmigo.textContent = amigo.nome;
                const statusAmigo = document.createElement("span");
                statusAmigo.textContent = amigo.status === "online" ? "Online" : "Offline";
                textoAmigo.append(nomeAmigo, statusAmigo);
                informacoes.append(avatar, textoAmigo);

                const acoes = document.createElement("div");
                acoes.className = "amigo-acoes";
                if (amigo.status === "online") {
                    const botaoChamada = document.createElement("button");
                    botaoChamada.type = "button";
                    botaoChamada.className = "acao-circulo";
                    botaoChamada.title = `Iniciar chamada de voz com ${amigo.nome}`;
                    botaoChamada.setAttribute("aria-label", `Ligar para ${amigo.nome}`);
                    botaoChamada.appendChild(criarIcone("bi bi-telephone-fill"));
                    acoes.appendChild(botaoChamada);
                }

                const linkConversa = document.createElement("a");
                linkConversa.href = `dm.html?${new URLSearchParams({ amigo: amigo.id })}`;
                linkConversa.className = "acao-circulo";
                linkConversa.title = `Enviar mensagem para ${amigo.nome}`;
                linkConversa.setAttribute("aria-label", `Conversar com ${amigo.nome}`);
                linkConversa.appendChild(criarIcone("bi bi-chat-fill"));
                acoes.appendChild(linkConversa);

                item.append(informacoes, acoes);
                listaAmigos.appendChild(item);
            });

        const rotulo = filtroAtual === "todos" ? "TODOS OS AMIGOS" : "ONLINE";
        contadorAmigos.textContent = `${rotulo} — ${visiveis}`;
    }

    function renderizarAtivoAgora() {
        const servidoresDoUsuario = obterServidoresDoUsuario();
        const amigosEmChamada = usuarios.filter((amigo) =>
            amigo.adicionado
            && amigo.status === "online"
            && amigo.chamada
            && servidoresDoUsuario.has(amigo.chamada.servidor)
        );

        listaAtivoAgora.replaceChildren();
        if (amigosEmChamada.length === 0) {
            const estadoVazio = document.createElement("div");
            estadoVazio.className = "vazio-ativo-agora";
            const titulo = document.createElement("strong");
            titulo.textContent = "Por enquanto está quieto...";
            const descricao = document.createElement("p");
            descricao.textContent =
                "Quando um amigo adicionado estiver online em chamada em um servidor em comum, ele aparecerá aqui.";
            estadoVazio.append(titulo, descricao);
            listaAtivoAgora.appendChild(estadoVazio);
            return;
        }

        amigosEmChamada.forEach((amigo) => {
            const cartao = document.createElement("article");
            cartao.className = "card-ativo-agora";

            const cabecalho = document.createElement("div");
            cabecalho.className = "cabecalho-card-ativo";

            const avatar = document.createElement("div");
            avatar.className = "avatar-ativo-agora";
            avatar.textContent = amigo.id.match(/\d+/)?.[0] || amigo.nome.charAt(0).toUpperCase();
            avatar.setAttribute("aria-hidden", "true");
            const indicador = document.createElement("span");
            indicador.className = "ponto-status online";
            avatar.appendChild(indicador);

            const informacoes = document.createElement("div");
            informacoes.className = "info-amigo-ativo";
            const nome = document.createElement("strong");
            nome.textContent = amigo.nome;
            const statusChamada = document.createElement("div");
            statusChamada.className = "status-amigo-chamada";
            const status = document.createElement("span");
            status.textContent = "Em chamada de voz";
            const outrosNaChamada = amigosEmChamada.filter((outro) =>
                outro.id !== amigo.id
                && outro.chamada.servidor === amigo.chamada.servidor
                && outro.chamada.canal === amigo.chamada.canal
            ).length;
            const participantes = document.createElement("span");
            participantes.className = "badge-participantes-voz";
            participantes.textContent = `+${outrosNaChamada}`;
            participantes.setAttribute(
                "aria-label",
                `${outrosNaChamada} ${outrosNaChamada === 1 ? "outra pessoa" : "outras pessoas"} na chamada`
            );
            statusChamada.append(status, participantes);
            informacoes.append(nome, statusChamada);
            cabecalho.append(avatar, informacoes);

            const chamada = document.createElement("a");
            chamada.href = `servidor.html?${new URLSearchParams({ servidor: amigo.chamada.servidor })}`;
            chamada.className = "detalhe-chamada-ativo";
            chamada.title = `Abrir ${amigo.chamada.canal} em ${amigo.chamada.servidor}`;

            const informacoesCanal = document.createElement("div");
            informacoesCanal.className = "chamada-canal-info";
            const iconeVoz = document.createElement("div");
            iconeVoz.className = "icone-voz-ativo";
            iconeVoz.appendChild(criarIcone("bi bi-volume-up-fill"));

            const textosChamada = document.createElement("div");
            textosChamada.className = "textos-chamada-ativo";
            const nomeCanal = document.createElement("strong");
            nomeCanal.textContent = amigo.chamada.canal;
            const nomeServidor = document.createElement("span");
            nomeServidor.textContent = amigo.chamada.servidor;
            textosChamada.append(nomeCanal, nomeServidor);
            informacoesCanal.append(iconeVoz, textosChamada);

            const botaoVer = document.createElement("span");
            botaoVer.className = "badge-entrar-voz";
            botaoVer.textContent = "Ver";
            chamada.append(informacoesCanal, botaoVer);

            cartao.append(cabecalho, chamada);
            listaAtivoAgora.appendChild(cartao);
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
            renderizarListaAmigos();
        });
    });

    inputBuscaAmigos.addEventListener("input", renderizarListaAmigos);

    if (inputBuscaDm) {
        inputBuscaDm.addEventListener("input", () => {
            const termo = inputBuscaDm.value.toLowerCase().trim();
            document.querySelectorAll(".lista-dms li").forEach((item) => {
                const nome = item.querySelector(".nome-dm").textContent.toLowerCase();
                item.style.display = nome.includes(termo) ? "block" : "none";
            });
        });
    }

    listaAmigos.addEventListener("click", (evento) => {
        const informacoes = evento.target.closest(".amigo-info");
        const item = informacoes?.closest(".item-amigo");
        if (item) window.location.href = `dm.html?${new URLSearchParams({ amigo: item.dataset.amigo })}`;
    });

    listaAmigos.addEventListener("keydown", (evento) => {
        if (evento.key !== "Enter" && evento.key !== " ") return;
        const informacoes = evento.target.closest(".amigo-info");
        const item = informacoes?.closest(".item-amigo");
        if (!item) return;
        evento.preventDefault();
        window.location.href = `dm.html?${new URLSearchParams({ amigo: item.dataset.amigo })}`;
    });

    const formAdicionarAmigo = document.getElementById("form-adicionar-amigo");
    const inputNovoAmigo = document.getElementById("input-novo-amigo");
    const feedbackAmigo = document.getElementById("feedback-amigo");
    formAdicionarAmigo.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const nome = inputNovoAmigo.value.trim();
        if (!nome) {
            feedbackAmigo.style.color = "#F23F43";
            feedbackAmigo.textContent = "Informe um nome de usuário válido.";
            return;
        }

        feedbackAmigo.style.color = "#23A559";
        feedbackAmigo.textContent = `Pedido de amizade enviado para ${nome}!`;
        inputNovoAmigo.value = "";
    });

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

    renderizarListaAmigos();
    renderizarAtivoAgora();
});
