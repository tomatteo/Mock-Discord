document.addEventListener("DOMContentLoaded", () => {
    const canaisTexto = document.querySelectorAll("#lista-canais-texto .item-canal");
    const tituloCanal = document.getElementById("titulo-canal-ativo");
    const inputMensagem = document.getElementById("input-mensagem");

    canaisTexto.forEach((canal) => {
        canal.addEventListener("click", () => {
            canaisTexto.forEach((c) => c.classList.remove("ativo"));
            canal.classList.add("ativo");

            const nomeCanal = canal.dataset.canal;
            tituloCanal.textContent = nomeCanal;
            inputMensagem.placeholder = `Conversar em # ${nomeCanal}`;
        });
    });

    // alternar estado visual de microfone e fone
    const btnMic = document.getElementById("botao-microfone");
    const btnAudio = document.getElementById("botao-audio");

    btnMic.addEventListener("click", () => {
        btnMic.classList.toggle("silenciado");
        const icone = btnMic.querySelector("i");
        icone.className = btnMic.classList.contains("silenciado")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });

    btnAudio.addEventListener("click", () => {
        btnAudio.classList.toggle("silenciado");
    });
});