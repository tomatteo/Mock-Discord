(() => {
    const chaveCargos = "mock_discord_cargos_servidor";
    const cargosValidos = ["Administrador", "Moderador", "Membro"];
    const contasPadrao = [];

    function lerJSON(chave, valorPadrao) {
        const salvo = localStorage.getItem(chave);
        return salvo ? JSON.parse(salvo) : valorPadrao;
    }

    function identificarUsuario(usuario) {
        if (usuario?.email) return usuario.email.trim().toLowerCase();
        if (usuario?.username) return `usuario:${usuario.username.trim().toLowerCase()}`;
        return "";
    }

    function obterUsuarioAtual() {
        return lerJSON(
            "mock_discord_usuario",
            lerJSON("usuarioLogado", null)
        );
    }

    function obterContasConhecidas() {
        const registradas = lerJSON("contasCadastradas", []);
        const contas = new Map(
            contasPadrao.map((conta) => [conta.id, { ...conta, email: conta.id }])
        );

        (Array.isArray(registradas) ? registradas : []).forEach((conta) => {
            const id = identificarUsuario(conta);
            if (!id) return;
            const existente = contas.get(id);
            contas.set(id, {
                id,
                email: conta.email || "",
                username: conta.username || existente?.username || "Usuário",
                nome: existente?.nome || conta.username || "Usuário"
            });
        });

        const usuarioAtual = obterUsuarioAtual();
        const idAtual = identificarUsuario(usuarioAtual);
        if (idAtual && !contas.has(idAtual)) {
            contas.set(idAtual, {
                id: idAtual,
                email: usuarioAtual.email || "",
                username: usuarioAtual.username || "Usuário",
                nome: usuarioAtual.username || "Usuário"
            });
        }

        return Array.from(contas.values());
    }

    function obterServidoresSalvos() {
        const servidores = lerJSON("mock_discord_servidores", []);
        return Array.isArray(servidores) ? servidores : [];
    }

    function servidorFoiExcluido(nomeServidor) {
        const excluidos = lerJSON("mock_discord_servidores_excluidos", []);
        return Array.isArray(excluidos) && excluidos.includes(nomeServidor);
    }

    function obterEstadoServidor(nomeServidor) {
        const todosCargos = lerJSON(chaveCargos, {});
        if (!todosCargos[nomeServidor]) {
            const usuarioAtual = obterUsuarioAtual();
            const idAtual = identificarUsuario(usuarioAtual);
            const servidorSalvo = obterServidoresSalvos().find((servidor) => servidor.nome === nomeServidor);
            const dono = servidorSalvo?.criador || idAtual;
            const membros = {};

            obterContasConhecidas().forEach((conta) => {
                let cargo = "Membro";
                if (conta.id === dono) cargo = "Administrador";

                membros[conta.id] = { ...conta, cargo };
            });

            if (idAtual && !membros[idAtual]) {
                membros[idAtual] = {
                    ...usuarioAtual,
                    id: idAtual,
                    cargo: "Administrador"
                };
            }

            todosCargos[nomeServidor] = { membros };
            localStorage.setItem(chaveCargos, JSON.stringify(todosCargos));
        }

        const estado = todosCargos[nomeServidor];
        const contas = obterContasConhecidas();
        contas.forEach((conta) => {
            if (!estado.membros[conta.id]) {
                estado.membros[conta.id] = { ...conta, cargo: "Membro" };
            }
        });
        localStorage.setItem(chaveCargos, JSON.stringify(todosCargos));
        return estado;
    }

    function obterMembros(nomeServidor) {
        return Object.values(obterEstadoServidor(nomeServidor).membros);
    }

    function obterCargo(nomeServidor, idUsuario = identificarUsuario(obterUsuarioAtual())) {
        const membro = obterEstadoServidor(nomeServidor).membros[idUsuario];
        return membro?.cargo || "Membro";
    }

    function podeGerenciarServidor(nomeServidor) {
        return ["Administrador", "Moderador"].includes(obterCargo(nomeServidor));
    }

    function podeAdministrar(nomeServidor) {
        return obterCargo(nomeServidor) === "Administrador";
    }

    function alterarCargo(nomeServidor, idMembro, novoCargo) {
        if (!podeAdministrar(nomeServidor)) {
            throw new Error("Somente administradores podem alterar cargos.");
        }
        if (!cargosValidos.includes(novoCargo)) {
            throw new Error("Cargo inválido.");
        }

        const idAtual = identificarUsuario(obterUsuarioAtual());
        if (idMembro === idAtual) {
            throw new Error("Não é possível alterar o próprio cargo.");
        }

        const todosCargos = lerJSON(chaveCargos, {});
        const estado = obterEstadoServidor(nomeServidor);
        const membro = estado.membros[idMembro];
        if (!membro) throw new Error("Membro não encontrado.");

        membro.cargo = novoCargo;
        todosCargos[nomeServidor] = estado;
        localStorage.setItem(chaveCargos, JSON.stringify(todosCargos));
    }

    function renomearServidor(nomeAntigo, nomeNovo) {
        const todosCargos = lerJSON(chaveCargos, {});
        if (todosCargos[nomeAntigo]) {
            todosCargos[nomeNovo] = todosCargos[nomeAntigo];
            delete todosCargos[nomeAntigo];
            localStorage.setItem(chaveCargos, JSON.stringify(todosCargos));
        }
    }

    window.permissoesServidor = {
        cargosValidos,
        identificarUsuario,
        obterUsuarioAtual,
        servidorFoiExcluido,
        obterCargo,
        obterMembros,
        podeGerenciarServidor,
        podeAdministrar,
        alterarCargo,
        renomearServidor
    };
})();
