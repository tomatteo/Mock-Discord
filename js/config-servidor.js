// Apenas comportamento de interface. Dados do servidor, membros e cargos vêm do PHP/banco.
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

    function atualizarNomes(novoNome) {
        const texto = novoNome.trim() || "Nome do servidor";
        nomePreview.textContent = texto;
        nomeLateral.textContent = texto;
        nomeMobile.textContent = texto;
    }

    function aplicarIcone(url) {
        const imagem = `<img src="${url}" alt="Ícone do servidor">`;
        iconePreview.innerHTML = imagem;
        iconeMobile.innerHTML = imagem;
    }

    abasNav.forEach((aba) => {
        aba.addEventListener("click", () => {
            abasNav.forEach((a) => a.classList.remove("ativa"));
            paineisAba.forEach((p) => p.classList.remove("ativo"));
            aba.classList.add("ativa");
            document.getElementById(`aba-${aba.dataset.aba}`)?.classList.add("ativo");
            if (window.innerWidth <= 768) layout.classList.add("subtela-aberta");
        });
    });

    if (btnVoltarMobile) {
        btnVoltarMobile.addEventListener("click", () => layout.classList.remove("subtela-aberta"));
    }

    inputNome.addEventListener("input", () => atualizarNomes(inputNome.value));

    blocosCor.forEach((bloco) => {
        bloco.addEventListener("click", () => {
            blocosCor.forEach((b) => b.classList.remove("ativo"));
            bloco.classList.add("ativo");
            bannerPreview.style.backgroundColor = bloco.dataset.cor;
        });
    });

    // Somente pré-visualização; o arquivo é enviado pelo formulário
    inputIcone.addEventListener("change", (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;
        const leitor = new FileReader();
        leitor.onload = () => aplicarIcone(leitor.result);
        leitor.readAsDataURL(arquivo);
    });

    btnRemoverIcone.addEventListener("click", () => {
        inputIcone.value = "";
        iconePreview.innerHTML = `<i class="bi bi-images"></i>`;
        iconeMobile.innerHTML = `<i class="bi bi-images"></i>`;
    });

    // Só bloqueia o envio se o nome for inválido; o PHP faz o resto
    formPerfil.addEventListener("submit", (e) => {
        if (inputNome.value.trim().length < 2) {
            e.preventDefault();
            erroNome.textContent = "O nome do servidor deve ter pelo menos 2 caracteres.";
            inputNome.focus();
            return;
        }
        erroNome.textContent = "";
    });

    const botaoExcluirServidor = document.getElementById("btn-excluir-servidor");
    const dialogoExcluirServidor = document.getElementById("dialogo-excluir-servidor");
    botaoExcluirServidor.addEventListener("click", () => dialogoExcluirServidor.showModal());
    document.getElementById("cancelar-exclusao-servidor").addEventListener("click", () => {
        dialogoExcluirServidor.close();
    });

    const btnCopiar = document.getElementById("btn-copiar-convite");
    if (btnCopiar) {
        btnCopiar.addEventListener("click", () => {
            navigator.clipboard?.writeText(document.querySelector("code")?.textContent || "");
            btnCopiar.textContent = "Copiado!";
            setTimeout(() => { btnCopiar.textContent = "Copiar"; }, 2000);
        });
    }
});