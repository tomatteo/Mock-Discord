//pagina responsvel por gerenciar as pessoas que estão em uma sala de voz, e gerenciar a comunicação entre elas
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: true
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "Servidor ativo" });
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

io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    socket.emit("servidor:pronto", {
        mensagem: "Conexão com o servidor estabelecida."
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

