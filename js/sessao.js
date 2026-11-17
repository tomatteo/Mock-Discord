document.addEventListener("DOMContentLoaded", () => {
    const dadosUsuario = localStorage.getItem("mock_discord_usuario") || localStorage.getItem("usuarioLogado");
    if (!dadosUsuario) return;

    const usuario = JSON.parse(dadosUsuario);
    const nomeUsuario = usuario.username?.trim();
    if (!nomeUsuario) return;

    document.querySelectorAll("[data-nome-usuario]").forEach((elemento) => {
        elemento.textContent = nomeUsuario;
    });
});
