document.addEventListener("DOMContentLoaded", () => {
    const socket = window.mockDiscordSocket
        || (typeof window.io === "function" ? window.io({ withCredentials: true }) : null);
    if (socket) window.mockDiscordSocket = socket;

    const listaAmigos = document.getElementById("lista-amigos");
    const listaDms = document.getElementById("lista-dms");
    const listaSolicitacoes = document.getElementById("lista-solicitacoes");
    const vazioSolicitacoes = document.getElementById("vazio-solicitacoes");
    const avisoSolicitacoes = document.getElementById("aviso-solicitacoes");
    const abaSolicitacoes = document.querySelector('[data-filtro="solicitacoes"]');
    const formularioAmigo = document.getElementById("form-adicionar-amigo");
    const feedbackAmigo = document.getElementById("feedback-amigo");
    const dialogoConvite = document.getElementById("dialogo-convidar-amigo");
    const listaConvite = document.getElementById("lista-amigos-convite");
    const vazioConvite = document.getElementById("vazio-amigos-convite");
    const feedbackConvite = document.getElementById("feedback-convite-servidor");
    const listaMembros = document.getElementById("lista-membros-servidor");
    const listaAtivoAgora = document.getElementById("lista-ativo-agora");
    const usuarioAtualId = Number(document.querySelector(".layout-aplicativo")?.dataset.usuarioId);
    let amigosConhecidos = [];
    let membrosServidorAtuais = [];
    const usuariosOnline = new Set(window.mockDiscordOnlineIds || []);

    function usuarioEstaOnline(usuarioId) {
        return Number(usuarioId) === usuarioAtualId || usuariosOnline.has(Number(usuarioId));
    }

    function atualizarStatusAmigos() {
        amigosConhecidos.forEach((amigo) => {
            const online = usuariosOnline.has(Number(amigo.id));
            const itemAmigo = listaAmigos?.querySelector(`.item-amigo[data-usuario-id="${Number(amigo.id)}"]`);
            if (itemAmigo) itemAmigo.dataset.status = online ? "online" : "offline";

            const pontoStatus = listaDms?.querySelector(`.item-dm[data-amigo="${Number(amigo.id)}"] .ponto-status`);
            if (pontoStatus) {
                pontoStatus.className = `ponto-status ${online ? "online" : "offline"}`;
                pontoStatus.setAttribute("aria-label", online ? "Online" : "Offline");
            }
        });
        renderizarAmigosOnline();
        if (listaMembros && membrosServidorAtuais.length > 0) {
            renderizarMembros(membrosServidorAtuais);
        }
        window.dispatchEvent(new Event("mock-discord:presence-updated"));
    }

    function renderizarAmigosOnline() {
        if (!listaAtivoAgora) return;
        const online = amigosConhecidos.filter((amigo) => usuariosOnline.has(Number(amigo.id)));
        listaAtivoAgora.replaceChildren();

        if (online.length === 0) {
            const vazio = document.createElement("p");
            vazio.className = "vazio-amigos-online";
            vazio.textContent = "Nenhum amigo está online agora.";
            listaAtivoAgora.appendChild(vazio);
            return;
        }

        online.forEach((amigo) => {
            const link = document.createElement("a");
            link.className = "amigo-online";
            link.href = `dm.php?amigo=${encodeURIComponent(amigo.id)}`;
            link.setAttribute("aria-label", `Conversar com ${amigo.apelido}, online`);

            const avatar = criarAvatar("avatar-ativo-agora", amigo.foto_perfil);
            const ponto = document.createElement("span");
            ponto.className = "ponto-status online";
            ponto.setAttribute("aria-hidden", "true");
            avatar.appendChild(ponto);

            const identidade = document.createElement("span");
            identidade.className = "info-amigo-ativo";
            const nome = document.createElement("strong");
            nome.textContent = amigo.apelido;
            const status = document.createElement("span");
            status.textContent = "Online";
            identidade.append(nome, status);
            link.append(avatar, identidade);
            listaAtivoAgora.appendChild(link);
        });
    }

    async function requisitar(url, opcoes = {}, token = "") {
        const headers = { ...(opcoes.headers || {}) };
        if (opcoes.body) headers["Content-Type"] = "application/json";
        if (token) headers["X-CSRF-Token"] = token;

        const resposta = await fetch(url, {
            ...opcoes,
            headers,
            credentials: "same-origin",
            cache: "no-store"
        });
        let dados;
        try {
            dados = await resposta.json();
        } catch {
            throw new Error("O servidor retornou uma resposta inválida.");
        }
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível concluir a operação.");
        return dados;
    }

    function criarIdentidade(apelido, id) {
        const identidade = document.createElement("span");
        identidade.className = "amigo-texto";
        const nome = document.createElement("strong");
        nome.textContent = apelido;
        const identificador = document.createElement("span");
        identificador.textContent = `#${id}`;
        identidade.append(nome, identificador);
        return identidade;
    }

    function criarAvatar(classe = "avatar-amigo", url = "") {
        const avatar = document.createElement("span");
        avatar.className = classe;
        avatar.setAttribute("aria-hidden", "true");
        if (url) {
            const imagem = document.createElement("img");
            imagem.src = url;
            imagem.alt = "";
            avatar.appendChild(imagem);
        }
        return avatar;
    }

    async function carregarAmigos() {
        if (!listaAmigos) return;
        const dados = await requisitar("includes/amigos.php");
        amigosConhecidos = dados.amigos;
        listaAmigos.replaceChildren();
        renderizarListaDms(dados.amigos);

        dados.amigos.forEach((amigo) => {
            const item = document.createElement("li");
            item.className = "item-amigo";
            item.dataset.usuarioId = amigo.id;
            item.dataset.status = usuariosOnline.has(Number(amigo.id)) ? "online" : "offline";

            const informacoes = document.createElement("div");
            informacoes.className = "amigo-info abrir-dm";
            const abrirConversa = document.createElement("a");
            abrirConversa.className = "amigo-info-link";
            abrirConversa.href = `dm.php?amigo=${encodeURIComponent(amigo.id)}`;
            abrirConversa.setAttribute("aria-label", `Conversar com ${amigo.apelido}`);
            informacoes.append(criarAvatar("avatar-amigo", amigo.foto_perfil), criarIdentidade(amigo.apelido, amigo.id));
            while (informacoes.firstChild) abrirConversa.appendChild(informacoes.firstChild);
            item.appendChild(abrirConversa);
            listaAmigos.appendChild(item);
        });

        const contador = document.getElementById("contador-amigos");
        if (contador) contador.textContent = `AMIGOS — ${dados.amigos.length}`;

        listaSolicitacoes?.replaceChildren();
        if (avisoSolicitacoes) avisoSolicitacoes.hidden = dados.solicitacoes.length === 0;
        if (abaSolicitacoes) {
            const quantidade = dados.solicitacoes.length;
            abaSolicitacoes.setAttribute(
                "aria-label",
                quantidade === 0
                    ? "Solicitações"
                    : `Solicitações, ${quantidade} ${quantidade === 1 ? "pedido pendente" : "pedidos pendentes"}`
            );
        }
        dados.solicitacoes.forEach((solicitacao) => {
            const item = document.createElement("li");
            item.className = "item-amigo";

            const informacoes = document.createElement("div");
            informacoes.className = "amigo-info";
            informacoes.append(criarAvatar(), criarIdentidade(solicitacao.apelido, solicitacao.usuario_id));

            const acoes = document.createElement("div");
            acoes.className = "acoes-solicitacao";
            ["aceitar", "recusar"].forEach((resposta) => {
                const botao = document.createElement("button");
                botao.type = "button";
                botao.dataset.resposta = resposta;
                botao.textContent = resposta === "aceitar" ? "Aceitar" : "Recusar";
                botao.addEventListener("click", () => responderSolicitacao(solicitacao, resposta, botao));
                acoes.appendChild(botao);
            });

            item.append(informacoes, acoes);
            listaSolicitacoes?.appendChild(item);
        });
        if (vazioSolicitacoes) vazioSolicitacoes.hidden = dados.solicitacoes.length !== 0;
    }

    function renderizarListaDms(amigos) {
        if (!listaDms) return;
        const amigoAtivo = new URLSearchParams(window.location.search).get("amigo");
        listaDms.replaceChildren();

        amigos.forEach((amigo) => {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.className = `item-dm${String(amigo.id) === amigoAtivo ? " ativo" : ""}`;
            link.href = `dm.php?amigo=${encodeURIComponent(amigo.id)}`;
            link.dataset.amigo = amigo.id;

            const avatar = document.createElement("span");
            avatar.className = "avatar-dm";
            if (amigo.foto_perfil) {
                const imagem = document.createElement("img");
                imagem.src = amigo.foto_perfil;
                imagem.alt = "";
                avatar.appendChild(imagem);
            }
            const status = document.createElement("span");
            const online = usuariosOnline.has(Number(amigo.id));
            status.className = `ponto-status ${online ? "online" : "offline"}`;
            status.setAttribute("aria-label", online ? "Online" : "Offline");
            avatar.appendChild(status);

            const nome = document.createElement("span");
            nome.className = "nome-dm";
            nome.textContent = amigo.apelido;
            link.append(avatar, nome);
            item.appendChild(link);
            listaDms.appendChild(item);
        });

        if (amigos.length === 0) {
            const vazio = document.createElement("li");
            vazio.className = "lista-dms-vazia";
            vazio.textContent = "Adicione amigos para começar uma conversa.";
            listaDms.appendChild(vazio);
        }
        atualizarStatusAmigos();
    }

    async function responderSolicitacao(solicitacao, resposta, botao) {
        botao.disabled = true;
        try {
            const dados = await requisitar("includes/amigos.php", {
                method: "POST",
                body: JSON.stringify({
                    acao: "responder",
                    solicitacaoId: solicitacao.id,
                    resposta
                })
            }, formularioAmigo?.dataset.csrfToken || "");
            if (feedbackAmigo) feedbackAmigo.textContent = dados.mensagem;
            socket?.emit("amigos:atualizar", { usuarioId: Number(dados.notificarUsuarioId) });
            socket?.emit("presence:request");
            await carregarAmigos();
        } catch (erro) {
            botao.disabled = false;
            if (feedbackAmigo) feedbackAmigo.textContent = erro.message;
        }
    }

    formularioAmigo?.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const input = document.getElementById("input-novo-amigo");
        const botao = formularioAmigo.querySelector("button[type='submit']");
        botao.disabled = true;
        if (feedbackAmigo) feedbackAmigo.textContent = "";

        try {
            const dados = await requisitar("includes/amigos.php", {
                method: "POST",
                body: JSON.stringify({ acao: "enviar", identificador: input.value.trim() })
            }, formularioAmigo.dataset.csrfToken);
            if (feedbackAmigo) feedbackAmigo.textContent = dados.mensagem;
            input.value = "";
            socket?.emit("amigos:atualizar", { usuarioId: Number(dados.notificarUsuarioId) });
            socket?.emit("presence:request");
            await carregarAmigos();
        } catch (erro) {
            if (feedbackAmigo) feedbackAmigo.textContent = erro.message;
        } finally {
            botao.disabled = false;
        }
    });

    function renderizarMembros(membros) {
        if (!listaMembros) return;
        membrosServidorAtuais = membros;
        listaMembros.replaceChildren();
        const membrosOnline = membros.filter((membro) => usuarioEstaOnline(membro.id));
        const membrosOffline = membros.filter((membro) => !usuarioEstaOnline(membro.id));

        function adicionarGrupoMembros(titulo, grupo) {
            if (grupo.length === 0) return;
            const cabecalho = document.createElement("li");
            cabecalho.className = "grupo-membros-titulo";
            cabecalho.textContent = `${titulo} — ${grupo.length}`;
            listaMembros.appendChild(cabecalho);

            grupo.forEach((membro) => {
                const item = document.createElement("li");
                item.className = "membro-servidor";
                item.dataset.usuarioId = membro.id;

                const avatar = document.createElement("span");
                avatar.className = "avatar-membro";
                avatar.setAttribute("aria-hidden", "true");
                if (membro.foto_perfil) {
                    const imagem = document.createElement("img");
                    imagem.src = membro.foto_perfil;
                    imagem.alt = "";
                    avatar.appendChild(imagem);
                } else {
                    const icone = document.createElement("i");
                    icone.className = "bi bi-person-fill";
                    avatar.appendChild(icone);
                }
                const status = document.createElement("span");
                const online = usuarioEstaOnline(membro.id);
                status.className = `status-membro ${online ? "online" : "offline"}`;
                status.setAttribute("aria-label", online ? "Online" : "Offline");
                avatar.appendChild(status);

                const nome = document.createElement("span");
                nome.textContent = membro.apelido;
                const identificador = document.createElement("small");
                identificador.textContent = `#${membro.id}`;
                item.append(avatar, nome, identificador);
                listaMembros.appendChild(item);
            });
        }

        adicionarGrupoMembros("Online", membrosOnline);
        adicionarGrupoMembros("Offline", membrosOffline);
        const quantidadeMembros = document.getElementById("quantidade-membros");
        if (quantidadeMembros) quantidadeMembros.textContent = String(membros.length);
    }

    function renderizarAmigosConvite(amigos) {
        if (!listaConvite) return;
        listaConvite.replaceChildren();
        amigos.forEach((amigo) => {
            const item = document.createElement("li");
            item.className = "amigo-convite";

            const identidade = document.createElement("span");
            identidade.className = "amigo-convite-identidade";
            const nome = document.createElement("strong");
            nome.textContent = amigo.apelido;
            const identificador = document.createElement("small");
            identificador.textContent = `#${amigo.id}`;
            identidade.append(nome, identificador);

            const botao = document.createElement("button");
            botao.type = "button";
            botao.disabled = Number(amigo.membro) === 1;
            botao.textContent = botao.disabled ? "Já é membro" : "Adicionar";
            botao.addEventListener("click", () => adicionarAmigoAoServidor(amigo.id, botao));
            item.append(identidade, botao);
            listaConvite.appendChild(item);
        });
        if (vazioConvite) vazioConvite.hidden = amigos.length !== 0;
    }

    async function carregarMembrosServidor() {
        if (!listaMembros || !dialogoConvite) return;
        const servidorId = Number(listaMembros.dataset.servidorId);
        const dados = await requisitar(`includes/membrosServidor.php?servidor=${servidorId}`);
        renderizarMembros(dados.membros);
        renderizarAmigosConvite(dados.amigos);
    }

    async function atualizarBarraServidores() {
        const barra = document.querySelector(".barra-servidores");
        const botaoAdicionar = barra?.querySelector(".adicionar-servidor");
        if (!barra || !botaoAdicionar) return;

        const dados = await requisitar("includes/servidoresUsuario.php");
        barra.querySelectorAll("a[data-servidor-id]").forEach((item) => item.remove());
        const servidorAtual = Number(new URLSearchParams(window.location.search).get("servidor"));

        dados.servidores.forEach((servidor) => {
            const link = document.createElement("a");
            link.href = `servidor.php?servidor=${Number(servidor.id)}`;
            link.dataset.servidorId = servidor.id;
            link.className = `icone-servidor${servidorAtual === Number(servidor.id) ? " ativo" : ""}`;
            link.title = servidor.nome;
            link.setAttribute("aria-label", servidor.nome);
            if (servidorAtual === Number(servidor.id)) {
                link.setAttribute("aria-current", "page");
            }

            if (servidor.icone) {
                const imagem = document.createElement("img");
                imagem.src = servidor.icone;
                imagem.alt = "";
                link.appendChild(imagem);
            } else {
                const icone = document.createElement("i");
                icone.className = "bi bi-people-fill";
                icone.setAttribute("aria-hidden", "true");
                link.appendChild(icone);
            }
            barra.insertBefore(link, botaoAdicionar);
        });
    }

    async function adicionarAmigoAoServidor(usuarioId, botao) {
        botao.disabled = true;
        if (feedbackConvite) feedbackConvite.textContent = "";
        try {
            const servidorId = Number(dialogoConvite.dataset.servidorId);
            const dados = await requisitar(`includes/membrosServidor.php?servidor=${servidorId}`, {
                method: "POST",
                body: JSON.stringify({ usuarioId })
            }, dialogoConvite.dataset.csrfToken);
            if (feedbackConvite) feedbackConvite.textContent = dados.mensagem;
            socket?.emit("servidor:membros-alterados", { servidorId });
            socket?.emit("servidor:novo-membro", { usuarioId, servidorId });
            await carregarMembrosServidor();
        } catch (erro) {
            botao.disabled = false;
            if (feedbackConvite) feedbackConvite.textContent = erro.message;
        }
    }

    document.getElementById("botao-convidar-servidor")?.addEventListener("click", async () => {
        dialogoConvite.showModal();
        if (feedbackConvite) feedbackConvite.textContent = "";
        try {
            await carregarMembrosServidor();
        } catch (erro) {
            if (feedbackConvite) feedbackConvite.textContent = erro.message;
        }
    });

    document.getElementById("fechar-dialogo-convidar")?.addEventListener("click", () => dialogoConvite.close());
    dialogoConvite?.addEventListener("click", (evento) => {
        if (evento.target === dialogoConvite) dialogoConvite.close();
    });

    socket?.on("amigos:atualizados", () => {
        carregarAmigos().catch((erro) => {
            if (feedbackAmigo) feedbackAmigo.textContent = erro.message;
        });
    });
    socket?.on("presence:snapshot", (dados = {}) => {
        usuariosOnline.clear();
        (dados.usuarioIds || []).forEach((id) => usuariosOnline.add(Number(id)));
        atualizarStatusAmigos();
    });
    socket?.on("presence:changed", (dados = {}) => {
        const usuarioId = Number(dados.usuarioId);
        if (dados.online) usuariosOnline.add(usuarioId);
        else usuariosOnline.delete(usuarioId);
        atualizarStatusAmigos();
    });
    socket?.on("perfil:atualizado", () => {
        carregarAmigos().catch((erro) => {
            console.error("Não foi possível atualizar as fotos dos amigos:", erro);
        });
        carregarMembrosServidor().catch((erro) => {
            console.error("Não foi possível atualizar as fotos dos membros:", erro);
        });
    });
    socket?.on("servidor:membros-atualizados", (dados) => {
        if (Number(dados.servidorId) !== Number(listaMembros?.dataset.servidorId)) return;
        carregarMembrosServidor().catch((erro) => {
            if (feedbackConvite) feedbackConvite.textContent = erro.message;
            console.error("Não foi possível atualizar a lista de membros:", erro);
        });
    });
    socket?.on("servidores:atualizados", () => {
        atualizarBarraServidores().catch((erro) => {
            console.error("Não foi possível atualizar a lista de servidores:", erro);
        });
    });
    socket?.on("connect_error", (erro) => {
        console.error("Socket.IO indisponível:", erro.message);
    });
    socket?.on("connect", () => socket.emit("presence:request"));

    carregarAmigos().catch((erro) => {
        if (feedbackAmigo) feedbackAmigo.textContent = erro.message;
        console.error("Não foi possível carregar amigos:", erro);
    });
    carregarMembrosServidor().catch((erro) => {
        if (feedbackConvite) feedbackConvite.textContent = erro.message;
        console.error("Não foi possível carregar os membros do servidor:", erro);
    });
});
