<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
verificarLogin();
$idUsuarioAtual = (int) $_SESSION['usuario_id'];
$amigoAtivoId = 0;
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Discord</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="../style/inicio.css?v=<?= filemtime(dirname(__DIR__) . '/assets/style/inicio.css') ?>">
    <link rel="stylesheet" href="../style/notificacoes.css?v=<?= filemtime(dirname(__DIR__) . '/assets/style/notificacoes.css') ?>">
    <link rel="stylesheet" href="../style/chamadas.css?v=<?= filemtime(dirname(__DIR__) . '/assets/style/chamadas.css') ?>">
    <link rel="stylesheet" href="../style/configuracoes-popup.css?v=<?= filemtime(dirname(__DIR__) . '/assets/style/configuracoes-popup.css') ?>">
    <link rel="stylesheet" href="../style/modal-servidor.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body>

<div class="layout-aplicativo" data-usuario-id="<?= $idUsuarioAtual ?>">
    <!-- 1. barra lateral de servidores -->
    <?php include __DIR__ . '/includes/sidebarServidores.php'; ?>

    <!-- sidebar de dms -->
    <aside class="barra-dms" aria-label="Mensagens Diretas">
        <header class="cabecalho-dms">
            <input type="search" id="busca-dm" placeholder="Encontre ou comece uma conversa" aria-label="Encontre ou comece uma conversa">
            <!-- Botão + visível apenas no Mobile conforme wireframe -->
            <button type="button" class="btn-add-amigo-mobile" id="btn-abrir-add-mobile" title="Adicionar amigo" aria-label="Adicionar amigo">
                <i class="bi bi-plus-lg"></i>
            </button>
        </header>
        <div class="lista-dms-container">
            <?php include __DIR__ . '/includes/listaDMs.php'; ?>
        </div>

        <!-- painel inferior do usuario -->
        <div class="painel-usuario">
            <div class="info-usuario">
                <div class="avatar-usuario">
                    <?php if (!empty($usuarioSidebar['foto_perfil'])): ?>
                        <img src="<?= htmlspecialchars($usuarioSidebar['foto_perfil'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                    <?php endif; ?>
                    <span class="ponto-status online"></span>
                </div>
                <div class="detalhes-usuario">
                    <strong data-nome-usuario><?= htmlspecialchars($usuarioSidebar['apelido'], ENT_QUOTES, 'UTF-8') ?></strong>
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

    <!-- area principal de amigos (Desktop) -->
    <main class="area-amigos" id="area-amigos">
        <header class="cabecalho-amigos">
            <button type="button" class="btn-voltar-dms" id="btn-voltar-dms" aria-label="Voltar às mensagens diretas">
                <i class="bi bi-arrow-left"></i>
            </button>
            <div class="titulo-amigos">
                <i class="bi bi-person-raised-hand"></i>
                <h1>Amigos</h1>
            </div>
            <div class="divisor-vertical"></div>
            <nav class="abas-amigos" aria-label="Filtro de amigos">
                <button type="button" class="aba-amigo" data-filtro="disponiveis">Disponíveis</button>
                <button type="button" class="aba-amigo ativa" data-filtro="todos">Todos</button>
                <button type="button" class="aba-amigo aba-solicitacoes" data-filtro="solicitacoes" aria-label="Solicitações">
                    Solicitações
                    <span class="aviso-solicitacoes" id="aviso-solicitacoes" aria-hidden="true" hidden></span>
                </button>
                <button type="button" class="aba-amigo btn-roxo-amigo" data-filtro="adicionar">Adicionar amigo</button>
            </nav>
        </header>

        <div class="corpo-amigos">
            <div class="coluna-principal-amigos">
                <section class="conteudo-lista-amigos ativo" id="secao-lista-amigos">
                    <div class="barra-busca-amigos">
                        <input type="search" id="input-busca-amigos" placeholder="Buscar" aria-label="Buscar amigos">
                        <i class="bi bi-search"></i>
                    </div>

                    <h2 class="contador-amigos" id="contador-amigos">AMIGOS</h2>
                    <ul class="lista-amigos" id="lista-amigos"></ul>
                    <section class="secao-solicitacoes" id="secao-solicitacoes" hidden>
                        <h2>Solicitações pendentes</h2>
                        <ul class="lista-solicitacoes" id="lista-solicitacoes"></ul>
                        <p id="vazio-solicitacoes" hidden>Você não tem solicitações pendentes.</p>
                    </section>
                </section>

                <section class="conteudo-adicionar-amigo" id="secao-adicionar-amigo">
                    <h2>ADICIONAR AMIGO</h2>
                    <p>Você pode adicionar amigos com o nome de usuário deles no Mock Discord.</p>

                    <form id="form-adicionar-amigo" class="form-add-amigo" data-csrf-token="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>" novalidate>
                        <input type="text" id="input-novo-amigo" placeholder="Nome, ID ou nome#ID..." maxlength="80" autocomplete="off" required>
                        <button type="submit" class="btn-enviar-pedido">Enviar pedido de amizade</button>
                    </form>
                    <span class="feedback-amigo" id="feedback-amigo" role="status"></span>
                </section>

                <footer class="rodape-academico">
                    Clone simplificado do Discord para trabalho acadêmico (IFC Campus Concórdia). Dados fictícios.
                </footer>
            </div>

            <aside class="barra-ativo-agora" aria-label="Amigos online">
                <h2>Amigos online</h2>
                <div class="lista-ativo-agora" id="lista-ativo-agora"></div>
            </aside>
        </div>
    </main>
</div>

<script src="../js/sessao.js"></script>
<script src="../js/inicio.js"></script>
<script src="/socket.io/socket.io.js" onerror="console.error('Servidor em tempo real indisponível.')"></script>
<script src="../js/sons.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/sons.js') ?>"></script>
<script src="../js/chamadas.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/chamadas.js') ?>"></script>
<script src="../js/notificacoes.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/notificacoes.js') ?>"></script>
<script src="../js/amigos.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/amigos.js') ?>"></script>
<script src="../js/configuracoes-popup.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/configuracoes-popup.js') ?>"></script>
<script src="../js/permissoes-servidor.js"></script>
<script src="../js/criar-servidor.js"></script>
</body>
</html>