document.addEventListener("DOMContentLoaded", () => {

    const botoesAdicionar = document.querySelectorAll(".adicionar-servidor");
    const barraServidores = document.querySelector(".barra-servidores");

    if (!botoesAdicionar.length || !barraServidores) return;

    // Descobre o nome do usuário salvo no login
    function obterNomeUsuario() {
        try {
            const dados = JSON.parse(localStorage.getItem("mock_discord_usuario") || "null");

            if (dados?.nome) return dados.nome;
            if (dados?.usuario) return dados.usuario;

        } catch (_) {}

        return "Usuário";
    }

    // Renderiza na barra lateral os servidores criados anteriormente
    function renderizarServidoresSalvos() {

        const lista = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]");

        const botaoMais = barraServidores.querySelector(".adicionar-servidor");

        const servidorPadrao = barraServidores.querySelector('[data-servidor="Comunidade IFC"]');

        const servidoresExcluidos = JSON.parse(
            localStorage.getItem("mock_discord_servidores_excluidos") || "[]"
        );

        const servidorAtual = new URLSearchParams(window.location.search).get("servidor");

        // Remove clones anteriores para evitar duplicação
        barraServidores.querySelectorAll(".servidor-customizado").forEach((el) => el.remove());

        if (servidorPadrao) {
            servidorPadrao.hidden = Array.isArray(servidoresExcluidos)
                && servidoresExcluidos.includes("Comunidade IFC");
        }

        lista.forEach((srv) => {

            const link = document.createElement("a");

            link.href = `servidor.php?servidor=${encodeURIComponent(srv.nome)}`;
            link.className = "icone-servidor servidor-customizado";
            link.dataset.servidor = srv.nome;
            link.title = srv.nome;

            if (srv.nome === servidorAtual) {
                link.classList.add("ativo");
                link.setAttribute("aria-current", "page");
            }

            if (srv.icone) {

                link.innerHTML = `<img src="${srv.icone}" alt="${srv.nome}">`;

            } else {

                const iniciais = srv.nome
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                link.innerHTML = `<span class="iniciais-servidor-custom">${iniciais || "SV"}</span>`;
            }

            barraServidores.insertBefore(link, botaoMais);

        });
    }

    renderizarServidoresSalvos();


    // ==================================================
    // MODAL DE CRIAÇÃO DE SERVIDOR
    // O HTML é carregado pelo arquivo modalCriarServidor.php
    // ==================================================

    const overlay = document.getElementById("overlay-modal-servidor");

    if (!overlay) {
        console.error("Modal de criação de servidor não encontrado.");
        return;
    }

    const form = document.getElementById("form-criar-servidor");

    const inputNome = document.getElementById("input-nome-novo-servidor");

    const erroModal = document.getElementById("erro-modal-servidor");

    const inputIcone = document.getElementById("input-icone-novo-servidor");

    const circuloUpload = document.getElementById("circulo-upload-servidor");

    const btnFechar = document.getElementById("btn-fechar-modal-servidor");

    const btnVoltar = document.getElementById("btn-voltar-modal-servidor");

    let iconeSelecionadoBase64 = "";


    // Abre o modal
    function abrirModal() {

        iconeSelecionadoBase64 = "";

        inputIcone.value = "";

        erroModal.textContent = "";

        circuloUpload.innerHTML = `
            <i class="bi bi-camera-fill"></i>
            <span>Enviar</span>
            <div class="badge-mais-upload"><i class="bi bi-plus"></i></div>
        `;

        inputNome.value = `Servidor de ${obterNomeUsuario()}`;

        overlay.classList.add("aberto");

        inputNome.focus();
        inputNome.select();
    }


    // Fecha o modal
    function fecharModal() {
        overlay.classList.remove("aberto");
    }


    // Botão + da barra lateral
    botoesAdicionar.forEach((btn) => {
        btn.addEventListener("click", abrirModal);
    });


    // Botões de fechar e voltar
    btnFechar.addEventListener("click", fecharModal);

    btnVoltar.addEventListener("click", fecharModal);


    // Fecha ao clicar fora da caixa do modal
    overlay.addEventListener("click", (e) => {

        if (e.target === overlay) {
            fecharModal();
        }

    });


    // Fecha com ESC
    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape" && overlay.classList.contains("aberto")) {
            fecharModal();
        }

    });


    // Preview da imagem escolhida
    inputIcone.addEventListener("change", (e) => {

        const arquivo = e.target.files[0];

        if (!arquivo) return;

        const leitor = new FileReader();

        leitor.onload = () => {

            iconeSelecionadoBase64 = leitor.result;

            circuloUpload.innerHTML = `
                <img src="${iconeSelecionadoBase64}" alt="Preview do ícone" class="preview-icone-modal">
                <div class="badge-mais-upload"><i class="bi bi-plus"></i></div>
            `;

        };

        leitor.readAsDataURL(arquivo);

    });


    // Impede o redirecionamento ao clicar nas diretrizes
    document.getElementById("link-diretrizes-servidor").addEventListener("click", (e) => {
        e.preventDefault();
    });


    // ==================================================
    // VALIDAÇÃO E CRIAÇÃO DO SERVIDOR
    // ==================================================

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const nomeServidor = inputNome.value.trim();


        // Validação do nome
        if (nomeServidor.length < 2) {

            erroModal.textContent = "Digite um nome com pelo menos 2 caracteres.";

            inputNome.focus();

            return;
        }


        // Recupera servidores salvos
        const servidoresSalvos = JSON.parse(
            localStorage.getItem("mock_discord_servidores") || "[]"
        );

        const servidoresExcluidos = JSON.parse(
            localStorage.getItem("mock_discord_servidores_excluidos") || "[]"
        );


        // Verifica se já existe um servidor com esse nome
        const nomeJaUsado = servidoresSalvos.some((servidor) =>
            servidor.nome.toLowerCase() === nomeServidor.toLowerCase()
        ) || (
            Array.isArray(servidoresExcluidos)
            && servidoresExcluidos.some((nome) =>
                nome.toLowerCase() === nomeServidor.toLowerCase()
            )
        );


        if (nomeJaUsado) {

            erroModal.textContent = "Já existe um servidor com esse nome.";

            inputNome.focus();

            return;
        }


        // Identifica o usuário que está criando o servidor
        const usuarioAtual = window.permissoesServidor?.obterUsuarioAtual();

        const idCriador = window.permissoesServidor?.identificarUsuario(usuarioAtual);


        // Adiciona o novo servidor
        servidoresSalvos.push({

            nome: nomeServidor,

            icone: iconeSelecionadoBase64,

            criador: idCriador || ""

        });


        // Salva os servidores no localStorage
        localStorage.setItem(
            "mock_discord_servidores",
            JSON.stringify(servidoresSalvos)
        );


        // Cria os canais padrão do servidor
        const canaisSalvos = JSON.parse(
            localStorage.getItem("mock_discord_canais_servidor") || "{}"
        );

        canaisSalvos[nomeServidor] = {

            texto: [
                { id: "texto-geral", nome: "geral" }
            ],

            voz: [
                { id: "voz-geral", nome: "geral" }
            ]

        };


        localStorage.setItem(
            "mock_discord_canais_servidor",
            JSON.stringify(canaisSalvos)
        );


        // Atualiza a configuração ativa do servidor
        localStorage.setItem(
            "mock_discord_server_config",
            JSON.stringify({

                nome: nomeServidor,

                corFaixa: "#5865F2",

                iconeDataUrl: iconeSelecionadoBase64

            })
        );


        // Fecha o modal
        fecharModal();


        // Redireciona para o servidor criado
        window.location.href = `servidor.php?servidor=${encodeURIComponent(nomeServidor)}`;

    });

});