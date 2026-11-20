<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mensagens Diretas - Mock Discord</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="../style/dm.css">
    <link rel="stylesheet" href="../style/configuracoes-popup.css">
    <link rel="stylesheet" href="../style/modal-servidor.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body>

<div class="layout-aplicativo">
    <!-- 1. Barra Lateral de Servidores -->
    <?php
    include __DIR__ . 'includes/sidebarServidores.php';
    ?>

    <!-- 2. Sidebar de Conversas Diretas -->
    <aside class="barra-dms" aria-label="Lista de conversas privadas">
        <header class="cabecalho-dms">
            <input type="search" id="busca-dm" placeholder="Encontre ou comece uma conversa" aria-label="Encontre ou comece uma conversa">
        </header>

        <div class="lista-dms-container">
            <ul class="lista-dms" id="lista-dms">
                <li>
                    <button type="button" class="item-dm" data-amigo="amigo1">
                        <div class="avatar-dm"><span class="ponto-status online"></span></div>
                        <span class="nome-dm">amigo 1</span>
                    </button>
                </li>
                <li>
                    <button type="button" class="item-dm ativo" data-amigo="amigo2">
                        <div class="avatar-dm"><span class="ponto-status online"></span></div>
                        <span class="nome-dm">amigo 2</span>
                    </button>
                </li>
                <li>
                    <button type="button" class="item-dm" data-amigo="amigo3">
                        <div class="avatar-dm"><span class="ponto-status ausente"></span></div>
                        <span class="nome-dm">amigo 3</span>
                    </button>
                </li>
            </ul>
        </div>

        <!-- Painel Inferior do Usuário -->
        <div class="painel-usuario">
            <div class="info-usuario">
                <div class="avatar-usuario">
                    <span class="ponto-status online"></span>
                </div>
                <div class="detalhes-usuario">
                    <strong data-nome-usuario>Você</strong>
                    <span>online</span>
                </div>
            </div>
            <div class="controles-usuario">
                <button type="button" class="btn-controle" id="btn-mic" title="Silenciar microfone" aria-label="Microfone">
                    <i class="bi bi-mic-fill"></i>
                </button>
                <button type="button" class="btn-controle" id="btn-audio" title="Desativar áudio" aria-label="Fone de ouvido">
                    <i class="bi bi-headphones"></i>
                </button>
                <a href="configuracoes.php" class="btn-controle" title="Configurações" aria-label="Configurações">
                    <i class="bi bi-gear-fill"></i>
                </a>
            </div>
        </div>
    </aside>

    <!-- 3. Área Principal da Conversa Privada -->
    <main class="area-chat-dm">
        <!-- Cabeçalho da Conversa -->
        <header class="cabecalho-chat">
            <div class="info-contato-chat">
                <!-- Seta de voltar visível apenas no Mobile (<= 768px) -->
                <a href="inicio.php" class="btn-voltar-dm-mobile" title="Voltar para conversas" aria-label="Voltar para conversas">
                    <i class="bi bi-arrow-left"></i>
                </a>
                <div class="avatar-header">
                    <span class="ponto-status online" id="status-amigo-ativo"></span>
                </div>
                <h1 id="nome-amigo-ativo">João Veloso</h1>
            </div>

            <div class="ferramentas-chat">
                <button type="button" class="btn-ferramenta" id="btn-iniciar-chamada" title="Iniciar chamada de voz" aria-label="Iniciar chamada de voz">
                    <i class="bi bi-telephone-fill"></i>
                </button>

                <!-- Campo de busca completo no Desktop -->
                <div class="caixa-busca-chat desktop-only">
                    <input type="search" id="input-busca-mensagens" placeholder="Buscar João Veloso" aria-label="Buscar na conversa">
                    <i class="bi bi-search"></i>
                </div>

                <!-- Ícone de busca compacto no Mobile -->
                <button type="button" class="btn-ferramenta mobile-only" id="btn-busca-mobile" title="Buscar mensagens" aria-label="Buscar mensagens">
                    <i class="bi bi-search"></i>
                </button>
            </div>
        </header>

        <!-- Barra de busca expansível no Mobile -->
        <div class="barra-busca-mobile" id="barra-busca-mobile">
            <input type="search" id="input-busca-mobile" placeholder="Buscar na conversa..." aria-label="Buscar na conversa">
        </div>

        <!-- Banner de Chamada de Voz Ativa (Oculto por padrão) -->
        <section class="banner-chamada" id="banner-chamada" hidden>
            <div class="chamada-info">
                <span class="indicador-voz"></span>
                <strong id="texto-chamada">Em chamada de voz com João Veloso</strong>
            </div>
            <button type="button" class="btn-encerrar-chamada" id="btn-encerrar-chamada">
                <i class="bi bi-telephone-x-fill"></i> Desconectar
            </button>
        </section>

        <!-- Feed de Mensagens -->
        <section class="container-mensagens" id="container-mensagens" aria-live="polite">
            <div class="lista-mensagens-dm" id="lista-mensagens-dm">
                <!-- Preenchido dinamicamente pelo dm.js -->
            </div>
        </section>

        <!-- Rodapé com Input de Mensagem -->
        <footer class="rodape-chat">
            <form id="form-mensagem-dm" class="form-mensagem-dm" novalidate>
                <button type="button" class="btn-anexar" title="Enviar arquivo" aria-label="Anexar arquivo">
                    <i class="bi bi-plus-circle-fill"></i>
                </button>
                <input
                    type="text"
                    id="input-mensagem-dm"
                    placeholder="Conversar em @João Veloso"
                    aria-label="Mensagem privada"
                    required
                >
                <button type="submit" class="btn-enviar" title="Enviar mensagem" aria-label="Enviar mensagem">
                    <i class="bi bi-send-fill"></i>
                </button>
            </form>
            <span id="erro-mensagem-dm" class="mensagem-erro" role="alert"></span>
            <p class="rodape-academico">
                Clone simplificado do Discord para trabalho acadêmico (IFC Campus Concórdia). Dados fictícios.
            </p>
        </footer>
    </main>
</div>

<script src="../js/sessao.js"></script>
<script src="../js/dm.js"></script>
<script src="../js/configuracoes-popup.js"></script>
<script src="../js/permissoes-servidor.js"></script>
<script src="../js/criar-servidor.js"></script>
</body>
</html>