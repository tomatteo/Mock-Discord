document.addEventListener("DOMContentLoaded", () => {
    const canaisTexto = document.querySelectorAll("#lista-canais-texto .channel-item");
    const tituloCanal = document.getElementById("titulo-canal-ativo");
    const inputMensagem = document.getElementById("input-mensagem");

    // Alternar canal de texto ativo
    canaisTexto.forEach((canal) => {
        canal.addEventListener("click", () => {
            canaisTexto.forEach((c) => c.classList.remove("active"));
            canal.classList.add("active");

            const nomeCanal = canal.dataset.canal;
            tituloCanal.textContent = nomeCanal;
            inputMensagem.placeholder = `Conversar em # ${nomeCanal}`;
        });
    });

    // Alternar estado visual de Microfone e Fone
    const btnMic = document.getElementById("btn-mic");
    const btnAudio = document.getElementById("btn-audio");

    btnMic.addEventListener("click", () => {
        btnMic.classList.toggle("muted");
        const icone = btnMic.querySelector("i");
        icone.className = btnMic.classList.contains("muted")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });

    btnAudio.addEventListener("click", () => {
        btnAudio.classList.toggle("muted");
    });
});