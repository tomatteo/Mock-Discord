// Apenas comportamento do modal. Criar/listar servidores é responsabilidade do PHP/banco.
document.addEventListener("DOMContentLoaded", () => {
    const botoesAdicionar = document.querySelectorAll(".adicionar-servidor");
    const overlay = document.getElementById("overlay-modal-servidor");
    if (!botoesAdicionar.length || !overlay) return;

    const form = document.getElementById("form-criar-servidor");
    const inputNome = document.getElementById("input-nome-novo-servidor");
    const erroModal = document.getElementById("erro-modal-servidor");
    const inputIcone = document.getElementById("input-icone-novo-servidor");
    const circuloUpload = document.getElementById("circulo-upload-servidor");
    const btnFechar = document.getElementById("btn-fechar-modal-servidor");
    const btnVoltar = document.getElementById("btn-voltar-modal-servidor");

    function abrirModal() {
        inputIcone.value = "";
        erroModal.textContent = "";
        circuloUpload.innerHTML = `
            <i class="bi bi-camera-fill"></i>
            <span>Enviar</span>
            <div class="badge-mais-upload"><i class="bi bi-plus"></i></div>
        `;
        overlay.classList.add("aberto");
        inputNome.focus();
    }

    function fecharModal() {
        overlay.classList.remove("aberto");
    }

    botoesAdicionar.forEach((btn) => btn.addEventListener("click", abrirModal));
    btnFechar.addEventListener("click", fecharModal);
    btnVoltar.addEventListener("click", fecharModal);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) fecharModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("aberto")) fecharModal();
    });

    // Somente pré-visualização; o arquivo é enviado pelo formulário
    inputIcone.addEventListener("change", (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;
        const leitor = new FileReader();
        leitor.onload = () => {
            circuloUpload.innerHTML = `
                <img src="${leitor.result}" alt="Preview do ícone" class="preview-icone-modal">
                <div class="badge-mais-upload"><i class="bi bi-plus"></i></div>
            `;
        };
        leitor.readAsDataURL(arquivo);
    });

    document.getElementById("link-diretrizes-servidor").addEventListener("click", (e) => {
        e.preventDefault();
    });

    // Só bloqueia o envio se o nome for inválido; o PHP faz o resto
    form.addEventListener("submit", (e) => {
        if (inputNome.value.trim().length < 2) {
            e.preventDefault();
            erroModal.textContent = "Digite um nome com pelo menos 2 caracteres.";
            inputNome.focus();
        }
    });
});