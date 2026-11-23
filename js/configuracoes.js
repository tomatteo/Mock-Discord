/**
 * Lógica da tela de Configurações (Conta, Voz e Áudio, Sobre Nós)
 * Inclui navegação mobile em subtela, persistência em localStorage, upload de avatar e teste de microfone.
 */
document.addEventListener("DOMContentLoaded", () => {
    const emPopup = new URLSearchParams(window.location.search).get("popup") === "1";
    if (emPopup) {
        document.body.classList.add("popup-config");
        document.querySelectorAll(".btn-fechar-desktop, .btn-fechar-mobile-lista").forEach((botao) => {
            botao.addEventListener("click", (evento) => {
                evento.preventDefault();
                window.parent.postMessage("fechar-configuracoes", "*");
            });
        });
    }

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

    // ======================================================================
    // 1. Navegação entre abas + Modo Subtela Mobile
    // ======================================================================
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

            // Entra no modo subtela apenas se a largura da tela for <= 768px
            if (window.innerWidth <= 768) {
                layout.classList.add("subtela-aberta");
            }
        });
    });

    // Botão "Voltar" no cabeçalho mobile para retornar à lista de opções
    if (btnVoltarMobile) {
        btnVoltarMobile.addEventListener("click", () => {
            layout.classList.remove("subtela-aberta");
        });
    }

    // ======================================================================
    // 2. Carrega dados do usuário logado
    // ======================================================================
    const usuarioSalvo = JSON.parse(
        localStorage.getItem("mock_discord_usuario") ||
        localStorage.getItem("usuarioLogado") ||
        "null"
    );

    if (usuarioSalvo) {
        const nome = usuarioSalvo.username || usuarioSalvo.nome || "";
        const inicial = nome.charAt(0).toUpperCase();
        document.getElementById("avatar-inicial").textContent = inicial;
        document.getElementById("avatar-perfil").textContent = inicial;
        document.getElementById("nome-usuario-sidebar").textContent = nome;
        document.getElementById("perfil-username").textContent = nome;
        document.getElementById("valor-username").textContent = nome;
        document.getElementById("valor-email").textContent = usuarioSalvo.email || "";
        document.getElementById("valor-telefone").textContent = usuarioSalvo.telefone || "";
    }

    // ======================================================================
    // 3. Controles de Voz e Áudio (Dispositivos + Sliders salvos no localStorage)
    // ======================================================================
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
        function atualizarTextoVolumes() {
        textoVolMic.textContent = `${sliderMic.value}%`;
        textoVolFalante.textContent = `${sliderFalante.value}%`;
    }

    atualizarTextoVolumes();
    sliderMic.addEventListener("input", atualizarTextoVolumes);
    sliderFalante.addEventListener("input", atualizarTextoVolumes);

    // ======================================================================
    // 4. Medidor e Botão "Teste de microfone"
    // ======================================================================
    const medidorBarras = document.getElementById("medidor-barras");
    const btnTesteMic = document.getElementById("btn-teste-mic");
    const statusTesteMic = document.getElementById("status-teste-mic");
    const TOTAL_BARRAS = 32;

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

    // ======================================================================
    // 5. Upload e Persistência de Foto de Perfil no localStorage
    // ======================================================================
    const inputFoto = document.getElementById("input-foto-perfil");
    const btnRemoverFoto = document.getElementById("btn-remover-foto");
    const imgAvatarPerfil = document.getElementById("img-avatar-perfil");
    const imgAvatarSidebar = document.getElementById("img-avatar-sidebar");
    const divAvatarPerfil = document.getElementById("avatar-perfil");
    const divAvatarSidebar = document.getElementById("avatar-inicial");

    function aplicarFotoPerfil(dataUrl) {
        const temFoto = Boolean(dataUrl);
        if (imgAvatarPerfil && divAvatarPerfil) {
            imgAvatarPerfil.src = dataUrl || "";
            imgAvatarPerfil.hidden = !temFoto;
            divAvatarPerfil.hidden = temFoto;
            imgAvatarPerfil.style.display = temFoto ? "block" : "none";
            divAvatarPerfil.style.display = temFoto ? "none" : "flex";
        }
        if (imgAvatarSidebar && divAvatarSidebar) {
            imgAvatarSidebar.src = dataUrl || "";
            imgAvatarSidebar.hidden = !temFoto;
            divAvatarSidebar.hidden = temFoto;
            imgAvatarSidebar.style.display = temFoto ? "block" : "none";
            divAvatarSidebar.style.display = temFoto ? "none" : "flex";
        }
        if (btnRemoverFoto) {
            btnRemoverFoto.hidden = !temFoto;
        }
    }

    if (inputFoto) {
        inputFoto.addEventListener("change", (evento) => {
            const arquivo = evento.target.files[0];
            if (!arquivo) return;

            const leitor = new FileReader();
            leitor.onload = (e) => {
                const imgTemp = new Image();
                imgTemp.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 128;
                    canvas.height = 128;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(imgTemp, 0, 0, 128, 128);

                    const fotoBase64 = canvas.toDataURL("image/jpeg", 0.85);
                    aplicarFotoPerfil(fotoBase64);
                };
                imgTemp.src = e.target.result;
            };
            leitor.readAsDataURL(arquivo);
        });
    }

    if (btnRemoverFoto) {
        btnRemoverFoto.addEventListener("click", () => {
            if (inputFoto) inputFoto.value = "";
            aplicarFotoPerfil(null);
        });
    }
});