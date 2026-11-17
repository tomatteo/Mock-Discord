document.addEventListener("DOMContentLoaded", () => {
const conversas = {
        amigo1: {
            nome: "Nome amigo 1",
            status: "online",
            data: "23/04/2026",
            mensagens: [
                {
                    autor: "Nome amigo 1",
                    hora: "16:58",
                    texto: "In faucibus mollis luctus. Donec egestas neque ac luctus lacinia. Iaculis vitae felis."
                }
            ]
        },
        amigo2: {
            nome: "Nome amigo 2",
            status: "online",
            data: "23/04/2026",
            mensagens: [
                {
                    autor: "Nome amigo 2",
                    hora: "16:58",
                    texto: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In faucibus mollis luctus vitae felis. In faucibus mollis luctus. Donec egestas neque ac luctus lacinia. Iaculis vitae felis. In ornare massa tincidunt tincidunt elementum."
                },
                {
                    autor: "Nome usuário",
                    hora: "17:00",
                    texto: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea."
                }
            ]
        },
        amigo3: {
            nome: "Nome amigo 3",
            status: "ausente",
            data: "23/04/2026",
            mensagens: [
                {
                    autor: "Nome amigo 3",
                    hora: "21:10",
                    texto: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi."
                }
            ]
        }
    };

    const conversasSalvas = JSON.parse(localStorage.getItem("mock_discord_conversas") || "{}") || {};
    Object.entries(conversas).forEach(([chave, conversa]) => {
        const historico = conversasSalvas[chave]?.mensagens;
        if (Array.isArray(historico)) conversa.mensagens = historico;
    });

    const parametros = new URLSearchParams(window.location.search);
    const amigoSolicitado = parametros.get("amigo");
    let amigoAtual = Object.prototype.hasOwnProperty.call(conversas, amigoSolicitado)
        ? amigoSolicitado
        : "amigo2";

    const itensDm = document.querySelectorAll(".item-dm");
    const nomeAmigoAtivo = document.getElementById("nome-amigo-ativo");
    const statusAmigoAtivo = document.getElementById("status-amigo-ativo");
    const inputBuscaDesktop = document.getElementById("input-busca-mensagens");
    const inputBuscaMobile = document.getElementById("input-busca-mobile");
    const inputMensagem = document.getElementById("input-mensagem-dm");
    const erroMensagem = document.getElementById("erro-mensagem-dm");
    const formMensagem = document.getElementById("form-mensagem-dm");
    const listaMensagens = document.getElementById("lista-mensagens-dm");
    const containerMensagens = document.getElementById("container-mensagens");

    function renderizarConversa(chaveAmigo) {
        const dados = conversas[chaveAmigo];
        if (!dados) return;

        amigoAtual = chaveAmigo;
        itensDm.forEach((item) => item.classList.toggle("ativo", item.dataset.amigo === chaveAmigo));
        nomeAmigoAtivo.textContent = dados.nome;
        statusAmigoAtivo.className = `ponto-status ${dados.status}`;
        inputBuscaDesktop.placeholder = `Buscar ${dados.nome}`;
        inputMensagem.placeholder = `Conversar em @${dados.nome}`;
        document.getElementById("texto-chamada").textContent = `Em chamada de voz com ${dados.nome}`;

        listaMensagens.innerHTML = "";

        const divisor = document.createElement("div");
        divisor.className = "divisor-data";
        divisor.innerHTML = `<span>${dados.data}</span>`;
        listaMensagens.appendChild(divisor);

        dados.mensagens.forEach((msg) => {
            listaMensagens.appendChild(criarElementoMensagem(msg));
        });

        containerMensagens.scrollTop = containerMensagens.scrollHeight;
    }

    function criarElementoMensagem(msg) {
        const article = document.createElement("article");
        article.className = "item-mensagem";

        const avatar = document.createElement("div");
        avatar.className = "avatar-mensagem";
        avatar.setAttribute("role", "img");
        avatar.setAttribute("aria-label", `Avatar de ${msg.autor}`);

        const conteudo = document.createElement("div");
        conteudo.className = "conteudo-mensagem";

        const meta = document.createElement("div");
        meta.className = "meta-mensagem";

        const autor = document.createElement("strong");
        autor.className = "autor-mensagem";
        autor.textContent = msg.autor;

        const hora = document.createElement("time");
        hora.className = "hora-mensagem";
        hora.textContent = msg.hora;

        const texto = document.createElement("p");
        texto.className = "texto-mensagem";
        texto.textContent = msg.texto;

        meta.append(autor, hora);
        conteudo.append(meta, texto);
        article.append(avatar, conteudo);

        return article;
    }

    // alternar entre amigos na barra lateral
    itensDm.forEach((btn) => {
        btn.addEventListener("click", () => {
            renderizarConversa(btn.dataset.amigo);
            const parametros = new URLSearchParams(window.location.search);
            parametros.set("amigo", btn.dataset.amigo);
            history.replaceState(null, "", `${window.location.pathname}?${parametros}`);
        });
    });

    // envio de mensagem com validaçao
    formMensagem.addEventListener("submit", (e) => {
        e.preventDefault();
        const texto = inputMensagem.value.trim();

        if (!texto) {
            erroMensagem.textContent = "Digite uma mensagem antes de enviar.";
            inputMensagem.focus();
            return;
        }

        erroMensagem.textContent = "";
        const agora = new Date();
        const horaAtual = agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const novaMsg = {
            autor: JSON.parse(localStorage.getItem("mock_discord_usuario") || localStorage.getItem("usuarioLogado") || "null")?.username || "Você",
            hora: horaAtual,
            texto: texto
        };

        conversas[amigoAtual].mensagens.push(novaMsg);
        localStorage.setItem("mock_discord_conversas", JSON.stringify(conversas));
        listaMensagens.appendChild(criarElementoMensagem(novaMsg));
        containerMensagens.scrollTop = containerMensagens.scrollHeight;
        inputMensagem.value = "";
    });

    // filtro de busca de mensagens
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

    // Alternância da barra de busca em telas pequenas.
    const btnBuscaMobile = document.getElementById("btn-busca-mobile");
    const barraBuscaMobile = document.getElementById("barra-busca-mobile");
    btnBuscaMobile.addEventListener("click", () => {
        barraBuscaMobile.classList.toggle("aberta");
        if (barraBuscaMobile.classList.contains("aberta")) {
            inputBuscaMobile.focus();
        }
    });

    // filtro na lista de DMs da barra lateral
    const inputBuscaDm = document.getElementById("busca-dm");
    inputBuscaDm.addEventListener("input", () => {
        const termo = inputBuscaDm.value.toLowerCase().trim();
        document.querySelectorAll(".lista-dms li").forEach((li) => {
            const nome = li.querySelector(".nome-dm").textContent.toLowerCase();
            li.style.display = nome.includes(termo) ? "block" : "none";
        });
    });

    // simulação de chamada de voz
    const btnChamada = document.getElementById("btn-iniciar-chamada");
    const bannerChamada = document.getElementById("banner-chamada");
    const btnEncerrarChamada = document.getElementById("btn-encerrar-chamada");

    btnChamada.addEventListener("click", () => {
        bannerChamada.hidden = false;
    });

    btnEncerrarChamada.addEventListener("click", () => {
        bannerChamada.hidden = true;
    });

    // controles de microfone e áudio
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

    renderizarConversa(amigoAtual);
});