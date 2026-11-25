//pagina responsvel por gerenciar as pessoas que estão em uma sala de voz, e gerenciar a comunicação entre elas
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: true,
        credentials: true
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "Servidor ativo" });
});

const endpointAutenticacao = process.env.PHP_AUTH_URL || "http://localhost:8080/includes/socketAuth.php";

async function consultarAutorizacao(socket, parametros = {}) {
    const url = new URL(endpointAutenticacao);
    Object.entries(parametros).forEach(([chave, valor]) => url.searchParams.set(chave, String(valor)));

    const cookie = socket.handshake.headers.cookie;
    if (!cookie) return null;

    const resposta = await fetch(url, {
        headers: { cookie },
        signal: AbortSignal.timeout(5000)
    });
    if (!resposta.ok) return null;

    const usuario = await resposta.json();
    const usuarioId = Number(usuario.usuarioId);
    return Number.isSafeInteger(usuarioId) && usuarioId > 0
        ? { ...usuario, usuarioId }
        : null;
}

io.use(async (socket, next) => {
    try {
        const usuario = await consultarAutorizacao(socket);
        if (!usuario) {
            next(new Error("Sessão inválida ou expirada."));
            return;
        }
        socket.data.usuario = usuario;
        next();
    } catch (erro) {
        console.error("Falha ao validar sessão Socket.IO:", erro.message);
        next(new Error("Não foi possível validar sua sessão."));
    }
});

const salasVoz = new Map();
const chamadasDm = new Map();
const conexoesPorUsuario = new Map();
const amigosPorUsuario = new Map();
const encerramentoPorDesconexao = new Map();
const canaisDeVoz = new Set([
    "comunidade-ifc:geral",
    "comunidade-ifc:estudos"
]);

function salaUsuario(usuarioId) {
    return `usuario:${usuarioId}`;
}

function chaveChamada(usuarioId1, usuarioId2) {
    return `${Math.min(usuarioId1, usuarioId2)}:${Math.max(usuarioId1, usuarioId2)}`;
}

function emitirMudancaPresenca(usuarioId, amigosIds, online) {
    amigosIds.forEach((amigoId) => {
        io.to(salaUsuario(amigoId)).emit("presence:changed", { usuarioId, online });
    });
}

function enviarEstadoChamada(chamada, estado, extra = {}) {
    const dados = {
        estado,
        chamadaId: chamada.chamadaId,
        chamadorId: chamada.chamadorId,
        destinatarioId: chamada.destinatarioId,
        nomeChamador: chamada.nomeChamador,
        ...extra
    };
    [chamada.chamadorId, chamada.destinatarioId].forEach((usuarioId) => {
        io.to(salaUsuario(usuarioId)).emit("dm:call:state", dados);
    });
}

function encerrarChamada(chamada, estado = "encerrada") {
    chamadasDm.delete(chamada.chamadaId);
    enviarEstadoChamada(chamada, estado);
}

function sairDaSalaVoz(socket) {
    const salaId = socket.data.salaVozId;
    if (!salaId) return;

    socket.to(salaId).emit("voz:participante-saiu", {
        salaId,
        socketId: socket.id
    });

    const participantes = salasVoz.get(salaId);
    participantes?.delete(socket.id);

    if (participantes?.size === 0) {
        salasVoz.delete(salaId);
    }

    socket.leave(salaId);
    delete socket.data.salaVozId;
}

function podeEnviarAtualizacao(socket, tipo) {
    const agora = Date.now();
    const atualizacoes = socket.data.ultimaAtualizacao || {};
    if (agora - (atualizacoes[tipo] || 0) < 500) return false;
    atualizacoes[tipo] = agora;
    socket.data.ultimaAtualizacao = atualizacoes;
    return true;
}

