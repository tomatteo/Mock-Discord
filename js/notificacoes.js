document.addEventListener("DOMContentLoaded", () => {
    const socket = window.mockDiscordSocket
        || (typeof window.io === "function" ? window.io({ withCredentials: true }) : null);
    if (socket) window.mockDiscordSocket = socket;

    let usuarioId = 0;
    let amigos = [];
    let ultimaMensagemObservada = new Map();
    let mensagensLidas = {};
    let mensagensNotificadas = {};
    let avisoArmazenamento = false;
    let requisicaoEmAndamento = false;
    const amigoAtivo = Number(new URLSearchParams(location.search).get("amigo")) || 0;
    const chaveLeitura = (id) => `mock-discord:dm-lidas:${id}`;
    const chaveNotificadas = (id) => `mock-discord:dm-notificadas:${id}`;
    window.mockDiscordOnlineIds = new Set();

    function lerMensagensLidas() {
        try {
            mensagensLidas = JSON.parse(localStorage.getItem(chaveLeitura(usuarioId)) || "{}");
            if (!mensagensLidas || typeof mensagensLidas !== "object" || Array.isArray(mensagensLidas)) {
                mensagensLidas = {};
            }
        } catch (erro) {
            mensagensLidas = {};
            if (!avisoArmazenamento) {
                console.warn("Não foi possível carregar o estado de leitura das DMs:", erro);
                avisoArmazenamento = true;
            }
        }
    }

    function salvarMensagensLidas() {
        try {
            localStorage.setItem(chaveLeitura(usuarioId), JSON.stringify(mensagensLidas));
        } catch (erro) {
            if (!avisoArmazenamento) {
                console.warn("Não foi possível salvar o estado de leitura das DMs:", erro);
                avisoArmazenamento = true;
            }
        }
    }

    function atualizarStatusPresenca() {
        document.querySelectorAll(".item-dm[data-amigo]").forEach((link) => {
            const online = window.mockDiscordOnlineIds.has(Number(link.dataset.amigo));
            const ponto = link.querySelector(".ponto-status");
            if (!ponto) return;
            ponto.className = `ponto-status ${online ? "online" : "offline"}`;
            ponto.setAttribute("aria-label", online ? "Online" : "Offline");
        });
        window.dispatchEvent(new Event("mock-discord:presence-updated"));
    }

    function atualizarAvisos() {
        document.querySelectorAll(".item-dm[data-amigo]").forEach((link) => {
            const idAmigo = Number(link.dataset.amigo);
            const ultimaMensagem = ultimaMensagemObservada.get(idAmigo) || 0;
            const lida = Number(mensagensLidas[idAmigo]) || 0;
            let aviso = link.querySelector(".aviso-mensagem-dm");
            if (ultimaMensagem > lida) {
                if (!aviso) {
                    aviso = document.createElement("span");
                    aviso.className = "aviso-mensagem-dm";
                    aviso.setAttribute("aria-hidden", "true");
                    link.appendChild(aviso);
                }
                const amigo = amigos.find((item) => item.id === idAmigo);
                aviso.title = `Mensagem nova de ${amigo?.apelido || "amigo"}`;
                link.setAttribute("aria-label", `${amigo?.apelido || "Amigo"}, mensagem nova`);
            } else {
                aviso?.remove();
                link.removeAttribute("aria-label");
            }
        });
    }

    async function atualizarNotificacoes() {
        if (requisicaoEmAndamento || document.hidden) return;
        requisicaoEmAndamento = true;
        try {
            const resposta = await fetch("includes/notificacoes.php", {
                credentials: "same-origin",
                cache: "no-store",
                headers: { Accept: "application/json" }
            });
            let dados;
            try {
                dados = await resposta.json();
            } catch {
                throw new Error("O servidor retornou uma resposta inválida para as notificações.");
            }
            if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar notificações.");

            if (usuarioId !== Number(dados.usuarioId)) {
                usuarioId = Number(dados.usuarioId);
                lerMensagensLidas();
                try {
                    mensagensNotificadas = JSON.parse(localStorage.getItem(chaveNotificadas(usuarioId)) || "{}");
                    if (!mensagensNotificadas || typeof mensagensNotificadas !== "object" || Array.isArray(mensagensNotificadas)) {
                        mensagensNotificadas = {};
                    }
                } catch (erro) {
                    mensagensNotificadas = {};
                    if (!avisoArmazenamento) {
                        console.warn("Não foi possível carregar o estado dos sons de notificação:", erro);
                        avisoArmazenamento = true;
                    }
                }
            }
            try {
                const notificadasEmOutrasAbas = JSON.parse(localStorage.getItem(chaveNotificadas(usuarioId)) || "{}");
                Object.entries(notificadasEmOutrasAbas).forEach(([id, ultima]) => {
                    mensagensNotificadas[id] = Math.max(Number(mensagensNotificadas[id]) || 0, Number(ultima) || 0);
                });
            } catch (erro) {
                if (!avisoArmazenamento) {
                    console.warn("Não foi possível sincronizar sons entre abas:", erro);
                    avisoArmazenamento = true;
                }
            }
            amigos = dados.amigos;
            dados.amigos.forEach((amigo) => {
                const idAmigo = Number(amigo.id);
                const ultimaMensagem = Number(amigo.ultimaMensagem);
                const ultimaObservada = ultimaMensagemObservada.get(idAmigo);
                const ultimaNotificada = Number(mensagensNotificadas[idAmigo]) || 0;
                if (
                    ultimaObservada !== undefined
                    && ultimaMensagem > ultimaObservada
                    && ultimaMensagem > ultimaNotificada
                    && idAmigo !== amigoAtivo
                ) {
                    window.mockDiscordSounds?.tocarMensagem();
                }
                ultimaMensagemObservada.set(idAmigo, ultimaMensagem);
                mensagensNotificadas[idAmigo] = Math.max(ultimaNotificada, ultimaMensagem);
                if (idAmigo === amigoAtivo) {
                    mensagensLidas[idAmigo] = ultimaMensagem;
                }
            });
            salvarMensagensLidas();
            try {
                localStorage.setItem(chaveNotificadas(usuarioId), JSON.stringify(mensagensNotificadas));
            } catch (erro) {
                if (!avisoArmazenamento) {
                    console.warn("Não foi possível salvar o estado dos sons de notificação:", erro);
                    avisoArmazenamento = true;
                }
            }
            atualizarAvisos();
        } catch (erro) {
            console.error("Não foi possível atualizar as notificações:", erro);
        } finally {
            requisicaoEmAndamento = false;
        }
    }

    socket?.on("presence:snapshot", (dados = {}) => {
        window.mockDiscordOnlineIds = new Set((dados.usuarioIds || []).map(Number));
        atualizarStatusPresenca();
    });
    socket?.on("presence:changed", (dados = {}) => {
        const id = Number(dados.usuarioId);
        if (dados.online) window.mockDiscordOnlineIds.add(id);
        else window.mockDiscordOnlineIds.delete(id);
        atualizarStatusPresenca();
    });
    socket?.on("amigos:atualizados", () => socket.emit("presence:request"));
    socket?.on("connect", () => socket.emit("presence:request"));
    window.addEventListener("storage", (evento) => {
        if (evento.key !== chaveLeitura(usuarioId)) return;
        try {
            mensagensLidas = JSON.parse(evento.newValue || "{}");
            if (!mensagensLidas || typeof mensagensLidas !== "object" || Array.isArray(mensagensLidas)) {
                mensagensLidas = {};
            }
            atualizarAvisos();
        } catch (erro) {
            console.warn("Não foi possível sincronizar o estado de leitura entre abas:", erro);
        }
    });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) atualizarNotificacoes();
    });

    atualizarNotificacoes();
    window.setInterval(atualizarNotificacoes, 3000);
});
