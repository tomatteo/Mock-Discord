<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';

?>


<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Discord</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="../style/servidor.css?v=<?= filemtime(__DIR__ . '/style/servidor.css') ?>">
    <link rel="stylesheet" href="../style/configuracoes-popup.css">
    <link rel="stylesheet" href="../style/modal-servidor.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body>

<div class="layout-aplicativo">
    <!-- barra lateral servidores -->
    <?php
    include __DIR__ . '/includes/sidebarServidores.php';
    ?>

    <!-- canais laterais e perfil do user -->
    <aside class="barra-canais" id="barra-canais" aria-label="Canais do servidor">
        <header class="cabecalho-servidor">
            <h1 class="nome-servidor">Comunidade IFC</h1>
            <div class="acoes-cabecalho-servidor">
                <a href="config-servidor.php" class="botao-icone" id="link-config-servidor" title="Configurações do servidor" aria-label="Configurações do servidor">
                    <i class="bi bi-chevron-down"></i>
                </a>
                <button class="botao-icone" id="botao-convidar-servidor" title="Convidar pessoas" aria-label="Convidar pessoas">
                    <i class="bi bi-person-plus-fill"></i>
                </button>
            </div>
        </header>

        <div class="lista-canais">
            <!-- canais de texto -->
            <section class="categoria-canal">
                <div class="cabecalho-categoria">
                    <span><i class="bi bi-chevron-down"></i> Canais de Texto</span>
                    <button class="botao-icone-pequeno" id="botao-adicionar-texto" title="Criar Canal de Texto" aria-label="Criar Canal de Texto">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>
                <ul id="lista-canais-texto" role="list">
                    <li class="item-canal ativo" data-canal="geral">
                        <i class="bi bi-hash"></i> <span>geral</span>
                    </li>
                    <li class="item-canal" data-canal="avisos">
                        <i class="bi bi-hash"></i> <span>avisos</span>
                    </li>
                    <li class="item-canal" data-canal="dúvidas">
                        <i class="bi bi-hash"></i> <span>dúvidas</span>
                    </li>
                    <li class="item-canal" data-canal="projetos">
                        <i class="bi bi-hash"></i> <span>projetos</span>
                    </li>
                </ul>
            </section>

            <!-- canais de voz -->
            <section class="categoria-canal">
                <div class="cabecalho-categoria">
                    <span><i class="bi bi-chevron-down"></i> Canais de Voz</span>
                    <button class="botao-icone-pequeno" id="botao-adicionar-voz" title="Criar Canal de Voz" aria-label="Criar Canal de Voz">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>
                <ul id="lista-canais-voz" role="list">
                    <li class="grupo-canal-voz">
                        <button type="button" class="canal-voz-item item-voz" data-voz="Geral">
                            <span class="canal-voz-esquerda">
                                <svg class="canal-voz-icone" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00204H3C2.45 8.00204 2 8.45304 2 9.00204V15.002C2 15.552 2.45 16.002 3 16.002H6L10.293 20.71C10.579 20.996 11.009 21.082 11.383 20.927C11.757 20.772 12 20.407 12 20.002V4.00204C12 3.59904 11.757 3.23204 11.383 3.07904ZM14 5.00195V7.00195C16.757 7.00195 19 9.24595 19 12.002C19 14.759 16.757 17.002 14 17.002V19.002C17.86 19.002 21 15.863 21 12.002C21 8.14295 17.86 5.00195 14 5.00195ZM14 9.00195C15.654 9.00195 17 10.349 17 12.002C17 13.657 15.654 15.002 14 15.002V13.002C14.551 13.002 15 12.553 15 12.002C15 11.451 14.551 11.002 14 11.002V9.00195Z"/>
                                </svg>
                                <span class="canal-voz-nome">Geral</span>
                            </span>
                        </button>
                        <ul class="voz-usuarios-lista" data-sala-voz="comunidade-ifc:geral"
                            aria-label="Participantes no canal Geral" aria-live="polite" hidden></ul>
                    </li>
                    <li class="grupo-canal-voz">
                        <button type="button" class="canal-voz-item item-voz" data-voz="Estudos">
                            <span class="canal-voz-esquerda">
                                <svg class="canal-voz-icone" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00204H3C2.45 8.00204 2 8.45304 2 9.00204V15.002C2 15.552 2.45 16.002 3 16.002H6L10.293 20.71C10.579 20.996 11.009 21.082 11.383 20.927C11.757 20.772 12 20.407 12 20.002V4.00204C12 3.59904 11.757 3.23204 11.383 3.07904ZM14 5.00195V7.00195C16.757 7.00195 19 9.24595 19 12.002C19 14.759 16.757 17.002 14 17.002V19.002C17.86 19.002 21 15.863 21 12.002C21 8.14295 17.86 5.00195 14 5.00195ZM14 9.00195C15.654 9.00195 17 10.349 17 12.002C17 13.657 15.654 15.002 14 15.002V13.002C14.551 13.002 15 12.553 15 12.002C15 11.451 14.551 11.002 14 11.002V9.00195Z"/>
                                </svg>
                                <span class="canal-voz-nome">Estudos</span>
                            </span>
                        </button>
                        <ul class="voz-usuarios-lista" data-sala-voz="comunidade-ifc:estudos"
                            aria-label="Participantes no canal Estudos" aria-live="polite" hidden></ul>
                    </li>
                </ul>
            </section>
        </div>
        <dialog id="dialogo-canal" class="dialogo-canal" aria-labelledby="titulo-dialogo-canal">
            <form id="form-dialogo-canal" novalidate>
                <h2 id="titulo-dialogo-canal"></h2>
                <label for="input-nome-canal">Nome do canal</label>
                <input id="input-nome-canal" type="text" maxlength="50" autocomplete="off" required>
                <span id="erro-dialogo-canal" class="erro-dialogo-canal" role="alert"></span>
                <div class="acoes-dialogo-canal">
                    <button type="button" id="cancelar-dialogo-canal">Cancelar</button>
                    <button type="submit" id="confirmar-dialogo-canal"></button>
                </div>
            </form>
        </dialog>

        <div class="dock-inferior-esquerda">
            <div id="painel-voz-conectada" class="painel-voz-dock" hidden>
                <div class="voz-dock-icone-sinal" title="Conectado ao canal de voz" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                        <path d="M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" stroke="none"/>
                        <path d="M5 13a6 6 0 0 1 6 6"/>
                        <path d="M5 9a10 10 0 0 1 10 10"/>
                        <path d="M5 5a14 14 0 0 1 14 14"/>
                    </svg>
                </div>
                <div class="voz-dock-info">
                    <span class="voz-dock-titulo">Voz conectada</span>
                    <span id="voz-dock-subtitulo" class="voz-dock-subtitulo"></span>
                </div>
                <div class="voz-dock-acoes">
                    <button id="btn-voz-desconectar" type="button" class="voz-dock-btn desligar"
                        title="Desconectar" aria-label="Desconectar do canal de voz">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="painel-usuario">
                <div class="info-usuario">
                    <div class="avatar-circular">
                        <span class="indicador-status conectado" title="Online"></span>
                    </div>
                    <div class="detalhes-usuario">
                        <strong class="nome-usuario" data-nome-usuario><?= htmlspecialchars($_SESSION['usuario_apelido'] ?? 'Você', ENT_QUOTES, 'UTF-8') ?></strong>
                        <span class="status-usuario">online</span>
                    </div>
                </div>
                <div class="controles-usuario">
                    <button class="botao-controle" id="botao-microfone" title="Silenciar microfone" aria-label="Microfone">
                        <i class="bi bi-mic-fill"></i>
                    </button>
                    <button class="botao-controle" id="botao-audio" title="Desativar áudio" aria-label="Fone de ouvido">
                        <i class="bi bi-headphones"></i>
                    </button>
                    <a href="configuracoes.php" class="botao-controle" title="Configurações de Usuário" aria-label="Configurações">
                        <i class="bi bi-gear-fill"></i>
                    </a>
                </div>
            </div>
        </div>
    </aside>

    <!-- area do chat-->
    <main class="area-conversa">
        <!-- cabeçalho do canal -->
        <header class="cabecalho-conversa">
            <div class="grupo-titulo-conversa">
                <i class="bi bi-hash simbolo-canal"></i>
                <h2 id="titulo-canal-ativo">geral</h2>
            </div>

            <div class="cabecalho-conversa">
                <button class="botao-icone somente-desktop" title="Lista de Membros" aria-label="Lista de Membros">
                    <i class="bi bi-people-fill"></i>
                </button>
                <div class="caixa-busca somente-desktop">
                    <i class="bi bi-search"></i>
                    <input type="search" id="campo-busca-mensagens" placeholder="Buscar no canal de texto" aria-label="Buscar no canal de texto">
                </div>
            </div>
        </header>

        <!-- mensagens -->
        <section class="lista-mensagens" id="lista-mensagens" aria-live="polite">
            <div class="estado-vazio" id="estado-vazio">
                <i class="bi bi-chat-dots" aria-hidden="true"></i>
                <h3>Este canal ainda está vazio</h3>
                <p>Envie a primeira mensagem para começar a conversa.</p>
            </div>
        </section>

        <!-- input de nova mensagem -->
        <footer class="chat-footer">
            <form id="form-mensagem" class="formulario-mensagem" novalidate>
                <button type="button" class="botao-anexo" title="Enviar arquivo" aria-label="Anexar arquivo">
                    <i class="bi bi-plus-circle-fill"></i>
                </button>
                <input
                    type="text"
                    id="input-mensagem"
                    placeholder="Conversar em # geral"
                    aria-label="Digite sua mensagem"
                    required
                >
                <button type="submit" class="botao-enviar" title="Enviar mensagem" aria-label="Enviar mensagem">
                    <i class="bi bi-send-fill"></i>
                </button>
            </form>
            <span id="erro-mensagem" class="feedback-erro" role="alert"></span>
            <p class="aviso-academico">
                Clone simplificado do Discord para trabalho acadêmico (IFC Campus Concórdia).
            </p>
        </footer>
    </main>
