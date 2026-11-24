<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
verificarLogin();

$idUsuarioAtual = (int) $_SESSION['usuario_id'];
$amigoAtivoId = filter_input(INPUT_GET, 'amigo', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$amigoAtivoId) {
    header('Location: inicio.php');
    exit;
}

$stmt = $pdo->prepare(
    'SELECT u.id, u.apelido, u.foto_perfil
     FROM amizades a
     INNER JOIN usuarios u
         ON u.id = IF(a.id_usuario_1 = :usuario_if, a.id_usuario_2, a.id_usuario_1)
     WHERE (a.id_usuario_1 = :usuario_1 OR a.id_usuario_2 = :usuario_2)
       AND u.id = :amigo'
);
$stmt->execute([
    ':usuario_if' => $idUsuarioAtual,
    ':usuario_1' => $idUsuarioAtual,
    ':usuario_2' => $idUsuarioAtual,
    ':amigo' => $amigoAtivoId
]);
$amigoAtivo = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$amigoAtivo) {
    http_response_code(404);
    exit('Essa conversa não existe ou vocês ainda não são amigos.');
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$idUsuario1 = min($idUsuarioAtual, $amigoAtivoId);
$idUsuario2 = max($idUsuarioAtual, $amigoAtivoId);
$stmt = $pdo->prepare(
    'INSERT INTO conversas (id_usuario_1, id_usuario_2)
     VALUES (:usuario_1, :usuario_2)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)'
);
$stmt->execute([':usuario_1' => $idUsuario1, ':usuario_2' => $idUsuario2]);
$idConversa = (int) $pdo->lastInsertId();

