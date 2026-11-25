(() => {
    const somMensagem = new Audio("/sons/discord-notificacao.mp3");
    const somChamada = new Audio("/sons/discord-call-sound.mp3");
    let chamadaTocando = false;
    let chamadaPendenteDeAudio = false;
    let avisoReproducaoBloqueada = false;

    somMensagem.preload = "auto";
    somChamada.preload = "auto";
    somChamada.loop = true;
    somChamada.volume = 0.75;

    function registrarFalhaAudio(erro) {
        if (erro.name === "AbortError") return;
        if (avisoReproducaoBloqueada) return;
        console.warn("O navegador não permitiu reproduzir o som:", erro.message);
        avisoReproducaoBloqueada = true;
    }

    function tocarMensagem() {
        somMensagem.currentTime = 0;
        somMensagem.play().catch(registrarFalhaAudio);
    }

    function iniciarToqueChamada() {
        if (chamadaTocando) return;
        chamadaTocando = true;
        chamadaPendenteDeAudio = true;
        somChamada.currentTime = 0;
        somChamada.play()
            .then(() => {
                chamadaPendenteDeAudio = false;
            })
            .catch(registrarFalhaAudio);
    }

    function pararToqueChamada() {
        chamadaTocando = false;
        chamadaPendenteDeAudio = false;
        somChamada.pause();
        somChamada.currentTime = 0;
    }

    function liberarAudio() {
        if (!chamadaTocando || !chamadaPendenteDeAudio) return;
        somChamada.play()
            .then(() => {
                chamadaPendenteDeAudio = false;
                avisoReproducaoBloqueada = false;
            })
            .catch(registrarFalhaAudio);
    }

    window.addEventListener("pointerdown", liberarAudio);
    window.addEventListener("keydown", liberarAudio);

    window.mockDiscordSounds = {
        tocarMensagem,
        iniciarToqueChamada,
        pararToqueChamada
    };
})();
