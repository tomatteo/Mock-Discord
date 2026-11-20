document.addEventListener("DOMContentLoaded", () => {
    const layout = document.getElementById("layout-configuracoes");
    const abasNav = document.querySelectorAll(".aba-nav[data-aba]");
    const paineisAba = document.querySelectorAll(".painel-aba");
    const btnVoltarMobile = document.getElementById("btn-voltar-mobile");

    const inputNome = document.getElementById("input-nome-servidor");
    const erroNome = document.getElementById("erro-nome-servidor");
    const nomePreview = document.getElementById("nome-preview");
    const nomeLateral = document.getElementById("nome-servidor-lateral");
    const nomeMobile = document.getElementById("nome-servidor-mobile");

    const blocosCor = document.querySelectorAll(".bloco-cor");
    const bannerPreview = document.getElementById("banner-preview");

    const inputIcone = document.getElementById("input-icone-servidor");
    const btnRemoverIcone = document.getElementById("btn-remover-icone");
    const iconePreview = document.getElementById("icone-preview");
    const iconeMobile = document.getElementById("icone-preview-mobile");

    const formPerfil = document.getElementById("form-perfil-servidor");
    const msgSucesso = document.getElementById("msg-sucesso-perfil");

    const configSalva = JSON.parse(localStorage.getItem("mock_discord_server_config") || "null");
    const parametros = new URLSearchParams(window.location.search);
    const servidorSelecionado = parametros.get("servidor") || "Comunidade IFC";
    const permissoes = window.permissoesServidor;
    if (permissoes.servidorFoiExcluido(servidorSelecionado)) {
        window.location.replace("inicio.php");
        return;
    }
    const podeGerenciar = permissoes.podeGerenciarServidor(servidorSelecionado);
    const podeAdministrar = permissoes.podeAdministrar(servidorSelecionado);
    const urlServidor = servidorSelecionado
        ? `servidor.php?${new URLSearchParams({ servidor: servidorSelecionado })}`
        : "servidor.php";
    if (!podeGerenciar) {
        window.location.replace(urlServidor);
        return;
    }

    const botaoExcluirServidor = document.getElementById("btn-excluir-servidor");
    const dialogoExcluirServidor = document.getElementById("dialogo-excluir-servidor");
    const nomeServidorExclusao = document.getElementById("nome-servidor-exclusao");
    const erroExcluirServidor = document.getElementById("erro-excluir-servidor");
    const listaCargosMembros = document.getElementById("lista-cargos-membros");
    const avisoGerenciarCargos = document.getElementById("aviso-gerenciar-cargos");
    const listaMembrosServidor = document.getElementById("lista-membros-servidor");
    const resumoMembrosServidor = document.getElementById("resumo-membros-servidor");
    const servidoresSalvos = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]") || [];
    const servidorPodeExcluir = podeAdministrar && (
        servidorSelecionado === "Comunidade IFC"
        || (Array.isArray(servidoresSalvos)
            && servidoresSalvos.some((servidor) => servidor.nome === servidorSelecionado))
    );

    document.querySelectorAll("#link-voltar-servidor, #link-voltar-servidor-mobile").forEach((link) => {
        link.href = urlServidor;
    });
    botaoExcluirServidor.disabled = !servidorPodeExcluir;
    if (!servidorPodeExcluir) {
        botaoExcluirServidor.title = "Somente administradores podem excluir o servidor.";
    }

    botaoExcluirServidor.addEventListener("click", () => {
        if (!servidorPodeExcluir || !permissoes.podeAdministrar(servidorSelecionado)) return;
        nomeServidorExclusao.textContent = configSalva?.nome || servidorSelecionado;
        erroExcluirServidor.textContent = "";
        dialogoExcluirServidor.showModal();
    });

    document.getElementById("cancelar-exclusao-servidor").addEventListener("click", () => {
        dialogoExcluirServidor.close();
    });

    document.getElementById("confirmar-exclusao-servidor").addEventListener("click", () => {
        if (!servidorPodeExcluir || !permissoes.podeAdministrar(servidorSelecionado)) return;
        const servidores = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]") || [];
        const indiceServidor = Array.isArray(servidores)
            ? servidores.findIndex((servidor) => servidor.nome === servidorSelecionado)
            : -1;

        if (indiceServidor < 0 && servidorSelecionado !== "Comunidade IFC") {
            erroExcluirServidor.textContent = "Este servidor não foi encontrado.";
            return;
        }

        if (indiceServidor >= 0) servidores.splice(indiceServidor, 1);
        localStorage.setItem("mock_discord_servidores", JSON.stringify(servidores));

        const canaisSalvos = JSON.parse(localStorage.getItem("mock_discord_canais_servidor") || "{}") || {};
        delete canaisSalvos[servidorSelecionado];
        localStorage.setItem("mock_discord_canais_servidor", JSON.stringify(canaisSalvos));

        const mensagensSalvas = JSON.parse(localStorage.getItem("mock_discord_mensagens_canais") || "{}") || {};
        const prefixoMensagens = `${servidorSelecionado}::`;
        Object.keys(mensagensSalvas).forEach((chave) => {
            if (chave.startsWith(prefixoMensagens)) delete mensagensSalvas[chave];
        });
        if (servidorSelecionado === "Comunidade IFC") {
            Object.keys(mensagensSalvas).forEach((chave) => {
                if (!chave.includes("::")) delete mensagensSalvas[chave];
            });
        }
        localStorage.setItem("mock_discord_mensagens_canais", JSON.stringify(mensagensSalvas));
        const todosCargos = JSON.parse(localStorage.getItem("mock_discord_cargos_servidor") || "{}") || {};
        delete todosCargos[servidorSelecionado];
        localStorage.setItem("mock_discord_cargos_servidor", JSON.stringify(todosCargos));

        localStorage.removeItem("mock_discord_server_config");
        const servidoresExcluidos = JSON.parse(localStorage.getItem("mock_discord_servidores_excluidos") || "[]") || [];
        if (!servidoresExcluidos.includes(servidorSelecionado)) servidoresExcluidos.push(servidorSelecionado);
        localStorage.setItem("mock_discord_servidores_excluidos", JSON.stringify(servidoresExcluidos));

        dialogoExcluirServidor.close();
        window.location.href = "inicio.php";
    });

    function renderizarMembrosECargos() {
        const membros = permissoes.obterMembros(servidorSelecionado);
        const usuarioAtual = permissoes.identificarUsuario(permissoes.obterUsuarioAtual());
        listaCargosMembros.replaceChildren();
        listaMembrosServidor.replaceChildren();
        resumoMembrosServidor.textContent = `Participantes do servidor (${membros.length} membros).`;
        avisoGerenciarCargos.textContent = podeAdministrar
            ? "Você pode alterar o cargo dos outros membros."
            : "Somente administradores podem alterar cargos.";

        membros.forEach((membro) => {
            const linha = document.createElement("tr");
            const celulaNome = document.createElement("td");
            const nome = document.createElement("strong");
            nome.textContent = membro.nome || membro.username || "Usuário";
            celulaNome.appendChild(nome);

            const celulaCargo = document.createElement("td");
            const seletorCargo = document.createElement("select");
            seletorCargo.className = "seletor-cargo-membro";
            seletorCargo.setAttribute("aria-label", `Cargo de ${nome.textContent}`);
            permissoes.cargosValidos.forEach((cargo) => {
                const opcao = document.createElement("option");
                opcao.value = cargo;
                opcao.textContent = cargo;
                seletorCargo.appendChild(opcao);
            });
            seletorCargo.value = membro.cargo;
            seletorCargo.disabled = !podeAdministrar || membro.id === usuarioAtual;
            seletorCargo.addEventListener("change", () => {
                try {
                    permissoes.alterarCargo(servidorSelecionado, membro.id, seletorCargo.value);
                    membro.cargo = seletorCargo.value;
                    celulaPermissoes.textContent = obterDescricaoCargo(membro.cargo);
                    avisoGerenciarCargos.textContent = `Cargo de ${nome.textContent} atualizado para ${membro.cargo}.`;
                    renderizarListaMembros(membros);
                } catch (erro) {
                    seletorCargo.value = membro.cargo;
                    avisoGerenciarCargos.textContent = erro.message;
                }
            });
            celulaCargo.appendChild(seletorCargo);

            const celulaPermissoes = document.createElement("td");
            celulaPermissoes.textContent = obterDescricaoCargo(membro.cargo);
            linha.append(celulaNome, celulaCargo, celulaPermissoes);
            listaCargosMembros.appendChild(linha);
        });

        renderizarListaMembros(membros);
    }

    function obterDescricaoCargo(cargo) {
        if (cargo === "Administrador") return "Gerenciar servidor, canais e cargos";
        if (cargo === "Moderador") return "Gerenciar servidor e canais";
        return "Enviar mensagens e entrar em chamadas";
    }

    function renderizarListaMembros(membros) {
        listaMembrosServidor.replaceChildren();
        membros.forEach((membro) => {
            const item = document.createElement("li");
            const nome = document.createElement("strong");
            nome.textContent = membro.nome || membro.username || "Usuário";
            item.append(nome, document.createTextNode(` — ${membro.cargo}`));
            listaMembrosServidor.appendChild(item);
        });
    }

    renderizarMembrosECargos();

    inputNome.value = servidorSelecionado === "Comunidade IFC"
        ? configSalva?.nome || servidorSelecionado
        : servidorSelecionado;
    atualizarNomes(inputNome.value);
    if (configSalva) {
        if (configSalva.corFaixa) {
            bannerPreview.style.backgroundColor = configSalva.corFaixa;
            blocosCor.forEach((b) => {
                b.classList.toggle("ativo", b.dataset.cor === configSalva.corFaixa);
            });
        }

        if (configSalva.iconeDataUrl) {
            aplicarIcone(configSalva.iconeDataUrl);
        }
    }

    function atualizarNomes(novoNome) {
        const texto = novoNome.trim() || "Nome do servidor";
        nomePreview.textContent = texto;
        nomeLateral.textContent = texto;
        nomeMobile.textContent = texto;
    }

    function aplicarIcone(dataUrl) {
        const imgTag = `<img src="${dataUrl}" alt="Ícone do servidor">`;
        iconePreview.innerHTML = imgTag;
        iconeMobile.innerHTML = imgTag;
    }

    abasNav.forEach((aba) => {
        aba.addEventListener("click", () => {
            abasNav.forEach((a) => a.classList.remove("ativa"));
            paineisAba.forEach((p) => p.classList.remove("ativo"));

            aba.classList.add("ativa");
            const painelAlvo = document.getElementById(`aba-${aba.dataset.aba}`);
            if (painelAlvo) painelAlvo.classList.add("ativo");

            // Só entra no modo subtela se a largura for <= 768px
            if (window.innerWidth <= 768) {
                layout.classList.add("subtela-aberta");
            }
        });
    });

    if (btnVoltarMobile) {
        btnVoltarMobile.addEventListener("click", () => {
            layout.classList.remove("subtela-aberta");
        });
    }

    inputNome.addEventListener("input", () => {
        atualizarNomes(inputNome.value);
    });

    blocosCor.forEach((bloco) => {
        bloco.addEventListener("click", () => {
            blocosCor.forEach((b) => b.classList.remove("ativo"));
            bloco.classList.add("ativo");
            bannerPreview.style.backgroundColor = bloco.dataset.cor;
        });
    });

    let iconeBase64 = configSalva?.iconeDataUrl || "";
    inputIcone.addEventListener("change", (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;
        const leitor = new FileReader();
        leitor.onload = () => {
            iconeBase64 = leitor.result;
            aplicarIcone(iconeBase64);
        };
        leitor.readAsDataURL(arquivo);
    });

    btnRemoverIcone.addEventListener("click", () => {
        iconeBase64 = "";
        inputIcone.value = "";
        iconePreview.innerHTML = `<i class="bi bi-images"></i>`;
        iconeMobile.innerHTML = `<i class="bi bi-images"></i>`;
    });

    formPerfil.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!permissoes.podeGerenciarServidor(servidorSelecionado)) return;
        const nomeLimpo = inputNome.value.trim();

        if (nomeLimpo.length < 2) {
            erroNome.textContent = "O nome do servidor deve ter pelo menos 2 caracteres.";
            inputNome.focus();
            return;
        }

        erroNome.textContent = "";
        const servidores = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]") || [];
        const servidoresExcluidos = JSON.parse(localStorage.getItem("mock_discord_servidores_excluidos") || "[]") || [];
        const nomeDuplicado = (Array.isArray(servidores) && servidores.some((servidor) =>
            servidor.nome !== servidorSelecionado
            && servidor.nome.toLowerCase() === nomeLimpo.toLowerCase()
        )) || (Array.isArray(servidoresExcluidos)
            && servidoresExcluidos.some((nome) => nome.toLowerCase() === nomeLimpo.toLowerCase()));
        if (nomeDuplicado) {
            erroNome.textContent = "Já existe um servidor com esse nome.";
            inputNome.focus();
            return;
        }

        const corAtiva = document.querySelector(".bloco-cor.ativo")?.dataset.cor || "#D3383B";

        localStorage.setItem("mock_discord_server_config", JSON.stringify({
            nome: nomeLimpo,
            corFaixa: corAtiva,
            iconeDataUrl: iconeBase64
        }));

        if (servidorSelecionado !== "Comunidade IFC" && nomeLimpo !== servidorSelecionado) {
            const servidores = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]") || [];
            const servidor = servidores.find((item) => item.nome === servidorSelecionado);
            if (servidor) {
                servidor.nome = nomeLimpo;
                localStorage.setItem("mock_discord_servidores", JSON.stringify(servidores));

                const canais = JSON.parse(localStorage.getItem("mock_discord_canais_servidor") || "{}") || {};
                if (canais[servidorSelecionado]) {
                    canais[nomeLimpo] = canais[servidorSelecionado];
                    delete canais[servidorSelecionado];
                    localStorage.setItem("mock_discord_canais_servidor", JSON.stringify(canais));
                }

                const mensagens = JSON.parse(localStorage.getItem("mock_discord_mensagens_canais") || "{}") || {};
                const prefixoAntigo = `${servidorSelecionado}::`;
                Object.keys(mensagens).forEach((chave) => {
                    if (!chave.startsWith(prefixoAntigo)) return;
                    mensagens[`${nomeLimpo}::${chave.slice(prefixoAntigo.length)}`] = mensagens[chave];
                    delete mensagens[chave];
                });
                localStorage.setItem("mock_discord_mensagens_canais", JSON.stringify(mensagens));
                permissoes.renomearServidor(servidorSelecionado, nomeLimpo);
                window.location.href = `servidor.php?${new URLSearchParams({ servidor: nomeLimpo })}`;
                return;
            }
        }

        msgSucesso.textContent = "Alterações salvas!";
        setTimeout(() => { msgSucesso.textContent = ""; }, 3000);
    });

    const btnCopiar = document.getElementById("btn-copiar-convite");
    if (btnCopiar) {
        btnCopiar.addEventListener("click", () => {
            navigator.clipboard?.writeText("https://mock-discord.local/convite/ifc-2026");
            btnCopiar.textContent = "Copiado!";
            setTimeout(() => { btnCopiar.textContent = "Copiar"; }, 2000);
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !dialogoExcluirServidor.open) {
            window.location.href = urlServidor;
        }
    });
});