$erroMensagem = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        if (strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'xmlhttprequest') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['erro' => 'Sua sessão expirou. Atualize a página e tente novamente.']);
            exit;
        }
        exit('Sua sessão expirou. Atualize a página e tente novamente.');
    }

    $mensagem = is_string($_POST['mensagem'] ?? null) ? trim($_POST['mensagem']) : '';
    if (!preg_match('/\A.{1,250}\z/us', $mensagem)) {
        $erroMensagem = 'A mensagem deve ter entre 1 e 250 caracteres.';
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO conversa_mensagem (id_conversa, id_envio, mensagem)
             VALUES (:conversa, :usuario, :mensagem)'
        );
        $stmt->execute([
            ':conversa' => $idConversa,
            ':usuario' => $idUsuarioAtual,
            ':mensagem' => $mensagem
        ]);
        if (strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'xmlhttprequest') {
            $idMensagem = (int) $pdo->lastInsertId();
            $stmt = $pdo->prepare(
                'SELECT cm.id, cm.id_envio, cm.mensagem, cm.data_envio, u.apelido, u.foto_perfil
                 FROM conversa_mensagem cm
                 INNER JOIN usuarios u ON u.id = cm.id_envio
                 WHERE cm.id = :mensagem AND cm.id_conversa = :conversa'
            );
            $stmt->execute([':mensagem' => $idMensagem, ':conversa' => $idConversa]);
            $mensagemSalva = $stmt->fetch(PDO::FETCH_ASSOC);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store, private');
            echo json_encode([
                'mensagem' => [
                    'id' => (int) $mensagemSalva['id'],
                    'senderId' => (int) $mensagemSalva['id_envio'],
                    'author' => $mensagemSalva['apelido'],
                    'message' => $mensagemSalva['mensagem'],
                    'time' => date('H:i', strtotime($mensagemSalva['data_envio'])),
                    'datetime' => date(DATE_ATOM, strtotime($mensagemSalva['data_envio'])),
                    'avatarUrl' => $mensagemSalva['foto_perfil']
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
            exit;
        }
        header('Location: dm.php?amigo=' . $amigoAtivoId);
        exit;
    }
}

if (
    $_SERVER['REQUEST_METHOD'] === 'POST'
    && strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'xmlhttprequest'
    && $erroMensagem !== ''
) {
    http_response_code(422);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode(['erro' => $erroMensagem], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$consultaMensagens = 'SELECT cm.id, cm.id_envio, cm.mensagem, cm.data_envio, u.apelido, u.foto_perfil
     FROM conversa_mensagem cm
     INNER JOIN usuarios u ON u.id = cm.id_envio
     WHERE cm.id_conversa = :conversa';
$parametrosMensagens = [':conversa' => $idConversa];
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'mensagens') {
    $aposMensagem = filter_input(INPUT_GET, 'after', FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    if ($aposMensagem === false) {
        http_response_code(400);
        exit('Identificador de mensagem inválido.');
    }
    if ($aposMensagem !== null) {
        $consultaMensagens .= ' AND cm.id > :apos_mensagem';
        $parametrosMensagens[':apos_mensagem'] = $aposMensagem;
    }
}
$consultaMensagens .= ' ORDER BY cm.data_envio, cm.id';
$stmt = $pdo->prepare($consultaMensagens);
$stmt->execute($parametrosMensagens);
$mensagens = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'mensagens') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode([
        'mensagens' => array_map(static function (array $mensagem): array {
            return [
                'id' => (int) $mensagem['id'],
                'senderId' => (int) $mensagem['id_envio'],
                'author' => $mensagem['apelido'],
                'message' => $mensagem['mensagem'],
                'time' => date('H:i', strtotime($mensagem['data_envio'])),
                'datetime' => date(DATE_ATOM, strtotime($mensagem['data_envio'])),
                'avatarUrl' => $mensagem['foto_perfil']
            ];
        }, $mensagens)
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$nomeAmigoSeguro = htmlspecialchars($amigoAtivo['apelido'], ENT_QUOTES, 'UTF-8');
?>
 
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $nomeAmigoSeguro ?> - Mensagens Diretas - Mock Discord</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="../style/dm.css">
    <link rel="stylesheet" href="../style/configuracoes-popup.css">
    <link rel="stylesheet" href="../style/modal-servidor.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body>

<div class="layout-aplicativo" data-amigo-id="<?= (int) $amigoAtivoId ?>" data-usuario-id="<?= $idUsuarioAtual ?>">
    <!-- 1. Barra Lateral de Servidores -->
    <?php
    include __DIR__ . '/includes/sidebarServidores.php';
    ?>
 
    <!-- 2. Sidebar de Conversas Diretas -->
    <aside class="barra-dms" aria-label="Lista de conversas privadas">
        <header class="cabecalho-dms">
            <input type="search" id="busca-dm" placeholder="Encontre ou comece uma conversa" aria-label="Encontre ou comece uma conversa">
        </header>
 
        <div class="lista-dms-container">
            <?php include __DIR__ . '/includes/listaDMs.php'; ?>
        </div>
 
        <!-- Painel Inferior do Usuário -->
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
                    <?php if (!empty($amigoAtivo['foto_perfil'])): ?>
                        <img src="<?= htmlspecialchars($amigoAtivo['foto_perfil'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                    <?php endif; ?>
                    <span class="ponto-status online" id="status-amigo-ativo"></span>
                </div>
                <h1 id="nome-amigo-ativo"><?= $nomeAmigoSeguro ?></h1>
            </div>
 
            <div class="ferramentas-chat">
                <button type="button" class="btn-ferramenta" id="btn-iniciar-chamada" title="Iniciar chamada de voz" aria-label="Iniciar chamada de voz">
                    <i class="bi bi-telephone-fill"></i>
                </button>
 
                <!-- Campo de busca completo no Desktop -->
                <div class="caixa-busca-chat desktop-only">
                    <input type="search" id="input-busca-mensagens" placeholder="Buscar <?= $nomeAmigoSeguro ?>" aria-label="Buscar na conversa">
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
        <section class="banner-chamada" id="banner-chamada" hidden aria-live="polite">
            <div class="chamada-info">
                <span class="avatar-chamada" aria-hidden="true">
                    <?php if (!empty($amigoAtivo['foto_perfil'])): ?>
                        <img src="<?= htmlspecialchars($amigoAtivo['foto_perfil'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                    <?php endif; ?>
                </span>
                <span class="indicador-voz"></span>
                <strong id="texto-chamada">Chamada de voz</strong>
            </div>
            <div class="acoes-chamada">
                <button type="button" class="btn-aceitar-chamada" id="btn-aceitar-chamada" hidden>
                    <i class="bi bi-telephone-fill"></i> Atender
                </button>
                <button type="button" class="btn-recusar-chamada" id="btn-recusar-chamada" hidden>
                    <i class="bi bi-telephone-x-fill"></i> Recusar
                </button>
                <button type="button" class="btn-encerrar-chamada" id="btn-encerrar-chamada">
                    <i class="bi bi-telephone-x-fill"></i> Desconectar
                </button>
            </div>
        </section>
        <audio id="audio-chamada" autoplay></audio>
        <p id="erro-chamada" class="mensagem-erro" role="alert" aria-live="assertive"></p>

        <!-- Feed de Mensagens -->
        <section class="container-mensagens" id="container-mensagens" aria-live="polite">
            <div class="lista-mensagens-dm" id="lista-mensagens-dm">
                <?php foreach ($mensagens as $mensagem): ?>
                    <article class="item-mensagem" data-mensagem-id="<?= (int) $mensagem['id'] ?>">
                        <div class="avatar-mensagem" aria-hidden="true">
                            <?php if (!empty($mensagem['foto_perfil'])): ?>
                                <img src="<?= htmlspecialchars($mensagem['foto_perfil'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                            <?php endif; ?>
                        </div>
                        <div class="conteudo-mensagem">
                            <div class="meta-mensagem">
                                <strong class="autor-mensagem"><?= htmlspecialchars($mensagem['apelido'], ENT_QUOTES, 'UTF-8') ?></strong>
                                <time class="hora-mensagem" datetime="<?= htmlspecialchars(date(DATE_ATOM, strtotime($mensagem['data_envio'])), ENT_QUOTES, 'UTF-8') ?>">
                                    <?= htmlspecialchars(date('H:i', strtotime($mensagem['data_envio'])), ENT_QUOTES, 'UTF-8') ?>
                                </time>
                            </div>
                            <p class="texto-mensagem"><?= htmlspecialchars($mensagem['mensagem'], ENT_QUOTES, 'UTF-8') ?></p>
                        </div>
                    </article>
                <?php endforeach; ?>
                <?php if (!$mensagens): ?>
                    <p class="conversa-vazia" id="conversa-vazia">Esta conversa ainda não tem mensagens. Envie uma para começar.</p>
                <?php endif; ?>
            </div>
        </section>
 
        <!-- Rodapé com Input de Mensagem -->
        <footer class="rodape-chat">
            <form id="form-mensagem-dm" class="form-mensagem-dm" method="POST" action="dm.php?amigo=<?= (int) $amigoAtivoId ?>" novalidate>
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">
                <button type="button" class="btn-anexar" title="Enviar arquivo" aria-label="Anexar arquivo">
                    <i class="bi bi-plus-circle-fill"></i>
                </button>
                <input
                    type="text"
                    id="input-mensagem-dm"
                    name="mensagem"
                    placeholder="Conversar em @<?= $nomeAmigoSeguro ?>"
                    aria-label="Mensagem privada"
                    maxlength="250"
                    autocomplete="off"
                    required
                >
                <button type="submit" class="btn-enviar" title="Enviar mensagem" aria-label="Enviar mensagem">
                    <i class="bi bi-send-fill"></i>
                </button>
            </form>
            <span id="erro-mensagem-dm" class="mensagem-erro" role="alert"><?= htmlspecialchars($erroMensagem, ENT_QUOTES, 'UTF-8') ?></span>
            <p class="rodape-academico">
                Clone simplificado do Discord para trabalho acadêmico (IFC Campus Concórdia). Dados fictícios.
            </p>
        </footer>
    </main>
</div>
 
<script src="../js/sessao.js"></script>
<script src="/socket.io/socket.io.js" onerror="console.error('Servidor de chamadas indisponível.')"></script>
<script src="../js/dm.js"></script>
<script src="../js/configuracoes-popup.js"></script>
<script src="../js/permissoes-servidor.js"></script>
<script src="../js/criar-servidor.js"></script>
</body>
</html>