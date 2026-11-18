//esse arquivo irá ser excluido futuramente com a implenteacao do php e do banco de dados, mas por enquanto ele é necessário para o funcionamento do mock discord
document.addEventListener("DOMContentLoaded", () => {
    const listaTexto = document.getElementById("lista-canais-texto");
    const listaVoz = document.getElementById("lista-canais-voz");
    const tituloCanal = document.getElementById("titulo-canal-ativo");
    const inputMensagem = document.getElementById("input-mensagem");
    const erroMensagem = document.getElementById("erro-mensagem");
    const formularioMensagem = document.getElementById("form-mensagem");
    const listaMensagens = document.getElementById("lista-mensagens");
    const inputBusca = document.getElementById("campo-busca-mensagens");
    const dialogoCanal = document.getElementById("dialogo-canal");
    const formularioCanal = document.getElementById("form-dialogo-canal");
    const inputNomeCanal = document.getElementById("input-nome-canal");
    const erroDialogo = document.getElementById("erro-dialogo-canal");
    const usuarioSalvo = JSON.parse(
        localStorage.getItem("mock_discord_usuario") ||
        localStorage.getItem("usuarioLogado") ||
        "null"
    );
    const nomeUsuario = usuarioSalvo?.username || usuarioSalvo?.nome || "Você";
    const chaveCanais = "mock_discord_canais_servidor";
    const chaveHistorico = "mock_discord_mensagens_canais";
    const parametros = new URLSearchParams(window.location.search);
    const servidorSelecionado = parametros.get("servidor") || "Comunidade IFC";
    const permissoes = window.permissoesServidor;
    if (permissoes.servidorFoiExcluido(servidorSelecionado)) {
        window.location.replace("inicio.html");
        return;
    }
    const cargoUsuario = permissoes.obterCargo(servidorSelecionado);
    const podeGerenciarCanais = permissoes.podeGerenciarServidor(servidorSelecionado);
    const servidorPersonalizado = servidorSelecionado !== "Comunidade IFC";
    const configServidor = JSON.parse(localStorage.getItem("mock_discord_server_config") || "null");
    const nomeServidor = servidorSelecionado === "Comunidade IFC"
        ? configServidor?.nome || servidorSelecionado
        : servidorSelecionado;
    const todosCanais = JSON.parse(localStorage.getItem(chaveCanais) || "{}") || {};
    const mensagensPorCanal = JSON.parse(localStorage.getItem(chaveHistorico) || "{}") || {};
    const canaisSalvos = todosCanais[servidorSelecionado];
    let canalAtivoId = null;
    let operacaoDialogo = null;
    let canalNoMenu = null;

    document.querySelectorAll(".nome-servidor").forEach((elemento) => {
        elemento.textContent = nomeServidor;
    });

    document.querySelectorAll(".barra-servidores [data-servidor]").forEach((icone) => {
        const nome = icone.dataset.servidor;
        const estaAtivo = nome === servidorSelecionado;
        icone.classList.toggle("ativo", estaAtivo);
        icone.href = `servidor.html?${new URLSearchParams({ servidor: nome })}`;
        if (estaAtivo) {
            icone.setAttribute("aria-current", "page");
        } else {
            icone.removeAttribute("aria-current");
        }
    });

    const linkConfiguracoes = document.getElementById("link-config-servidor");
    if (linkConfiguracoes) {
        linkConfiguracoes.href = `config-servidor.html?${new URLSearchParams({ servidor: servidorSelecionado })}`;
        linkConfiguracoes.hidden = !podeGerenciarCanais;
        linkConfiguracoes.setAttribute(
            "aria-label",
            podeGerenciarCanais ? "Configurações do servidor" : `Seu cargo é ${cargoUsuario}; sem acesso às configurações`
        );
    }

    ["botao-adicionar-texto", "botao-adicionar-voz"].forEach((id) => {
        const botao = document.getElementById(id);
        botao.disabled = !podeGerenciarCanais;
        if (!podeGerenciarCanais) {
            botao.title = "Somente administradores e moderadores podem criar canais.";
        }
    });
    const botaoConvidar = document.getElementById("botao-convidar-servidor");
    botaoConvidar.disabled = !podeGerenciarCanais;
    if (!podeGerenciarCanais) {
        botaoConvidar.title = "Somente administradores e moderadores podem convidar pessoas.";
    }

    function lerCanaisDaLista(lista, atributo, prefixo) {
        return Array.from(lista.querySelectorAll(".item-canal"), (item, indice) => {
            const nome = item.dataset[atributo] || item.querySelector("span")?.textContent.trim();
            return {
                id: item.dataset.id || `${prefixo}-${indice}-${nome}`,
                nome
            };
        }).filter((canal) => canal.nome);
    }

    function normalizarCanais(canais, tipo) {
        if (!Array.isArray(canais)) return [];
        return canais.map((canal, indice) => {
            if (typeof canal === "string") {
                return { id: `${tipo}-${indice}-${canal}`, nome: canal };
            }
            if (!canal || typeof canal.nome !== "string") return null;
            return {
                id: String(canal.id || `${tipo}-${indice}-${canal.nome}`),
                nome: canal.nome
            };
        }).filter((canal) => canal && canal.nome.trim());
    }

    const canaisServidor = canaisSalvos
        ? {
            texto: normalizarCanais(canaisSalvos.texto, "texto"),
            voz: normalizarCanais(canaisSalvos.voz, "voz")
        }
        : servidorPersonalizado
            ? {
                texto: [{ id: "texto-geral", nome: "geral" }],
                voz: [{ id: "voz-geral", nome: "geral" }]
            }
            : {
                texto: lerCanaisDaLista(listaTexto, "canal", "texto"),
                voz: lerCanaisDaLista(listaVoz, "voz", "voz")
            };

    if (canaisServidor.texto.length === 0) {
        canaisServidor.texto = [{ id: "texto-geral", nome: "geral" }];
    }
    if (!Array.isArray(canaisServidor.voz)) {
        canaisServidor.voz = [{ id: "voz-geral", nome: "geral" }];
    }

    const nomeAtivoInicial = listaTexto.querySelector(".item-canal.ativo")?.dataset.canal;
    canalAtivoId = canaisServidor.texto.find((canal) => canal.nome === nomeAtivoInicial)?.id
        || canaisServidor.texto[0].id;

    function salvarCanais() {
        todosCanais[servidorSelecionado] = canaisServidor;
        localStorage.setItem(chaveCanais, JSON.stringify(todosCanais));
    }

    function gerarIdCanal(tipo) {
        return `${tipo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function criarItemCanal(canal, tipo) {
        const item = document.createElement("li");
        item.className = "item-canal";
        item.dataset.id = canal.id;
        item.dataset[tipo === "texto" ? "canal" : "voz"] = canal.nome;
        if (tipo === "voz") item.classList.add("item-voz");
        if (tipo === "texto" && canal.id === canalAtivoId) item.classList.add("ativo");

        const icone = document.createElement("i");
        icone.className = tipo === "texto" ? "bi bi-hash" : "bi bi-volume-up-fill";
        icone.setAttribute("aria-hidden", "true");

        const nome = document.createElement("span");
        nome.textContent = canal.nome;
        item.append(icone, nome);
        return item;
    }

    function renderizarListas() {
        listaTexto.replaceChildren(...canaisServidor.texto.map((canal) => criarItemCanal(canal, "texto")));
        listaVoz.replaceChildren(...canaisServidor.voz.map((canal) => criarItemCanal(canal, "voz")));
    }

    function chaveHistoricoCanal(canal) {
        return `${servidorSelecionado}::${canal.id}`;
    }

    function salvarMensagens() {
        localStorage.setItem(chaveHistorico, JSON.stringify(mensagensPorCanal));
    }

    function obterMensagens(canal) {
        const chave = chaveHistoricoCanal(canal);
        if (!Array.isArray(mensagensPorCanal[chave])) {
            const historicoAntigo = !servidorPersonalizado && mensagensPorCanal[canal.nome];
            mensagensPorCanal[chave] = Array.isArray(historicoAntigo) ? historicoAntigo : [];
            if (mensagensPorCanal[chave].length) salvarMensagens();
        }
        return mensagensPorCanal[chave];
    }

    function criarMensagem(mensagem) {
        const artigo = document.createElement("article");
        artigo.className = "item-mensagem";

        const avatar = document.createElement("div");
        avatar.className = "avatar-mensagem";

        const conteudo = document.createElement("div");
        conteudo.className = "conteudo-mensagem";

        const metadados = document.createElement("div");
        metadados.className = "metadados-mensagem";

        const autor = document.createElement("strong");
        autor.className = "autor-mensagem";
        autor.textContent = mensagem.autor;

        const horario = document.createElement("time");
        horario.className = "horario-mensagem";
        horario.textContent = `${mensagem.data}, ${mensagem.hora}`;

        const texto = document.createElement("p");
        texto.className = "texto-mensagem";
        texto.textContent = mensagem.texto;

        metadados.append(autor, horario);
        conteudo.append(metadados, texto);
        artigo.append(avatar, conteudo);
        return artigo;
    }

    function mostrarEstadoVazio() {
        const estado = document.createElement("div");
        estado.className = "estado-vazio";

        const icone = document.createElement("i");
        icone.className = "bi bi-chat-dots";
        icone.setAttribute("aria-hidden", "true");

        const titulo = document.createElement("h3");
        titulo.textContent = "Este canal ainda está vazio";

        const descricao = document.createElement("p");
        descricao.textContent = "Envie a primeira mensagem para começar a conversa.";

        estado.append(icone, titulo, descricao);
        listaMensagens.appendChild(estado);
    }

    function renderizarCanal(canal) {
        canalAtivoId = canal.id;
        listaTexto.querySelectorAll(".item-canal").forEach((item) => {
            item.classList.toggle("ativo", item.dataset.id === canalAtivoId);
        });
        tituloCanal.textContent = canal.nome;
        inputMensagem.placeholder = `Conversar em #${canal.nome}`;
        listaMensagens.replaceChildren();

        const mensagens = obterMensagens(canal);
        if (mensagens.length === 0) {
            mostrarEstadoVazio();
        } else {
            mensagens.forEach((mensagem) => listaMensagens.appendChild(criarMensagem(mensagem)));
        }

        if (inputBusca) inputBusca.value = "";
        listaMensagens.scrollTop = listaMensagens.scrollHeight;
    }

    function abrirDialogo(acao, tipo, canal = null) {
        if (!podeGerenciarCanais) return;
        operacaoDialogo = { acao, tipo, canal };
        erroDialogo.textContent = "";
        document.getElementById("titulo-dialogo-canal").textContent =
            acao === "criar" ? `Criar canal de ${tipo}` : "Renomear canal";
        document.getElementById("confirmar-dialogo-canal").textContent =
            acao === "criar" ? "Criar canal" : "Salvar";
        inputNomeCanal.value = canal?.nome || "";
        inputNomeCanal.placeholder = tipo === "texto" ? "ex.: conversas" : "ex.: geral";
        dialogoCanal.showModal();
        inputNomeCanal.focus();
        inputNomeCanal.select();
    }

    function fecharMenuContextual() {
        menuContextual.hidden = true;
        canalNoMenu = null;
    }

    const menuContextual = document.createElement("div");
    menuContextual.className = "menu-contextual-canal";
    menuContextual.setAttribute("role", "menu");
    menuContextual.hidden = true;
    menuContextual.innerHTML = `
        <button type="button" role="menuitem" data-acao="renomear">Renomear canal</button>
        <button type="button" role="menuitem" data-acao="excluir">Excluir canal</button>
    `;
    document.body.appendChild(menuContextual);

    function abrirMenuContextual(evento, tipo) {
        if (!podeGerenciarCanais) return;
        const item = evento.target.closest(".item-canal");
        if (!item) return;
        evento.preventDefault();

        const canal = canaisServidor[tipo].find((itemCanal) => itemCanal.id === item.dataset.id);
        if (!canal) return;
        canalNoMenu = { tipo, canal };
        menuContextual.querySelector('[data-acao="excluir"]').disabled =
            tipo === "texto" && canaisServidor.texto.length === 1;
        menuContextual.hidden = false;
        menuContextual.style.left = "0px";
        menuContextual.style.top = "0px";
        const dimensoes = menuContextual.getBoundingClientRect();
        menuContextual.style.left = `${Math.max(8, Math.min(evento.clientX, window.innerWidth - dimensoes.width - 8))}px`;
        menuContextual.style.top = `${Math.max(8, Math.min(evento.clientY, window.innerHeight - dimensoes.height - 8))}px`;
    }

    listaTexto.addEventListener("click", (evento) => {
        const item = evento.target.closest(".item-canal");
        if (!item) return;
        const canal = canaisServidor.texto.find((itemCanal) => itemCanal.id === item.dataset.id);
        if (canal) renderizarCanal(canal);
    });

    listaTexto.addEventListener("contextmenu", (evento) => abrirMenuContextual(evento, "texto"));
    listaVoz.addEventListener("contextmenu", (evento) => abrirMenuContextual(evento, "voz"));

    listaVoz.addEventListener("click", (evento) => {
        const item = evento.target.closest(".item-canal");
        if (!item) return;
        listaVoz.querySelectorAll(".item-canal").forEach((canal) => {
            canal.classList.toggle("ativo", canal === item);
        });
    });

    document.addEventListener("click", (evento) => {
        if (!menuContextual.contains(evento.target)) fecharMenuContextual();
    });

    menuContextual.addEventListener("click", (evento) => {
        if (!podeGerenciarCanais) return;
        const botao = evento.target.closest("button[data-acao]");
        if (!botao || !canalNoMenu) return;
        const { tipo, canal } = canalNoMenu;
        fecharMenuContextual();

        if (botao.dataset.acao === "renomear") {
            abrirDialogo("renomear", tipo, canal);
            return;
        }

        if (tipo === "texto" && canaisServidor.texto.length === 1) {
            return;
        }

        if (tipo === "texto" && !servidorPersonalizado && !Array.isArray(mensagensPorCanal[chaveHistoricoCanal(canal)])) {
            const historicoAntigo = mensagensPorCanal[canal.nome];
            if (Array.isArray(historicoAntigo)) delete mensagensPorCanal[canal.nome];
        }
        delete mensagensPorCanal[chaveHistoricoCanal(canal)];
        canaisServidor[tipo] = canaisServidor[tipo].filter((item) => item.id !== canal.id);
        salvarCanais();
        if (tipo === "texto" && canalAtivoId === canal.id) {
            canalAtivoId = canaisServidor.texto[0].id;
        }
        renderizarListas();
        if (tipo === "texto") {
            renderizarCanal(canaisServidor.texto.find((item) => item.id === canalAtivoId));
        }
        salvarMensagens();
    });

    formularioCanal.addEventListener("submit", (evento) => {
        evento.preventDefault();
        if (!podeGerenciarCanais) return;
        const nome = inputNomeCanal.value.trim();
        if (!nome) {
            erroDialogo.textContent = "Digite um nome para o canal.";
            inputNomeCanal.focus();
            return;
        }

        const { acao, tipo, canal } = operacaoDialogo;
        const nomeDuplicado = canaisServidor[tipo].some((item) =>
            item.id !== canal?.id && item.nome.toLocaleLowerCase() === nome.toLocaleLowerCase()
        );
        if (nomeDuplicado) {
            erroDialogo.textContent = "Já existe um canal com esse nome.";
            inputNomeCanal.focus();
            return;
        }

        if (acao === "criar") {
            const novoCanal = { id: gerarIdCanal(tipo), nome };
            canaisServidor[tipo].push(novoCanal);
            if (tipo === "texto") canalAtivoId = novoCanal.id;
        } else {
            if (tipo === "texto" && !servidorPersonalizado && !Array.isArray(mensagensPorCanal[chaveHistoricoCanal(canal)])) {
                const historicoAntigo = mensagensPorCanal[canal.nome];
                if (Array.isArray(historicoAntigo)) {
                    mensagensPorCanal[chaveHistoricoCanal(canal)] = historicoAntigo;
                    delete mensagensPorCanal[canal.nome];
                }
            }
            canal.nome = nome;
        }

        salvarCanais();
        renderizarListas();
        if (tipo === "texto") {
            renderizarCanal(canaisServidor.texto.find((item) => item.id === canalAtivoId));
        }
        salvarMensagens();
        dialogoCanal.close();
    });

    document.getElementById("cancelar-dialogo-canal").addEventListener("click", () => dialogoCanal.close());
    dialogoCanal.addEventListener("click", (evento) => {
        if (evento.target === dialogoCanal) dialogoCanal.close();
    });
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharMenuContextual();
    });

    document.getElementById("botao-adicionar-texto").addEventListener("click", () => {
        abrirDialogo("criar", "texto");
    });
    document.getElementById("botao-adicionar-voz").addEventListener("click", () => {
        abrirDialogo("criar", "voz");
    });

    formularioMensagem.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const texto = inputMensagem.value.trim();
        if (!texto) {
            erroMensagem.textContent = "Não é possível enviar uma mensagem vazia.";
            inputMensagem.focus();
            return;
        }

        erroMensagem.textContent = "";
        const canal = canaisServidor.texto.find((item) => item.id === canalAtivoId);
        if (!canal) return;
        const agora = new Date();
        const mensagens = obterMensagens(canal);
        const novaMensagem = {
            autor: nomeUsuario,
            data: agora.toLocaleDateString("pt-BR"),
            hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            texto
        };

        mensagens.push(novaMensagem);
        salvarMensagens();
        listaMensagens.querySelector(".estado-vazio")?.remove();
        listaMensagens.appendChild(criarMensagem(novaMensagem));
        listaMensagens.scrollTop = listaMensagens.scrollHeight;
        inputMensagem.value = "";
    });

    const btnMic = document.getElementById("botao-microfone");
    const btnAudio = document.getElementById("botao-audio");

    btnMic.addEventListener("click", () => {
        btnMic.classList.toggle("silenciado");
        const icone = btnMic.querySelector("i");
        icone.className = btnMic.classList.contains("silenciado")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });

    btnAudio.addEventListener("click", () => {
        btnAudio.classList.toggle("silenciado");
    });

    renderizarListas();
    salvarCanais();
    renderizarCanal(canaisServidor.texto.find((canal) => canal.id === canalAtivoId));
});
