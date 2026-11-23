const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: [
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://localhost:8080",
            "http://127.0.0.1:8080"
        ]
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "Servidor ativo" });
});

const salasVoz = new Map();

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

        if (!salaId || salaId.length > 100 || !nome) {
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
            nome: nome.slice(0, 40)
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

