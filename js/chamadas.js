document.addEventListener("DOMContentLoaded", () => {
    const socket = window.mockDiscordSocket
        || (typeof window.io === "function" ? window.io({ withCredentials: true }) : null);
    if (!socket) {
        console.error("Não foi possível iniciar as notificações de chamadas: Socket.IO indisponível.");
        return;
    }
    window.mockDiscordSocket = socket;

    let chamadaAtual = null;
    const amigoNaConversa = Number(document.querySelector(".layout-aplicativo")?.dataset.amigoId) || 0;
    const painel = document.createElement("section");
    painel.className = "aviso-chamada-global";
    painel.setAttribute("role", "alert");
    painel.setAttribute("aria-live", "assertive");
    painel.hidden = true;

    const texto = document.createElement("p");
    texto.className = "aviso-chamada-global-texto";
    const acoes = document.createElement("div");
    acoes.className = "aviso-chamada-global-acoes";

    const atender = document.createElement("button");
    atender.type = "button";
    atender.className = "aviso-chamada-atender";
    atender.textContent = "Atender";

    const recusar = document.createElement("button");
    recusar.type = "button";
    recusar.className = "aviso-chamada-recusar";
    recusar.textContent = "Recusar";
    acoes.append(atender, recusar);
    painel.append(texto, acoes);
    document.body.appendChild(painel);

    function ocultarAviso() {
        chamadaAtual = null;
        painel.hidden = true;
        window.mockDiscordSounds?.pararToqueChamada();
    }

    function tratarEstado(dados = {}) {
        const usuarioId = Number(
            document.querySelector(".layout-aplicativo")?.dataset.usuarioId
            || document.body.dataset.usuarioId
        );
        if (
            !usuarioId
            || Number(dados.destinatarioId) !== usuarioId
            || Number(dados.chamadorId) === usuarioId
        ) {
            if (dados.estado !== "tocando") ocultarAviso();
            return;
        }

        if (dados.estado === "tocando") {
            const mesmoContatoAberto = amigoNaConversa === Number(dados.chamadorId);
            chamadaAtual = {
                usuarioId: Number(dados.chamadorId),
                chamadaId: dados.chamadaId
            };
            window.mockDiscordSounds?.iniciarToqueChamada();
            painel.hidden = mesmoContatoAberto;
            texto.textContent = `${dados.nomeChamador || "Alguém"} está ligando para você`;
            return;
        }

        ocultarAviso();
    }

    atender.addEventListener("click", () => {
        if (!chamadaAtual || !socket.connected) return;
        const usuarioId = chamadaAtual.usuarioId;
        atender.disabled = true;
        recusar.disabled = true;
        socket.timeout(5000).emit(
            "dm:call:accept",
            { usuarioId },
            (erro, resposta) => {
                atender.disabled = false;
                recusar.disabled = false;
                if (erro || !resposta?.ok) {
                    console.error(
                        "Não foi possível atender a chamada:",
                        erro || resposta?.mensagem || "resposta inválida"
                    );
                    ocultarAviso();
                    return;
                }

                window.mockDiscordSounds?.pararToqueChamada();
                painel.hidden = true;
                window.location.assign(`dm.php?amigo=${encodeURIComponent(usuarioId)}`);
            }
        );
    });

    recusar.addEventListener("click", () => {
        if (!chamadaAtual || !socket.connected) return;
        const usuarioId = chamadaAtual.usuarioId;
        recusar.disabled = true;
        socket.emit("dm:call:reject", { usuarioId });
        ocultarAviso();
    });

    socket.on("dm:call:state", tratarEstado);
    socket.on("connect", () => socket.emit("dm:call:status"));
    socket.on("dm:call:error", ({ mensagem }) => {
        if (!chamadaAtual) return;
        console.error("Falha na chamada:", mensagem);
        ocultarAviso();
    });
    if (socket.connected) socket.emit("dm:call:status");
});
