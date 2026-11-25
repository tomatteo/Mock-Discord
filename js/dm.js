document.addEventListener("DOMContentLoaded", () => {
    const layout = document.querySelector(".layout-aplicativo");
    const usuarioId = Number(layout.dataset.usuarioId);
    const amigoId = Number(layout.dataset.amigoId);
    const inputBuscaDesktop = document.getElementById("input-busca-mensagens");
    const inputBuscaMobile = document.getElementById("input-busca-mobile");
    const inputMensagem = document.getElementById("input-mensagem-dm");
    const inputImagem = document.getElementById("input-imagem-dm");
    const erroMensagem = document.getElementById("erro-mensagem-dm");
    const formMensagem = document.getElementById("form-mensagem-dm");
    const listaMensagens = document.getElementById("lista-mensagens-dm");
    const containerMensagens = document.getElementById("container-mensagens");
    const audioChamada = document.getElementById("audio-chamada");
    const bannerChamada = document.getElementById("banner-chamada");
    const textoChamada = document.getElementById("texto-chamada");
    const erroChamada = document.getElementById("erro-chamada");
    const btnIniciarChamada = document.getElementById("btn-iniciar-chamada");
    const btnAceitarChamada = document.getElementById("btn-aceitar-chamada");
    const btnRecusarChamada = document.getElementById("btn-recusar-chamada");
    const btnEncerrarChamada = document.getElementById("btn-encerrar-chamada");
    const btnMic = document.getElementById("btn-mic");
    const btnAudio = document.getElementById("btn-audio");
    const socket = window.mockDiscordSocket || (typeof window.io === "function"
        ? window.io({ withCredentials: true })
        : null);
    if (socket) window.mockDiscordSocket = socket;
    const idsMensagens = new Set(
        [...listaMensagens.querySelectorAll("[data-mensagem-id]")]
            .map((item) => Number(item.dataset.mensagemId))
    );
    const chamadasEncerradasExibidas = new Set();
    let fluxoChamada = "inativa";
    let streamLocal = null;
    let conexaoP2P = null;
    let candidatosPendentes = [];
    let microfoneMutado = false;
    let audioMutado = false;
    let ultimoIdMensagem = 0;
    idsMensagens.forEach((id) => {
        ultimoIdMensagem = Math.max(ultimoIdMensagem, id);
    });

    containerMensagens.scrollTop = containerMensagens.scrollHeight;

    function criarMensagem(mensagem) {
        const artigo = document.createElement("article");
        artigo.className = "item-mensagem";
        artigo.dataset.mensagemId = String(mensagem.id);

        const avatar = document.createElement("div");
        avatar.className = "avatar-mensagem";
        avatar.setAttribute("aria-hidden", "true");
        if (mensagem.avatarUrl) {
            const imagem = document.createElement("img");
            imagem.src = mensagem.avatarUrl;
            imagem.alt = "";
            avatar.appendChild(imagem);
        }

        const conteudo = document.createElement("div");
        conteudo.className = "conteudo-mensagem";
        const meta = document.createElement("div");
        meta.className = "meta-mensagem";
        const autor = document.createElement("strong");
        autor.className = "autor-mensagem";
        autor.textContent = mensagem.author;
        const hora = document.createElement("time");
        hora.className = "hora-mensagem";
        hora.dateTime = mensagem.datetime;
        hora.textContent = mensagem.time;
        meta.append(autor, hora);

        if (mensagem.type === "imagem" && mensagem.imageUrl) {
            const imagem = document.createElement("img");
            imagem.className = "imagem-mensagem-dm";
            imagem.src = mensagem.imageUrl;
            imagem.alt = `Imagem enviada por ${mensagem.author}`;
            imagem.loading = "lazy";
            imagem.onerror = () => {
                imagem.remove();
                const erroImagem = document.createElement("p");
                erroImagem.className = "texto-mensagem";
                erroImagem.textContent = "Não foi possível carregar esta imagem.";
                conteudo.appendChild(erroImagem);
            };
            conteudo.append(meta, imagem);
            artigo.append(avatar, conteudo);
            return artigo;
        }

        const texto = document.createElement("p");
        texto.className = "texto-mensagem";
        texto.textContent = mensagem.message;
        conteudo.append(meta, texto);
        artigo.append(avatar, conteudo);
        return artigo;
    }

    function inserirMensagem(mensagem, tocarSom = false) {
        const id = Number(mensagem.id);
        if (idsMensagens.has(id)) return;
        const estavaNoFinal = containerMensagens.scrollHeight
            - containerMensagens.scrollTop
            - containerMensagens.clientHeight < 120;
        document.getElementById("conversa-vazia")?.remove();
        listaMensagens.appendChild(criarMensagem(mensagem));
        idsMensagens.add(id);
        ultimoIdMensagem = Math.max(ultimoIdMensagem, id);
        if (tocarSom && Number(mensagem.senderId) !== usuarioId) {
            window.mockDiscordSounds?.tocarMensagem();
        }
        if (estavaNoFinal) containerMensagens.scrollTop = containerMensagens.scrollHeight;
        filtrarMensagens(inputBuscaDesktop.value || inputBuscaMobile.value);
    }

    function inserirAvisoChamadaEncerrada(chamadaId) {
        const idChamada = String(chamadaId || "");
        if (idChamada && chamadasEncerradasExibidas.has(idChamada)) return;

        const estavaNoFinal = containerMensagens.scrollHeight
            - containerMensagens.scrollTop
            - containerMensagens.clientHeight < 120;
        document.getElementById("conversa-vazia")?.remove();

        const aviso = document.createElement("p");
        aviso.className = "evento-sistema chamada-encerrada";
        aviso.setAttribute("role", "status");
        aviso.textContent = "Chamada encerrada";
        listaMensagens.appendChild(aviso);

        if (idChamada) chamadasEncerradasExibidas.add(idChamada);
        if (estavaNoFinal) containerMensagens.scrollTop = containerMensagens.scrollHeight;
    }

    function filtrarMensagens(termo = "") {
        const busca = termo.toLowerCase().trim();
        listaMensagens.querySelectorAll(".item-mensagem").forEach((item) => {
            const texto = item.querySelector(".texto-mensagem")?.textContent.toLowerCase() || "";
            const autor = item.querySelector(".autor-mensagem").textContent.toLowerCase();
            const imagem = item.querySelector(".imagem-mensagem-dm");
            item.style.display = texto.includes(busca) || autor.includes(busca) || Boolean(imagem && busca) ? "flex" : "none";
        });
    }

    async function atualizarMensagens() {
        try {
            const resposta = await fetch(
                `dm.php?amigo=${encodeURIComponent(amigoId)}&action=mensagens&after=${ultimoIdMensagem}`,
                { credentials: "same-origin", cache: "no-store" }
            );
            if (!resposta.ok) throw new Error(`Falha ao atualizar mensagens (${resposta.status}).`);
            let dados;
            try {
                dados = await resposta.json();
            } catch {
                throw new Error("O servidor retornou uma resposta inválida ao atualizar a conversa.");
            }
            dados.mensagens.forEach((mensagem) => inserirMensagem(mensagem, true));
        } catch (erro) {
            console.error("Não foi possível atualizar as mensagens:", erro);
        }
    }

    atualizarMensagens();
    window.setInterval(atualizarMensagens, 2000);

    inputImagem.addEventListener("change", async () => {
        const arquivo = inputImagem.files[0];
        if (!arquivo) return;
        if (arquivo.size > 5 * 1024 * 1024) {
            erroMensagem.textContent = "A imagem deve ter no máximo 5 MB.";
            inputImagem.value = "";
            return;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
            erroMensagem.textContent = "Use uma imagem JPEG, PNG ou WebP.";
            inputImagem.value = "";
            return;
        }

        erroMensagem.textContent = "";
        const botaoAnexar = formMensagem.querySelector(".btn-anexar");
        botaoAnexar.setAttribute("aria-disabled", "true");
        try {
            const dadosFormulario = new FormData(formMensagem);
            dadosFormulario.set("imagem", arquivo);
            const resposta = await fetch(formMensagem.action, {
                method: "POST",
                body: dadosFormulario,
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                cache: "no-store"
            });
            let dados;
            try {
                dados = await resposta.json();
            } catch {
                throw new Error("O servidor retornou uma resposta inválida ao enviar a imagem.");
            }
            if (!resposta.ok) throw new Error(dados.erro || "Não foi possível enviar a imagem.");
            inserirMensagem(dados.mensagem);
        } catch (erro) {
            erroMensagem.textContent = erro.message;
        } finally {
            inputImagem.value = "";
            botaoAnexar.removeAttribute("aria-disabled");
        }
    });

    formMensagem.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        if (!inputMensagem.value.trim()) {
            erroMensagem.textContent = "Digite uma mensagem antes de enviar.";
            inputMensagem.focus();
            return;
        }

        erroMensagem.textContent = "";
        const botaoEnviar = formMensagem.querySelector('[type="submit"]');
        botaoEnviar.disabled = true;
        try {
            const resposta = await fetch(formMensagem.action, {
                method: "POST",
                body: new FormData(formMensagem),
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                cache: "no-store"
            });
            let dados;
            try {
                dados = await resposta.json();
            } catch {
                throw new Error("O servidor retornou uma resposta inválida ao enviar a mensagem.");
            }
            if (!resposta.ok) throw new Error(dados.erro || "Não foi possível enviar a mensagem.");
            inserirMensagem(dados.mensagem);
            inputMensagem.value = "";
            inputMensagem.focus();
        } catch (erro) {
            erroMensagem.textContent = erro.message;
        } finally {
            botaoEnviar.disabled = false;
        }
    });

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
        document.querySelectorAll(".lista-dms li").forEach((item) => {
            const nome = item.querySelector(".nome-dm").textContent.toLowerCase();
            item.style.display = nome.includes(termo) ? "block" : "none";
        });
    });

    function exibirErroChamada(mensagem) {
        erroChamada.textContent = mensagem;
    }

    function atualizarBanner(estado, texto) {
        bannerChamada.hidden = estado === "inativa";
        textoChamada.textContent = texto;
        btnAceitarChamada.hidden = estado !== "recebida";
        btnRecusarChamada.hidden = estado !== "recebida";
        btnEncerrarChamada.hidden = estado === "recebida" || estado === "inativa";
        btnIniciarChamada.disabled = estado !== "inativa";
    }

    async function obterMicrofone() {
        if (streamLocal) return streamLocal;
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Este navegador não permite acessar o microfone. Use HTTPS ou localhost.");
        }
        streamLocal = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamLocal.getAudioTracks().forEach((track) => {
            track.enabled = !microfoneMutado;
        });
        return streamLocal;
    }

    function emitirSinal(dados) {
        socket.emit("dm:call:signal", { usuarioId: amigoId, ...dados });
    }

    async function iniciarConexaoP2P() {
        if (conexaoP2P) return;
        const stream = await obterMicrofone();
        conexaoP2P = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        stream.getTracks().forEach((track) => conexaoP2P.addTrack(track, stream));
        conexaoP2P.onicecandidate = (evento) => {
            if (evento.candidate) emitirSinal({ candidato: evento.candidate });
        };
        conexaoP2P.ontrack = (evento) => {
            audioChamada.srcObject = evento.streams[0];
            audioChamada.muted = audioMutado;
            audioChamada.play().catch(() => {
                exibirErroChamada("Clique na página para ativar o áudio recebido.");
            });
        };
        conexaoP2P.onconnectionstatechange = () => {
            if (["failed", "disconnected"].includes(conexaoP2P?.connectionState)) {
                exibirErroChamada("A conexão de voz foi interrompida. Verifique a rede e tente novamente.");
            }
        };
    }

    async function aplicarCandidatosPendentes() {
        if (!conexaoP2P?.remoteDescription) return;
        for (const candidato of candidatosPendentes) {
            await conexaoP2P.addIceCandidate(candidato);
        }
        candidatosPendentes = [];
    }

    async function processarSinal(dados) {
        if (dados.origemId !== amigoId) return;
        await iniciarConexaoP2P();
        if (dados.descricao?.type === "offer") {
            await conexaoP2P.setRemoteDescription(dados.descricao);
            await aplicarCandidatosPendentes();
            const resposta = await conexaoP2P.createAnswer();
            await conexaoP2P.setLocalDescription(resposta);
            emitirSinal({ descricao: conexaoP2P.localDescription });
        } else if (dados.descricao?.type === "answer") {
            await conexaoP2P.setRemoteDescription(dados.descricao);
            await aplicarCandidatosPendentes();
        } else if (dados.candidato) {
            if (conexaoP2P.remoteDescription) {
                await conexaoP2P.addIceCandidate(dados.candidato);
            } else {
                candidatosPendentes.push(dados.candidato);
            }
        }
    }

    function limparChamada() {
        window.mockDiscordSounds?.pararToqueChamada();
        fluxoChamada = "inativa";
        conexaoP2P?.close();
        conexaoP2P = null;
        candidatosPendentes = [];
        streamLocal?.getTracks().forEach((track) => track.stop());
        streamLocal = null;
        audioChamada.srcObject = null;
        atualizarBanner("inativa", "");
    }

    socket?.on("perfil:atualizado", (dados) => {
        if (Number(dados.usuarioId) !== amigoId) return;
        const avatarDM = document.querySelector(`.item-dm[data-amigo="${amigoId}"] .avatar-dm`);
        [document.querySelector(".avatar-header"), document.querySelector(".avatar-chamada"), avatarDM]
            .filter(Boolean)
            .forEach((avatar) => {
                avatar.querySelector("img")?.remove();
                if (!dados.avatarUrl) return;
                const imagem = document.createElement("img");
                imagem.src = dados.avatarUrl;
                imagem.alt = "";
                avatar.prepend(imagem);
            });
    });

    btnIniciarChamada.addEventListener("click", async () => {
        if (!socket?.connected) {
            exibirErroChamada("O serviço de chamadas não está conectado. Atualize a página e tente novamente.");
            return;
        }
        exibirErroChamada("");
        try {
            await obterMicrofone();
            fluxoChamada = "chamando";
            atualizarBanner("chamando", `Chamando ${document.getElementById("nome-amigo-ativo").textContent}...`);
            socket.emit("dm:call:invite", { usuarioId: amigoId });
        } catch (erro) {
            exibirErroChamada(erro.name === "NotAllowedError"
                ? "Permita o acesso ao microfone para iniciar a chamada."
                : erro.message);
        }
    });

    btnAceitarChamada.addEventListener("click", async () => {
        exibirErroChamada("");
        try {
            await obterMicrofone();
            socket.emit("dm:call:accept", { usuarioId: amigoId });
            atualizarBanner("conectando", "Conectando chamada...");
        } catch (erro) {
            exibirErroChamada(erro.name === "NotAllowedError"
                ? "Permita o acesso ao microfone para atender."
                : erro.message);
        }
    });

    btnRecusarChamada.addEventListener("click", () => {
        socket?.emit("dm:call:reject", { usuarioId: amigoId });
        limparChamada();
    });

    btnEncerrarChamada.addEventListener("click", () => {
        socket?.emit("dm:call:end", { usuarioId: amigoId });
        limparChamada();
    });

    socket?.on("connect", () => {
        socket.emit("dm:call:available", { usuarioId: amigoId });
        socket.emit("dm:call:status", { usuarioId: amigoId });
    });
    socket?.on("dm:call:incoming", (dados) => {
        if (dados.chamadorId !== amigoId || fluxoChamada !== "inativa") return;
        fluxoChamada = "recebida";
        atualizarBanner("recebida", `${dados.nomeChamador} está ligando...`);
        window.mockDiscordSounds?.iniciarToqueChamada();
    });
    socket?.on("dm:call:state", async (dados) => {
        if (![usuarioId, amigoId].includes(dados.chamadorId)
            || ![usuarioId, amigoId].includes(dados.destinatarioId)) return;
        if (dados.estado === "tocando") {
            if (dados.chamadorId === usuarioId) {
                fluxoChamada = "chamando";
                atualizarBanner("chamando", `Chamando ${document.getElementById("nome-amigo-ativo").textContent}...`);
            } else if (fluxoChamada === "inativa") {
                fluxoChamada = "recebida";
                atualizarBanner("recebida", `${dados.nomeChamador} está ligando...`);
                window.mockDiscordSounds?.iniciarToqueChamada();
            }
        } else if (dados.estado === "ativa") {
            window.mockDiscordSounds?.pararToqueChamada();
            fluxoChamada = "ativa";
            atualizarBanner("ativa", `Em chamada de voz com ${document.getElementById("nome-amigo-ativo").textContent}`);
            if (dados.chamadorId === usuarioId) {
                try {
                    await iniciarConexaoP2P();
                    const oferta = await conexaoP2P.createOffer();
                    await conexaoP2P.setLocalDescription(oferta);
                    emitirSinal({ descricao: conexaoP2P.localDescription });
                } catch (erro) {
                    exibirErroChamada(`Não foi possível conectar o áudio: ${erro.message}`);
                    socket.emit("dm:call:end", { usuarioId: amigoId });
                    limparChamada();
                }
            }
        } else {
            if (dados.estado === "encerrada") {
                inserirAvisoChamadaEncerrada(dados.chamadaId);
            } else if (dados.estado === "recusada") {
                exibirErroChamada("A chamada foi recusada.");
            }
            limparChamada();
        }
    });
    socket?.on("dm:call:signal", (dados) => {
        processarSinal(dados).catch((erro) => {
            console.error("Falha na negociação do áudio da chamada:", erro);
            exibirErroChamada("Não foi possível estabelecer a conexão de voz.");
        });
    });
    socket?.on("dm:call:error", ({ mensagem }) => {
        limparChamada();
        exibirErroChamada(mensagem);
    });
    socket?.on("connect_error", (erro) => {
        console.error("Falha ao conectar o serviço de chamadas:", erro.message);
        exibirErroChamada("Não foi possível conectar ao serviço de chamadas.");
    });
    socket?.on("disconnect", () => {
        if (fluxoChamada !== "inativa") {
            limparChamada();
            exibirErroChamada("A conexão com o serviço de chamadas foi perdida.");
        }
    });

    btnMic.addEventListener("click", () => {
        microfoneMutado = !microfoneMutado;
        streamLocal?.getAudioTracks().forEach((track) => {
            track.enabled = !microfoneMutado;
        });
        btnMic.classList.toggle("mutado", microfoneMutado);
        btnMic.title = microfoneMutado ? "Ativar microfone" : "Silenciar microfone";
        btnMic.querySelector("i").className = microfoneMutado
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });

    btnAudio.addEventListener("click", () => {
        audioMutado = !audioMutado;
        audioChamada.muted = audioMutado;
        btnAudio.classList.toggle("mutado", audioMutado);
        btnAudio.title = audioMutado ? "Ativar áudio" : "Desativar áudio";
    });

    window.addEventListener("beforeunload", () => {
        if (fluxoChamada !== "inativa") socket?.emit("dm:call:end", { usuarioId: amigoId });
    });
});
