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

    function aplicarFotoPerfil(url) {
        const temFoto = Boolean(url);
        if (imgAvatarPerfil && divAvatarPerfil) {
            imgAvatarPerfil.src = url || "";
            imgAvatarPerfil.hidden = !temFoto;
            divAvatarPerfil.hidden = temFoto;
            imgAvatarPerfil.style.display = temFoto ? "block" : "none";
            divAvatarPerfil.style.display = temFoto ? "none" : "flex";
        }
        if (imgAvatarSidebar && divAvatarSidebar) {
            imgAvatarSidebar.src = url || "";
            imgAvatarSidebar.hidden = !temFoto;
            divAvatarSidebar.hidden = temFoto;
            imgAvatarSidebar.style.display = temFoto ? "block" : "none";
            divAvatarSidebar.style.display = temFoto ? "none" : "flex";
        }
        if (btnRemoverFoto) {
            btnRemoverFoto.hidden = !temFoto;
        }
    }

    const statusFotoPerfil = document.getElementById("status-foto-perfil");
    const csrfToken = document.body.dataset.csrfToken;
    aplicarFotoPerfil(document.body.dataset.fotoPerfil || "");

    async function salvarFotoPerfil(acao, arquivo = null) {
        const dados = new FormData();
        dados.set("acao", acao);
        dados.set("csrf_token", csrfToken);
        if (arquivo) dados.set("foto", arquivo);

        const resposta = await fetch("includes/perfilFoto.php", {
            method: "POST",
            body: dados,
            credentials: "same-origin",
            cache: "no-store"
        });
        let resultado;
        try {
            resultado = await resposta.json();
        } catch {
            throw new Error("Não foi possível interpretar a resposta ao salvar a foto. Atualize a página e tente novamente.");
        }
        if (!resposta.ok) {
            throw new Error(resultado.erro || "Não foi possível salvar a foto.");
        }
        aplicarFotoPerfil(resultado.url || "");
        document.body.dataset.fotoPerfil = resultado.url || "";
        statusFotoPerfil.textContent = acao === "remover"
            ? "Foto removida."
            : "Foto de perfil salva.";
        if (emPopup) {
            window.parent.postMessage({
                type: "foto-perfil-atualizada",
                url: resultado.url || ""
            }, window.location.origin);
        }
    }

    if (inputFoto) {
        inputFoto.addEventListener("change", async (evento) => {
            const arquivo = evento.target.files[0];
            if (!arquivo) return;
            statusFotoPerfil.textContent = "Salvando foto...";
            try {
                await salvarFotoPerfil("salvar", arquivo);
            } catch (erro) {
                statusFotoPerfil.textContent = erro.message;
            } finally {
                inputFoto.value = "";
            }
        });
    }

    if (btnRemoverFoto) {
        btnRemoverFoto.addEventListener("click", async () => {
            statusFotoPerfil.textContent = "Removendo foto...";
            try {
                await salvarFotoPerfil("remover");
            } catch (erro) {
                statusFotoPerfil.textContent = erro.message;
            }
        });
    }
});