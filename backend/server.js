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
const canaisDeVoz = new Set([
    "comunidade-ifc:geral",
    "comunidade-ifc:estudos"
]);

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
    socket.join(`usuario:${socket.data.usuario.usuarioId}`);

    socket.emit("servidor:pronto", {
        mensagem: "Conexão com o servidor estabelecida."
    });

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

    socket.on("voz:entrar", (dados = {}) => {
        const salaId = typeof dados.salaId === "string" ? dados.salaId.trim() : "";
        const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";

        if (!canaisDeVoz.has(salaId) || !nome) {
            socket.emit("voz:erro", { mensagem: "Sala ou nome inválido." });
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
            nome: nome.slice(0, 40),
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
        console.log("Cliente desconectado:", socket.id, motivo);
    });
});

const porta = process.env.PORT || 3001;

httpServer.listen(porta, () => {
    console.log(`Servidor disponível em http://localhost:${porta}`);
});

