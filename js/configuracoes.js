document.addEventListener("DOMContentLoaded", () => {
    const layout = document.getElementById("layout-config");
    const abasNav = document.querySelectorAll(".aba-nav");
    const paineisAba = document.querySelectorAll(".painel-aba");
    const btnVoltarMobile = document.getElementById("btn-voltar-mobile");
    const tituloMobileSubtela = document.getElementById("titulo-mobile-subtela");

    const titulosMobile = {
        conta: "Conta",
        voz: "Voz",
        sobre: "Sobre Nós"
    };

 
    abasNav.forEach((aba) => {
        aba.addEventListener("click", () => {
            const alvo = aba.dataset.aba;

            abasNav.forEach((item) => item.classList.remove("ativo"));
            aba.classList.add("ativo");

            paineisAba.forEach((painel) => {
                const corresponde = painel.id === `painel-${alvo}`;
                painel.hidden = !corresponde;
                painel.classList.toggle("ativo", corresponde);
            });

            if (tituloMobileSubtela && titulosMobile[alvo]) {
                tituloMobileSubtela.textContent = titulosMobile[alvo];
            }

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

   
    const usuarioSalvo = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    if (usuarioSalvo) {
        const inicial = usuarioSalvo.username.charAt(0).toUpperCase();
        document.getElementById("avatar-inicial").textContent = inicial;
        document.getElementById("avatar-perfil").textContent = inicial;
        document.getElementById("nome-usuario-sidebar").textContent = usuarioSalvo.username;
        document.getElementById("perfil-username").textContent = usuarioSalvo.username;
        document.getElementById("valor-username").textContent = usuarioSalvo.username;
        document.getElementById("valor-email").textContent = usuarioSalvo.email;
        document.getElementById("valor-telefone").textContent = usuarioSalvo.telefone;
    }

   
    // 3. Controles de Voz e Áudio 
    const selectMic = document.getElementById("select-microfone");
    const selectFalante = document.getElementById("select-altofalante");
    const sliderMic = document.getElementById("volume-microfone");
    const sliderFalante = document.getElementById("volume-altofalante");
    const textoVolMic = document.getElementById("texto-vol-mic");
    const textoVolFalante = document.getElementById("texto-vol-falante");

    const prefsAudio = JSON.parse(localStorage.getItem("preferenciasAudio") || "null");
    if (prefsAudio) {
        selectMic.value = prefsAudio.microfone || "padrao";
        selectFalante.value = prefsAudio.altofalante || "padrao";
        sliderMic.value = prefsAudio.volMic ?? 80;
        sliderFalante.value = prefsAudio.volFalante ?? 85;
    }

    function salvarPreferenciasAudio() {
        textoVolMic.textContent = `${sliderMic.value}%`;
        textoVolFalante.textContent = `${sliderFalante.value}%`;
        localStorage.setItem("preferenciasAudio", JSON.stringify({
            microfone: selectMic.value,
            altofalante: selectFalante.value,
            volMic: Number(sliderMic.value),
            volFalante: Number(sliderFalante.value)
        }));
    }

    salvarPreferenciasAudio();
    selectMic.addEventListener("change", salvarPreferenciasAudio);
    selectFalante.addEventListener("change", salvarPreferenciasAudio);
    sliderMic.addEventListener("input", salvarPreferenciasAudio);
    sliderFalante.addEventListener("input", salvarPreferenciasAudio);

    const medidorBarras = document.getElementById("medidor-barras");
    const btnTesteMic = document.getElementById("btn-teste-mic");
    const statusTesteMic = document.getElementById("status-teste-mic");
    const TOTAL_BARRAS = 32;

    // Cria as 32 barrinhas visuais do medidor
    for (let i = 0; i < TOTAL_BARRAS; i++) {
        const barra = document.createElement("span");
        barra.className = "barra-nivel";
        medidorBarras.appendChild(barra);
    }

    const barras = medidorBarras.querySelectorAll(".barra-nivel");
    let testando = false;
    let intervaloSimulacao = null;
    let streamAtual = null;

    function atualizarBarras(porcentagem) {
        const ativas = Math.round((porcentagem / 100) * TOTAL_BARRAS);
        barras.forEach((barra, indice) => {
            barra.classList.toggle("ativa", indice < ativas);
        });
        medidorBarras.setAttribute("aria-valuenow", String(Math.round(porcentagem)));
    }

    function pararTesteMic() {
        testando = false;
        btnTesteMic.textContent = "Teste de microfone";
        btnTesteMic.classList.remove("testando");
        statusTesteMic.textContent = "";
        clearInterval(intervaloSimulacao);
        if (streamAtual) {
            streamAtual.getTracks().forEach((track) => track.stop());
            streamAtual = null;
        }
        atualizarBarras(0);
    }

    btnTesteMic.addEventListener("click", async () => {
        if (testando) {
            pararTesteMic();
            return;
        }

        testando = true;
        btnTesteMic.textContent = "Parar teste";
        btnTesteMic.classList.add("testando");

     
        try {
            streamAtual = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new AudioContext();
            const fonte = audioCtx.createMediaStreamSource(streamAtual);
            const analisador = audioCtx.createAnalyser();
            analisador.fftSize = 256;
            fonte.connect(analisador);

            const dados = new Uint8Array(analisador.frequencyBinCount);
            statusTesteMic.textContent = "Captando áudio do microfone...";

            intervaloSimulacao = setInterval(() => {
                analisador.getByteFrequencyData(dados);
                const media = dados.reduce((acc, v) => acc + v, 0) / dados.length;
                const fatorVolume = Number(sliderMic.value) / 100;
                const nivel = Math.min(100, media * 2.2 * fatorVolume);
                atualizarBarras(nivel);
            }, 80);
        } catch {
            statusTesteMic.textContent = "Modo de simulação ativo (permissão de microfone não concedida).";
            intervaloSimulacao = setInterval(() => {
                const fatorVolume = Number(sliderMic.value) / 100;
                const nivelSimulado = (25 + Math.random() * 65) * fatorVolume;
                atualizarBarras(nivelSimulado);
            }, 120);
        }
    });
});