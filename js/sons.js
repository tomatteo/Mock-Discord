(() => {
    let contextoAudio = null;
    let intervaloChamada = null;
    let avisoAudioIndisponivel = false;

    function obterContextoAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            if (!avisoAudioIndisponivel) {
                console.warn("Este navegador não oferece suporte aos sons de notificação.");
                avisoAudioIndisponivel = true;
            }
            return null;
        }

        contextoAudio ||= new AudioContext();
        if (contextoAudio.state === "suspended") {
            contextoAudio.resume().catch((erro) => {
                console.warn("Não foi possível ativar os sons de notificação:", erro.message);
            });
        }
        return contextoAudio;
    }

    function tocarNota(
        frequencia,
        inicio,
        duracao,
        volume = 0.09,
        tipo = "triangle",
        frequenciaFinal = frequencia
    ) {
        const contexto = obterContextoAudio();
        if (!contexto) return;

        const oscilador = contexto.createOscillator();
        const ganho = contexto.createGain();
        oscilador.type = tipo;
        oscilador.frequency.setValueAtTime(frequencia, inicio);
        oscilador.frequency.exponentialRampToValueAtTime(frequenciaFinal, inicio + duracao);
        ganho.gain.setValueAtTime(0.0001, inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.01);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
        oscilador.connect(ganho);
        ganho.connect(contexto.destination);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracao);
    }

    function tocarMensagem() {
        const contexto = obterContextoAudio();
        if (!contexto) return;
        const inicio = contexto.currentTime;
        tocarNota(146.83, inicio, 0.24, 0.12, "sawtooth", 73.42);
        tocarNota(587.33, inicio + 0.025, 0.15, 0.045);
        tocarNota(783.99, inicio + 0.095, 0.17, 0.055);
        tocarNota(1174.66, inicio + 0.18, 0.24, 0.04);
    }

    function tocarToqueChamada() {
        const contexto = obterContextoAudio();
        if (!contexto) return;
        const inicio = contexto.currentTime;
        tocarNota(110, inicio, 0.48, 0.12, "sawtooth", 82.41);
        tocarNota(220, inicio, 0.42, 0.045, "triangle", 164.81);
        tocarNota(329.63, inicio + 0.04, 0.35, 0.04, "triangle", 246.94);
        tocarNota(493.88, inicio + 0.16, 0.36, 0.035, "triangle", 392);
    }

    function iniciarToqueChamada() {
        if (intervaloChamada !== null) return;
        tocarToqueChamada();
        intervaloChamada = window.setInterval(tocarToqueChamada, 1600);
    }

    function pararToqueChamada() {
        if (intervaloChamada === null) return;
        window.clearInterval(intervaloChamada);
        intervaloChamada = null;
    }

    window.addEventListener("pointerdown", obterContextoAudio, { once: true });
    window.addEventListener("keydown", obterContextoAudio, { once: true });

    window.mockDiscordSounds = {
        tocarMensagem,
        iniciarToqueChamada,
        pararToqueChamada
    };
})();
