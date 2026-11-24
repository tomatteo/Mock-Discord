document.addEventListener("DOMContentLoaded", () => {
    const listaMensagens = document.getElementById("lista-mensagens");
    const inputMensagem = document.getElementById("input-mensagem");
    const erroMensagem = document.getElementById("erro-mensagem");
    const formularioMensagem = document.getElementById("form-mensagem");
    const dialogoCanal = document.getElementById("dialogo-canal");
    const formularioCanal = document.getElementById("form-dialogo-canal");
    const inputNomeCanal = document.getElementById("input-nome-canal");
    const erroDialogo = document.getElementById("erro-dialogo-canal");
    const listaCanaisTexto = document.getElementById("lista-canais-texto");
    const tituloCanalAtivo = document.getElementById("titulo-canal-ativo");
    const servidorId = Number(listaCanaisTexto.dataset.servidorId);
    const usuarioId = Number(document.querySelector(".layout-aplicativo").dataset.usuarioId);
    let canalIdAtual = Number(listaCanaisTexto.querySelector(".item-canal.ativo")?.dataset.canalId) || null;
    let requisicaoMensagens = 0;
    let maiorIdMensagem = 0;
    let carregandoMensagens = false;
    let buscandoNovasMensagens = false;

    function mostrarEstadoVazio(titulo, descricao = "") {
        const estado = document.createElement("div");
        estado.className = "estado-vazio";

        const icone = document.createElement("i");
        icone.className = "bi bi-chat-dots";
        icone.setAttribute("aria-hidden", "true");

        const cabecalho = document.createElement("h3");
        cabecalho.textContent = titulo;
        estado.append(icone, cabecalho);

        if (descricao) {
            const texto = document.createElement("p");
            texto.textContent = descricao;
            estado.appendChild(texto);
        }

        listaMensagens.replaceChildren(estado);
    }

    function formatarHora(valor) {
        const data = new Date(valor.replace(" ", "T"));
        if (Number.isNaN(data.getTime())) return "";
        return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    function criarElementoMensagem(mensagem) {
        const item = document.createElement("article");
        item.className = "item-mensagem";
        item.dataset.mensagemId = mensagem.id;

        const avatar = document.createElement("div");
        avatar.className = "avatar-mensagem";
        avatar.setAttribute("aria-hidden", "true");
        if (mensagem.fotoPerfil) {
            const imagem = document.createElement("img");
            imagem.src = mensagem.fotoPerfil;
            imagem.alt = "";
            imagem.onerror = () => {
                imagem.remove();
                avatar.textContent = Array.from(mensagem.usuario.trim())[0]?.toLocaleUpperCase("pt-BR") || "?";
            };
            avatar.appendChild(imagem);
        } else {
            avatar.textContent = Array.from(mensagem.usuario.trim())[0]?.toLocaleUpperCase("pt-BR") || "?";
        }

        const conteudo = document.createElement("div");
        conteudo.className = "conteudo-mensagem";

        const metadados = document.createElement("div");
        metadados.className = "metadados-mensagem";

        const autor = document.createElement("strong");
        autor.className = "autor-mensagem";
        autor.textContent = mensagem.usuario;

        const horario = document.createElement("time");
        horario.className = "horario-mensagem";
        horario.dateTime = mensagem.enviadoEm.replace(" ", "T");
        horario.textContent = formatarHora(mensagem.enviadoEm);

        const texto = document.createElement("div");
        texto.className = "texto-mensagem";
        texto.textContent = mensagem.texto;

        metadados.append(autor, horario);
        conteudo.append(metadados, texto);
        item.append(avatar, conteudo);
        return item;
    }

    function adicionarMensagem(mensagem, tocarSom = false) {
        if (listaMensagens.querySelector(`[data-mensagem-id="${mensagem.id}"]`)) return;
        document.getElementById("estado-vazio")?.remove();
        listaMensagens.appendChild(criarElementoMensagem(mensagem));
        maiorIdMensagem = Math.max(maiorIdMensagem, Number(mensagem.id));
        if (tocarSom && Number(mensagem.usuarioId) !== usuarioId) {
            window.mockDiscordSounds?.tocarMensagem();
        }
        listaMensagens.scrollTop = listaMensagens.scrollHeight;
    }

    async function lerResposta(resposta) {
        const dados = await resposta.json();
        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível concluir a operação.");
        }
        return dados;
    }

    async function carregarMensagens(canalId) {
        const sequencia = ++requisicaoMensagens;
        maiorIdMensagem = 0;
        carregandoMensagens = true;
        erroMensagem.textContent = "";
        mostrarEstadoVazio("Carregando mensagens…");

        try {
            const parametros = new URLSearchParams({
                servidor: String(servidorId),
                canal: String(canalId)
            });
            const resposta = await fetch(`includes/mensagensCanal.php?${parametros}`, {
                headers: { Accept: "application/json" }
            });
            const dados = await lerResposta(resposta);
            if (sequencia !== requisicaoMensagens || canalId !== canalIdAtual) return;

            listaMensagens.replaceChildren();
            if (dados.mensagens.length === 0) {
                mostrarEstadoVazio("Este canal ainda está vazio", "Envie a primeira mensagem para começar a conversa.");
                return;
            }
            dados.mensagens.forEach((mensagem) => {
                adicionarMensagem(mensagem);
            });
        } catch (erro) {
            if (sequencia !== requisicaoMensagens) return;
            console.error("Não foi possível carregar as mensagens do canal:", erro);
            mostrarEstadoVazio("Não foi possível carregar as mensagens", erro.message);
        } finally {
            if (sequencia === requisicaoMensagens) carregandoMensagens = false;
        }
    }

    // busca apenas mensagens posteriores a ultima recebida sem recarregar a pagina
    async function buscarNovasMensagens() {
        const canalId = canalIdAtual;
        if (!canalId || carregandoMensagens || buscandoNovasMensagens || document.hidden) return;

        const sequencia = requisicaoMensagens;
        buscandoNovasMensagens = true;
        try {
            const parametros = new URLSearchParams({
                servidor: String(servidorId),
                canal: String(canalId),
                depois: String(maiorIdMensagem)
            });
            const resposta = await fetch(`includes/mensagensCanal.php?${parametros}`, {
                headers: { Accept: "application/json" }
            });
            const dados = await lerResposta(resposta);
            if (sequencia !== requisicaoMensagens || canalId !== canalIdAtual) return;

            erroMensagem.textContent = "";
            dados.mensagens.forEach((mensagem) => adicionarMensagem(mensagem, true));
        } catch (erro) {
            if (sequencia !== requisicaoMensagens) return;
            console.error("Não foi possível atualizar as mensagens do canal:", erro);
            erroMensagem.textContent = erro.message;
        } finally {
            buscandoNovasMensagens = false;
        }
    }

    function selecionarCanal(canal) {
        const nomeCanal = canal.dataset.canal;
        canalIdAtual = Number(canal.dataset.canalId);
        if (!nomeCanal || !canalIdAtual) return;

        listaCanaisTexto.querySelectorAll(".item-canal").forEach((item) => {
            const ativo = item === canal;
            item.classList.toggle("ativo", ativo);
            item.setAttribute("aria-pressed", String(ativo));
        });

        tituloCanalAtivo.textContent = nomeCanal;
        inputMensagem.placeholder = `Conversar em # ${nomeCanal}`;
        inputMensagem.setAttribute("aria-label", `Digite sua mensagem em # ${nomeCanal}`);
        inputMensagem.disabled = false;
        inputMensagem.value = "";
        erroMensagem.textContent = "";
        history.replaceState(null, "", `${location.pathname}?servidor=${servidorId}&canal=${canalIdAtual}`);
        carregarMensagens(canalIdAtual);
    }

    function criarItemCanal(canal) {
        const item = document.createElement("li");
        item.className = "item-canal";
        item.dataset.canalId = canal.id;
        item.dataset.canal = canal.nome;
        item.setAttribute("role", "button");
        item.tabIndex = 0;
        item.setAttribute("aria-pressed", "false");

        const icone = document.createElement("i");
        icone.className = "bi bi-hash";
        icone.setAttribute("aria-hidden", "true");

        const nome = document.createElement("span");
        nome.textContent = canal.nome;
        item.append(icone, nome);
        return item;
    }

    listaCanaisTexto.addEventListener("click", (evento) => {
        const canal = evento.target.closest(".item-canal");
        if (canal) selecionarCanal(canal);
    });

    listaCanaisTexto.addEventListener("keydown", (evento) => {
        if (evento.key !== "Enter" && evento.key !== " ") return;
        const canal = evento.target.closest(".item-canal");
        if (!canal) return;
        evento.preventDefault();
        selecionarCanal(canal);
    });

    formularioMensagem.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const texto = inputMensagem.value.trim();
        if (!texto) {
            erroMensagem.textContent = "Não é possível enviar uma mensagem vazia.";
            inputMensagem.focus();
            return;
        }
        if (Array.from(texto).length > 250) {
            erroMensagem.textContent = "A mensagem não pode exceder 250 caracteres.";
            return;
        }
        if (!canalIdAtual) {
            erroMensagem.textContent = "Selecione um canal de texto antes de enviar.";
            return;
        }

        const botaoEnviar = formularioMensagem.querySelector('[type="submit"]');
        const canalEnvioId = canalIdAtual;
        botaoEnviar.disabled = true;
        erroMensagem.textContent = "";
        try {
            // adiciona a mensagem ao chat apos confirmar que ela foi salva no banco.
            const resposta = await fetch("includes/mensagensCanal.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    servidor: servidorId,
                    canal: canalEnvioId,
                    mensagem: texto
                })
            });
            const dados = await lerResposta(resposta);
            if (canalIdAtual === canalEnvioId) {
                adicionarMensagem(dados.mensagem);
                inputMensagem.value = "";
            }
        } catch (erro) {
            console.error("Não foi possível enviar a mensagem:", erro);
            if (canalIdAtual === canalEnvioId) erroMensagem.textContent = erro.message;
        } finally {
            botaoEnviar.disabled = false;
        }
    });

    function abrirDialogo(tipo) {
        formularioCanal.dataset.tipo = tipo;
        erroDialogo.textContent = "";
        document.getElementById("titulo-dialogo-canal").textContent = `Criar canal de ${tipo}`;
        document.getElementById("confirmar-dialogo-canal").textContent = "Criar canal";
        inputNomeCanal.value = "";
        inputNomeCanal.placeholder = tipo === "texto" ? "ex.: conversas" : "ex.: geral";
        dialogoCanal.showModal();
        inputNomeCanal.focus();
    }

    document.getElementById("botao-adicionar-texto").addEventListener("click", () => abrirDialogo("texto"));
    document.getElementById("botao-adicionar-voz").addEventListener("click", () => abrirDialogo("voz"));
    document.getElementById("cancelar-dialogo-canal").addEventListener("click", () => dialogoCanal.close());
    dialogoCanal.addEventListener("click", (evento) => {
        if (evento.target === dialogoCanal) dialogoCanal.close();
    });

    formularioCanal.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nome = inputNomeCanal.value.trim();
        if (!nome) {
            erroDialogo.textContent = "Digite um nome para o canal.";
            inputNomeCanal.focus();
            return;
        }
        if (formularioCanal.dataset.tipo !== "texto") {
            erroDialogo.textContent = "A criação de canais de voz ainda não está disponível.";
            return;
        }

        const botaoCriar = document.getElementById("confirmar-dialogo-canal");
        botaoCriar.disabled = true;
        erroDialogo.textContent = "";
        try {
            const resposta = await fetch("includes/canaisServidor.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({ servidor: servidorId, nome })
            });
            const dados = await lerResposta(resposta);
            const novoCanal = criarItemCanal(dados.canal);
            listaCanaisTexto.appendChild(novoCanal);
            dialogoCanal.close();
            selecionarCanal(novoCanal);
        } catch (erro) {
            console.error("Não foi possível criar o canal:", erro);
            erroDialogo.textContent = erro.message;
        } finally {
            botaoCriar.disabled = false;
        }
    });

    const btnMic = document.getElementById("botao-microfone");
    const btnAudio = document.getElementById("botao-audio");
    btnMic.addEventListener("click", () => {
        btnMic.classList.toggle("silenciado");
        btnMic.querySelector("i").className = btnMic.classList.contains("silenciado")
            ? "bi bi-mic-mute-fill"
            : "bi bi-mic-fill";
    });
    btnAudio.addEventListener("click", () => {
        btnAudio.classList.toggle("silenciado");
    });

    if (canalIdAtual) {
        carregarMensagens(canalIdAtual);
    } else {
        mostrarEstadoVazio("Nenhum canal de texto", "Crie um canal para iniciar a conversa.");
    }

    // verifica se outras pessoas enviaram mensagens neste canal.
    window.setInterval(buscarNovasMensagens, 2000);
});
