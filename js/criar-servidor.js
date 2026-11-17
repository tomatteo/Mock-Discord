document.addEventListener("DOMContentLoaded", () => {
    const botoesAdicionar = document.querySelectorAll(".adicionar-servidor");
    const barraServidores = document.querySelector(".barra-servidores");
    if (!botoesAdicionar.length || !barraServidores) return;

    // Descobre o nome do usuário salvo no login para preencher "Servidor de <Nome>"
    function obterNomeUsuario() {
        try {
            const dados = JSON.parse(localStorage.getItem("mock_discord_usuario") || "null");
            if (dados?.nome) return dados.nome;
            if (dados?.usuario) return dados.usuario;
        } catch (_) {}
        return "Usuário";
    }

    // Renderiza na barra lateral os servidores criados anteriormente pelo usuário
    function renderizarServidoresSalvos() {
        const lista = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]");
        const botaoMais = barraServidores.querySelector(".adicionar-servidor");

        // Remove clones anteriores para evitar duplicação
        barraServidores.querySelectorAll(".servidor-customizado").forEach((el) => el.remove());

        lista.forEach((srv) => {
            const link = document.createElement("a");
            link.href = `servidor.html?servidor=${encodeURIComponent(srv.nome)}`;
            link.className = "icone-servidor servidor-customizado";
            link.title = srv.nome;

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

    // Injeta o HTML do modal no final do body
    const overlay = document.createElement("div");
    overlay.className = "overlay-modal-servidor";
    overlay.id = "overlay-modal-servidor";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "titulo-modal-servidor");

    overlay.innerHTML = `
        <div class="modal-criar-servidor">
            <button type="button" class="btn-fechar-modal-servidor" id="btn-fechar-modal-servidor" aria-label="Fechar modal">
                <i class="bi bi-x-lg"></i>
            </button>

            <div class="cabecalho-modal-servidor">
                <h2 id="titulo-modal-servidor">Personalize o seu servidor</h2>
                <p>Deixe seu novo servidor com a sua cara dando um nome e um ícone a ele. Se quiser, é possível mudar depois.</p>
            </div>

            <form id="form-criar-servidor" novalidate>
                <div class="area-upload-icone">
                    <label for="input-icone-novo-servidor" class="circulo-upload-servidor" id="circulo-upload-servidor" title="Enviar ícone do servidor">
                        <i class="bi bi-camera-fill"></i>
                        <span>Enviar</span>
                        <div class="badge-mais-upload"><i class="bi bi-plus"></i></div>
                    </label>
                    <input type="file" id="input-icone-novo-servidor" accept="image/*" hidden>
                </div>

                <div class="campo-nome-novo-servidor">
                    <label for="input-nome-novo-servidor">
                        Nome do servidor <span class="asterisco-obrigatorio">*</span>
                    </label>
                    <input type="text" id="input-nome-novo-servidor" maxlength="50" required>
                    <span class="erro-modal-servidor" id="erro-modal-servidor" role="alert"></span>
                </div>

                <p class="texto-diretrizes-servidor">
                    Ao criar um servidor, você concorda com as <a href="#diretrizes" id="link-diretrizes-servidor">diretrizes da comunidade</a> do Discord.
                </p>

                <div class="rodape-modal-servidor">
                    <button type="button" class="btn-voltar-modal-servidor" id="btn-voltar-modal-servidor">Voltar</button>
                    <button type="submit" class="btn-confirmar-criar-servidor">Criar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const form = document.getElementById("form-criar-servidor");
    const inputNome = document.getElementById("input-nome-novo-servidor");
    const erroModal = document.getElementById("erro-modal-servidor");
    const inputIcone = document.getElementById("input-icone-novo-servidor");
    const circuloUpload = document.getElementById("circulo-upload-servidor");
    const btnFechar = document.getElementById("btn-fechar-modal-servidor");
    const btnVoltar = document.getElementById("btn-voltar-modal-servidor");

    let iconeSelecionadoBase64 = "";

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

    function fecharModal() {
        overlay.classList.remove("aberto");
    }

    botoesAdicionar.forEach((btn) => {
        btn.addEventListener("click", abrirModal);
    });

    btnFechar.addEventListener("click", fecharModal);
    btnVoltar.addEventListener("click", fecharModal);

    // Fechar ao clicar fora da caixa do modal
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) fecharModal();
    });

    // Fechar com ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("aberto")) {
            fecharModal();
        }
    });

    // Preview da imagem escolhida no círculo tracejado
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

    // Impede pulo de página ao clicar no link ilustrativo de diretrizes
    document.getElementById("link-diretrizes-servidor").addEventListener("click", (e) => {
        e.preventDefault();
    });

    // Validação e criação do servidor
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nomeServidor = inputNome.value.trim();

        if (nomeServidor.length < 2) {
            erroModal.textContent = "Digite um nome com pelo menos 2 caracteres.";
            inputNome.focus();
            return;
        }

        const servidoresSalvos = JSON.parse(localStorage.getItem("mock_discord_servidores") || "[]");
        servidoresSalvos.push({
            nome: nomeServidor,
            icone: iconeSelecionadoBase64
        });
        localStorage.setItem("mock_discord_servidores", JSON.stringify(servidoresSalvos));

        const canaisSalvos = JSON.parse(localStorage.getItem("mock_discord_canais_servidor") || "{}");
        canaisSalvos[nomeServidor] = {
            texto: [{ id: "texto-geral", nome: "geral" }],
            voz: [{ id: "voz-geral", nome: "geral" }]
        };
        localStorage.setItem("mock_discord_canais_servidor", JSON.stringify(canaisSalvos));

        // Atualiza a configuração ativa do servidor e redireciona para ele
        localStorage.setItem("mock_discord_server_config", JSON.stringify({
            nome: nomeServidor,
            corFaixa: "#5865F2",
            iconeDataUrl: iconeSelecionadoBase64
        }));

        fecharModal();
        window.location.href = `servidor.html?servidor=${encodeURIComponent(nomeServidor)}`;
    });
});