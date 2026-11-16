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
    if (configSalva) {
        inputNome.value = configSalva.nome || "Comunidade IFC";
        atualizarNomes(inputNome.value);

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
        const nomeLimpo = inputNome.value.trim();

        if (nomeLimpo.length < 2) {
            erroNome.textContent = "O nome do servidor deve ter pelo menos 2 caracteres.";
            inputNome.focus();
            return;
        }

        erroNome.textContent = "";
        const corAtiva = document.querySelector(".bloco-cor.ativo")?.dataset.cor || "#D3383B";

        localStorage.setItem("mock_discord_server_config", JSON.stringify({
            nome: nomeLimpo,
            corFaixa: corAtiva,
            iconeDataUrl: iconeBase64
        }));

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
        if (e.key === "Escape") {
            window.location.href = "servidor.html";
        }
    });
});