io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);
    const usuarioId = socket.data.usuario.usuarioId;
    socket.join(salaUsuario(usuarioId));
    const temporizadorDesconexao = encerramentoPorDesconexao.get(usuarioId);
    if (temporizadorDesconexao) {
        clearTimeout(temporizadorDesconexao);
        encerramentoPorDesconexao.delete(usuarioId);
    }
    const conexoesUsuario = conexoesPorUsuario.get(usuarioId) || new Set();
    const estavaOffline = conexoesUsuario.size === 0;
    conexoesUsuario.add(socket.id);
    conexoesPorUsuario.set(usuarioId, conexoesUsuario);

    socket.emit("servidor:pronto", {
        mensagem: "Conexão com o servidor estabelecida."
    });

    async function atualizarPresencaAmigos(enviarSnapshot = false) {
        try {
            const usuarioAutorizado = await consultarAutorizacao(socket, { amizades: 1 });
            if (!usuarioAutorizado || !socket.connected) return;
            const amigosIds = usuarioAutorizado.amigosIds || [];
            amigosPorUsuario.set(usuarioId, new Set(amigosIds));
            if (enviarSnapshot) {
                socket.emit("presence:snapshot", {
                    usuarioIds: amigosIds.filter((amigoId) => conexoesPorUsuario.has(amigoId))
                });
            }
            if (estavaOffline && !enviarSnapshot) {
                emitirMudancaPresenca(usuarioId, amigosIds, true);
            }
        } catch (erro) {
            console.error("Falha ao atualizar presença de amigos:", erro.message);
        }
    }

    atualizarPresencaAmigos();
    socket.on("presence:request", () => atualizarPresencaAmigos(true));

    socket.on("amigos:atualizar", async (dados = {}) => {
        if (!podeEnviarAtualizacao(socket, "amigos")) return;
        const usuarioId = Number(dados.usuarioId);
        if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) return;

        try {
            const autorizado = await consultarAutorizacao(socket, { usuario: usuarioId });
            if (autorizado) {
                io.to(`usuario:${usuarioId}`).emit("amigos:atualizados");
            }
        } catch (erro) {
            console.error("Falha ao notificar atualização de amigos:", erro.message);
        }
    });

    socket.on("servidor:entrar", async (dados = {}) => {
        const servidorId = Number(dados.servidorId);
        if (!Number.isSafeInteger(servidorId) || servidorId < 1) return;

        try {
            const autorizado = await consultarAutorizacao(socket, { servidor: servidorId });
            if (autorizado) {
                socket.join(`servidor:${servidorId}`);
                socket.emit("servidor:entrada-confirmada", { servidorId });
            }
        } catch (erro) {
            console.error("Falha ao validar acesso ao servidor:", erro.message);
        }
    });

    socket.on("servidor:sair", (dados = {}) => {
        const servidorId = Number(dados.servidorId);
        if (Number.isSafeInteger(servidorId) && servidorId > 0) {
            socket.leave(`servidor:${servidorId}`);
        }
    });

    socket.on("servidor:membros-alterados", async (dados = {}) => {
        if (!podeEnviarAtualizacao(socket, "membros")) return;
        const servidorId = Number(dados.servidorId);
        if (!Number.isSafeInteger(servidorId) || servidorId < 1) return;

        try {
            const autorizado = await consultarAutorizacao(socket, { servidor: servidorId });
            if (autorizado) {
                io.to(`servidor:${servidorId}`).emit("servidor:membros-atualizados", { servidorId });
            }
        } catch (erro) {
            console.error("Falha ao notificar atualização de membros:", erro.message);
        }
    });

    socket.on("servidor:novo-membro", async (dados = {}) => {
        if (!podeEnviarAtualizacao(socket, "novo-membro")) return;
        const usuarioId = Number(dados.usuarioId);
        const servidorId = Number(dados.servidorId);
        if (
            !Number.isSafeInteger(usuarioId) || usuarioId < 1
            || !Number.isSafeInteger(servidorId) || servidorId < 1
        ) return;

        try {
            const autorizado = await consultarAutorizacao(socket, {
                servidor: servidorId,
                usuario: usuarioId
            });
            if (autorizado) {
                io.to(`usuario:${usuarioId}`).emit("servidores:atualizados");
            }
        } catch (erro) {
            console.error("Falha ao notificar novo membro:", erro.message);
        }
    });

    socket.on("perfil:atualizado", async () => {
        try {
            const usuarioAtualizado = await consultarAutorizacao(socket, { amizades: 1, servidores: 1 });
            if (!usuarioAtualizado) return;
            socket.data.usuario = usuarioAtualizado;

            const salaId = socket.data.salaVozId;
            const participante = salasVoz.get(salaId)?.get(socket.id);
            if (participante) {
                participante.nome = String(usuarioAtualizado.apelido || participante.nome).slice(0, 40);
                participante.avatarUrl = usuarioAtualizado.fotoPerfil || null;
                io.to(salaId).emit("voz:participante-estado", { salaId, participante });
            }

            (usuarioAtualizado.amigosIds || []).forEach((amigoId) => {
                io.to(salaUsuario(amigoId)).emit("perfil:atualizado", {
                    usuarioId: usuarioAtualizado.usuarioId,
                    apelido: usuarioAtualizado.apelido,
                    avatarUrl: usuarioAtualizado.fotoPerfil
                });
            });
            (usuarioAtualizado.servidoresIds || []).forEach((servidorId) => {
                io.to(`servidor:${servidorId}`).emit("perfil:atualizado", {
                    usuarioId: usuarioAtualizado.usuarioId,
                    apelido: usuarioAtualizado.apelido,
                    avatarUrl: usuarioAtualizado.fotoPerfil
                });
            });
        } catch (erro) {
            console.error("Falha ao atualizar foto de perfil em tempo real:", erro.message);
        }
    });

    socket.on("dm:call:status", async (dados = {}) => {
        const usuarioId = Number(dados.usuarioId);
        const atualId = socket.data.usuario.usuarioId;
        if (!Number.isSafeInteger(usuarioId) || usuarioId < 1 || usuarioId === atualId) {
            const chamada = [...chamadasDm.values()].find((item) =>
                item.chamadorId === atualId || item.destinatarioId === atualId
            );
            if (chamada) {
                socket.emit("dm:call:state", {
                    estado: chamada.estado,
                    chamadaId: chamada.chamadaId,
                    chamadorId: chamada.chamadorId,
                    destinatarioId: chamada.destinatarioId,
                    nomeChamador: chamada.nomeChamador
                });
            }
            return;
        }

        try {
            const autorizado = await consultarAutorizacao(socket, { amizade: usuarioId });
            if (!autorizado) return;
            const chamada = chamadasDm.get(chaveChamada(atualId, usuarioId));
            if (chamada) {
                socket.emit("dm:call:state", {
                    estado: chamada.estado,
                    chamadaId: chamada.chamadaId,
                    chamadorId: chamada.chamadorId,
                    destinatarioId: chamada.destinatarioId,
                    nomeChamador: chamada.nomeChamador
                });
            }
        } catch (erro) {
            console.error("Falha ao consultar estado da chamada privada:", erro.message);
        }
    });

    socket.on("dm:call:available", async (dados = {}) => {
        const usuarioId = Number(dados.usuarioId);
        const atualId = socket.data.usuario.usuarioId;
        if (!Number.isSafeInteger(usuarioId) || usuarioId < 1 || usuarioId === atualId) return;

        try {
            const autorizado = await consultarAutorizacao(socket, { amizade: usuarioId });
            if (autorizado) {
                const chamadaId = chaveChamada(atualId, usuarioId);
                socket.join(`dm:${chamadaId}`);
                socket.emit("dm:call:ready", { usuarioId });
                const chamada = chamadasDm.get(chamadaId);
                if (
                    chamada?.estado === "tocando"
                    && chamada.aceita
                    && chamada.destinatarioId === atualId
                ) {
                    chamada.estado = "ativa";
                    enviarEstadoChamada(chamada, "ativa");
                }
            }
        } catch (erro) {
            console.error("Falha ao validar a conversa privada para chamadas:", erro.message);
        }
    });

    socket.on("dm:call:invite", async (dados = {}) => {
        if (!podeEnviarAtualizacao(socket, "dm-call")) return;
        const usuarioId = Number(dados.usuarioId);
        const atualId = socket.data.usuario.usuarioId;
        if (!Number.isSafeInteger(usuarioId) || usuarioId < 1 || usuarioId === atualId) return;

        try {
            const autorizado = await consultarAutorizacao(socket, { amizade: usuarioId });
            if (!autorizado) {
                socket.emit("dm:call:error", { mensagem: "A chamada só pode ser iniciada com um amigo." });
                return;
            }
            const chamadaId = chaveChamada(atualId, usuarioId);
            if (!io.sockets.adapter.rooms.get(salaUsuario(usuarioId))?.size) {
                socket.emit("dm:call:error", { mensagem: "Seu amigo está offline e não pode receber a chamada agora." });
                return;
            }
            if ([...chamadasDm.values()].some((chamada) =>
                chamada.chamadorId === atualId
                || chamada.destinatarioId === atualId
                || chamada.chamadorId === usuarioId
                || chamada.destinatarioId === usuarioId
            )) {
                socket.emit("dm:call:error", { mensagem: "Uma das contas já está em outra chamada." });
                return;
            }

            const chamada = {
                chamadaId,
                estado: "tocando",
                chamadorId: atualId,
                destinatarioId: usuarioId,
                nomeChamador: String(socket.data.usuario.apelido || "Amigo").slice(0, 40)
            };
            chamadasDm.set(chamadaId, chamada);
            io.to(`dm:${chamadaId}`).emit("dm:call:incoming", {
                chamadaId,
                chamadorId: atualId,
                nomeChamador: chamada.nomeChamador
            });
            enviarEstadoChamada(chamada, "tocando");
        } catch (erro) {
            console.error("Falha ao iniciar chamada privada:", erro.message);
            socket.emit("dm:call:error", { mensagem: "Não foi possível iniciar a chamada." });
        }
    });

    socket.on("dm:call:accept", (dados = {}, responder = () => {}) => {
        const usuarioId = Number(dados.usuarioId);
        const atualId = socket.data.usuario.usuarioId;
        const chamada = Number.isSafeInteger(usuarioId)
            ? chamadasDm.get(chaveChamada(atualId, usuarioId))
            : null;
        if (!chamada || chamada.estado !== "tocando" || chamada.destinatarioId !== atualId) {
            responder({ ok: false, mensagem: "Esta chamada não está mais disponível." });
            return;
        }
        chamada.aceita = true;
        const salaConversa = io.sockets.adapter.rooms.get(`dm:${chamada.chamadaId}`);
        const destinatarioNaConversa = [...(salaConversa || [])].some((socketId) =>
            io.sockets.sockets.get(socketId)?.data.usuario.usuarioId === atualId
        );
        if (destinatarioNaConversa) {
            chamada.estado = "ativa";
            enviarEstadoChamada(chamada, "ativa");
        }
        responder({ ok: true });
    });

    socket.on("dm:call:reject", (dados = {}) => {
        const usuarioId = Number(dados.usuarioId);
        const atualId = socket.data.usuario.usuarioId;
        const chamada = Number.isSafeInteger(usuarioId)
            ? chamadasDm.get(chaveChamada(atualId, usuarioId))
            : null;
        if (!chamada || chamada.destinatarioId !== atualId) return;
        encerrarChamada(chamada, "recusada");
    });

    socket.on("dm:call:end", (dados = {}) => {
        const usuarioId = Number(dados.usuarioId);
        const atualId = socket.data.usuario.usuarioId;
        const chamada = Number.isSafeInteger(usuarioId)
            ? chamadasDm.get(chaveChamada(atualId, usuarioId))
            : null;
        if (!chamada || (chamada.chamadorId !== atualId && chamada.destinatarioId !== atualId)) return;
        encerrarChamada(chamada);
    });

    socket.on("dm:call:signal", (dados = {}) => {
        const usuarioId = Number(dados.usuarioId);
        const atualId = socket.data.usuario.usuarioId;
        const chamada = Number.isSafeInteger(usuarioId)
            ? chamadasDm.get(chaveChamada(atualId, usuarioId))
            : null;
        if (
            !chamada
            || chamada.estado !== "ativa"
            || ![chamada.chamadorId, chamada.destinatarioId].includes(atualId)
            || ![chamada.chamadorId, chamada.destinatarioId].includes(usuarioId)
            || usuarioId === atualId
        ) return;

        if (
            dados.descricao
            && ["offer", "answer"].includes(dados.descricao.type)
            && typeof dados.descricao.sdp === "string"
            && dados.descricao.sdp.length <= 100000
        ) {
            io.to(salaUsuario(usuarioId)).emit("dm:call:signal", {
                origemId: atualId,
                descricao: dados.descricao
            });
            return;
        }
        if (
            dados.candidato
            && typeof dados.candidato.candidate === "string"
            && dados.candidato.candidate.length <= 2048
        ) {
            io.to(salaUsuario(usuarioId)).emit("dm:call:signal", {
                origemId: atualId,
                candidato: dados.candidato
            });
        }
    });

    socket.on("voz:entrar", async (dados = {}) => {
        const salaId = typeof dados.salaId === "string" ? dados.salaId.trim() : "";

        if (!canaisDeVoz.has(salaId)) {
            socket.emit("voz:erro", { mensagem: "Canal de voz inválido." });
            return;
        }

        try {
            const usuarioAtualizado = await consultarAutorizacao(socket);
            if (!usuarioAtualizado) {
                socket.emit("voz:erro", { mensagem: "Sua sessão expirou. Entre novamente." });
                return;
            }
            socket.data.usuario = usuarioAtualizado;
        } catch (erro) {
            console.error("Falha ao carregar o perfil para o canal de voz:", erro.message);
            socket.emit("voz:erro", { mensagem: "Não foi possível carregar seu perfil para a chamada." });
            return;
        }

        sairDaSalaVoz(socket);

        let participantes = salasVoz.get(salaId);
        if (!participantes) {
            participantes = new Map();
            salasVoz.set(salaId, participantes);
        }

        const participante = {
            socketId: socket.id,
            usuarioId: socket.data.usuario.usuarioId,
            nome: String(socket.data.usuario.apelido || "Usuário").slice(0, 40),
            avatarUrl: socket.data.usuario.fotoPerfil || null,
            mutado: false,
            ensurdecido: false
        };

        socket.join(salaId);
        participantes.set(socket.id, participante);
        socket.data.salaVozId = salaId;

        socket.emit("voz:participantes", {
            salaId,
            participantes: [...participantes.values()]
        });
        socket.to(salaId).emit("voz:participante-entrou", {
            salaId,
            participante
        });
    });

    socket.on("voz:estado", (dados = {}) => {
        const salaId = socket.data.salaVozId;
        const participante = salasVoz.get(salaId)?.get(socket.id);
        if (!salaId || !participante) return;

        participante.mutado = dados.mutado === true;
        participante.ensurdecido = dados.ensurdecido === true;
        socket.to(salaId).emit("voz:participante-estado", {
            salaId,
            participante
        });
    });

    socket.on("voz:oferta", (dados = {}) => {
        const salaId = socket.data.salaVozId;
        const participantes = salasVoz.get(salaId);
        if (
            !salaId ||
            typeof dados.destino !== "string" ||
            !participantes?.has(dados.destino) ||
            typeof dados.descricao?.type !== "string" ||
            typeof dados.descricao?.sdp !== "string"
        ) return;

        io.to(dados.destino).emit("voz:oferta", {
            salaId,
            origem: socket.id,
            descricao: dados.descricao
        });
    });

    socket.on("voz:resposta", (dados = {}) => {
        const salaId = socket.data.salaVozId;
        const participantes = salasVoz.get(salaId);
        if (
            !salaId ||
            typeof dados.destino !== "string" ||
            !participantes?.has(dados.destino) ||
            typeof dados.descricao?.type !== "string" ||
            typeof dados.descricao?.sdp !== "string"
        ) return;

        io.to(dados.destino).emit("voz:resposta", {
            salaId,
            origem: socket.id,
            descricao: dados.descricao
        });
    });

    socket.on("voz:candidato", (dados = {}) => {
        const salaId = socket.data.salaVozId;
        const participantes = salasVoz.get(salaId);
        if (
            !salaId ||
            typeof dados.destino !== "string" ||
            !participantes?.has(dados.destino) ||
            typeof dados.candidato?.candidate !== "string"
        ) return;

        io.to(dados.destino).emit("voz:candidato", {
            salaId,
            origem: socket.id,
            candidato: dados.candidato
        });
    });

    socket.on("voz:sair", () => sairDaSalaVoz(socket));
    socket.on("disconnecting", () => sairDaSalaVoz(socket));

    socket.on("disconnect", (motivo) => {
        const conexoes = conexoesPorUsuario.get(usuarioId);
        conexoes?.delete(socket.id);
        if (conexoes?.size === 0) {
            conexoesPorUsuario.delete(usuarioId);
            emitirMudancaPresenca(usuarioId, amigosPorUsuario.get(usuarioId) || new Set(), false);
            amigosPorUsuario.delete(usuarioId);
            const temporizador = setTimeout(() => {
                encerramentoPorDesconexao.delete(usuarioId);
                if (conexoesPorUsuario.has(usuarioId)) return;
                [...chamadasDm.values()]
                    .filter((chamada) => chamada.chamadorId === usuarioId || chamada.destinatarioId === usuarioId)
                    .forEach((chamada) => encerrarChamada(chamada));
            }, 10000);
            temporizador.unref?.();
            encerramentoPorDesconexao.set(usuarioId, temporizador);
        }
        console.log("Cliente desconectado:", socket.id, motivo);
    });
});

const porta = process.env.PORT || 3001;

httpServer.listen(porta, () => {
    console.log(`Servidor disponível em http://localhost:${porta}`);
});