</div>

<script src="http://localhost:3001/socket.io/socket.io.js"></script>
<script>
    const socket = io("http://localhost:3001");

    socket.on("connect", () => {
        console.log("Socket conectado:", socket.id);
    });

    socket.on("servidor:pronto", (dados) => {
        console.log(dados.mensagem);
    });

    socket.on("connect_error", (erro) => {
        console.error("Erro de conexão:", erro.message);
    });

    const listaVoz = document.getElementById("lista-canais-voz");
    const painelVoz = document.getElementById("painel-voz-conectada");
    const subtituloPainelVoz = document.getElementById("voz-dock-subtitulo");
    const botaoDesconectarVoz = document.getElementById("btn-voz-desconectar");
    const participantesPorSala = new Map();
    let salaVozAtual = "";
    const namespaceSvg = "http://www.w3.org/2000/svg";
    const caminhosIconesVoz = {
        micMutado: "M6.7 11H5C5 12.19 5.34 13.3 5.9 14.28L7.13 13.05C6.86 12.43 6.7 11.74 6.7 11ZM17.3 11C17.3 11.55 17.2 12.07 17.04 12.56L18.31 13.83C18.75 12.98 19 12.02 19 11H17.3ZM12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V5.18L14.82 11H15L12 14ZM3.27 2L2 3.27L9 10.27V11C9 12.66 10.34 14 12 14C12.22 14 12.44 13.97 12.65 13.92L14.31 15.58C13.6 15.91 12.81 16.1 12 16.1C9.24 16.1 6.7 14 6.7 11H5C5 14.41 7.72 17.23 11 17.72V21H13V17.72C13.91 17.59 14.77 17.27 15.54 16.82L19.73 21L21 19.73L3.27 2Z",
        foneEnsurdecido: "M12 3C7.03 3 3 7.03 3 12V19C3 20.1 3.9 21 5 21H9V13H5V12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12V13H15V21H19C20.1 21 21 20.1 21 19V12C21 7.03 16.97 3 12 3Z",
        headsetConectado: "M12 3C7.03 3 3 7.03 3 12V19C3 20.1 3.9 21 5 21H9V13H5V12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12V13H15V21H19C20.1 21 21 20.1 21 19V12C21 7.03 16.97 3 12 3Z"
    };

    function criarIconeEstado(tipo, titulo, mutado = false) {
        const svg = document.createElementNS(namespaceSvg, "svg");
        svg.setAttribute("class", `voz-estado-icone${mutado ? " mutado" : ""}`);
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", titulo);
        svg.setAttribute("title", titulo);

        const caminho = document.createElementNS(namespaceSvg, "path");
        caminho.setAttribute("d", caminhosIconesVoz[tipo]);
        svg.appendChild(caminho);
        return svg;
    }

    function atualizarPainelVoz(salaId) {
        const canal = Array.from(listaVoz.querySelectorAll(".item-voz"))
            .find((item) => `comunidade-ifc:${item.dataset.voz.toLowerCase()}` === salaId);
        const nomeCanal = canal?.querySelector(".canal-voz-nome")?.textContent.trim();
        const nomeServidor = document.querySelector(".nome-servidor")?.textContent.trim();
        if (!nomeCanal || !nomeServidor) return;

        subtituloPainelVoz.textContent = `${nomeCanal} / ${nomeServidor}`;
        painelVoz.hidden = false;
    }

    function encerrarConexaoVoz(emitirEvento = true) {
        if (!salaVozAtual) return;

        const salaId = salaVozAtual;
        if (emitirEvento) {
            socket.emit("voz:sair");
        }
        if (socket.id) {
            const participantes = participantesPorSala.get(salaId) || [];
            participantesPorSala.set(
                salaId,
                participantes.filter((participante) => participante.socketId !== socket.id)
            );
            renderizarParticipantes(salaId);
        }

        salaVozAtual = "";
        painelVoz.hidden = true;
        listaVoz.querySelectorAll(".item-voz").forEach((item) => item.classList.remove("ativo"));
    }

    function renderizarParticipantes(salaId) {
        const lista = Array.from(listaVoz.querySelectorAll(".voz-usuarios-lista"))
            .find((elemento) => elemento.dataset.salaVoz === salaId);
        if (!lista) return;

        const participantes = participantesPorSala.get(salaId) || [];
        lista.replaceChildren();
        lista.hidden = participantes.length === 0;

        participantes.forEach((participante) => {
            const item = document.createElement("li");
            item.className = "voz-usuario-item";
            item.classList.toggle("falando", participante.falando === true);

            const info = document.createElement("div");
            info.className = "voz-usuario-info";
            const avatar = document.createElement("span");
            avatar.className = "voz-usuario-avatar";
            avatar.setAttribute("aria-hidden", "true");
            avatar.textContent = participante.nome.trim().charAt(0).toUpperCase() || "?";

            const nome = document.createElement("span");
            nome.className = "voz-usuario-nome";
            nome.textContent = participante.nome;

            const estados = document.createElement("div");
            estados.className = "voz-usuario-estados";
            if (participante.ensurdecido === true) {
                estados.append(
                    criarIconeEstado("micMutado", "Mutado", true),
                    criarIconeEstado("foneEnsurdecido", "Ensurdecido", true)
                );
            } else if (participante.mutado === true) {
                estados.appendChild(criarIconeEstado("micMutado", "Mutado", true));
            } else {
                estados.appendChild(criarIconeEstado("headsetConectado", "Conectado por voz"));
            }

            info.append(avatar, nome);
            item.append(info, estados);
            lista.appendChild(item);
        });
    }

    listaVoz.addEventListener("click", (evento) => {
        const canal = evento.target.closest(".item-voz");
        if (!canal) return;

        const novaSalaId = `comunidade-ifc:${canal.dataset.voz.toLowerCase()}`;
        if (salaVozAtual && salaVozAtual !== novaSalaId && socket.id) {
            const participantesAnteriores = participantesPorSala.get(salaVozAtual) || [];
            participantesPorSala.set(
                salaVozAtual,
                participantesAnteriores.filter((participante) => participante.socketId !== socket.id)
            );
            renderizarParticipantes(salaVozAtual);
        }
        salaVozAtual = novaSalaId;
        listaVoz.querySelectorAll(".item-voz").forEach((item) => {
            item.classList.toggle("ativo", item === canal);
        });
        if (!participantesPorSala.has(salaVozAtual)) {
            participantesPorSala.set(salaVozAtual, []);
        }
        renderizarParticipantes(salaVozAtual);

        socket.emit("voz:entrar", {
            salaId: salaVozAtual,
            nome: document.querySelector("[data-nome-usuario]")?.textContent.trim() || "Você"
        });
    });

    socket.on("voz:participantes", ({ salaId, participantes }) => {
        participantesPorSala.set(salaId, participantes);
        renderizarParticipantes(salaId);
        if (salaId === salaVozAtual) {
            atualizarPainelVoz(salaId);
        }
    });

    socket.on("voz:participante-entrou", ({ salaId, participante }) => {
        const participantes = participantesPorSala.get(salaId) || [];
        if (!participantes.some((item) => item.socketId === participante.socketId)) {
            participantes.push(participante);
        }
        participantesPorSala.set(salaId, participantes);
        renderizarParticipantes(salaId);
    });

    socket.on("voz:participante-saiu", ({ salaId, socketId }) => {
        const participantes = participantesPorSala.get(salaId) || [];
        participantesPorSala.set(
            salaId,
            participantes.filter((participante) => participante.socketId !== socketId)
        );
        renderizarParticipantes(salaId);
    });

    socket.on("voz:erro", ({ mensagem }) => {
        console.error(mensagem);
    });

    botaoDesconectarVoz.addEventListener("click", () => encerrarConexaoVoz());
    socket.on("disconnect", () => encerrarConexaoVoz(false));
    window.addEventListener("beforeunload", () => socket.emit("voz:sair"));
</script>
<script src="../js/permissoes-servidor.js"></script>
<script src="../js/canais.js"></script>
<script src="../js/mensagens.js"></script>
<script src="../js/configuracoes-popup.js"></script>
<script src="../js/criar-servidor.js"></script>
</body>
</html>