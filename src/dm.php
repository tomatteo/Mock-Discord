<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
verificarLogin();
 
$idUsuario = (int) $_SESSION['usuario_id'];
 
// O listaDMs.php envia o id da conversa no parâmetro "amigo".
$idConversa = filter_input(INPUT_GET, 'amigo', FILTER_VALIDATE_INT);
if (!$idConversa) {
    header('Location: inicio.php');
    exit;
}
 
// Garante que a conversa existe e que o usuário logado participa dela.
$stmt = $pdo->prepare(
    'SELECT c.id, u.id AS id_amigo, u.apelido
     FROM conversas c
     INNER JOIN usuarios u
        ON u.id = IF(c.id_usuario_1 = :usuario_a, c.id_usuario_2, c.id_usuario_1)
     WHERE c.id = :conversa
       AND (c.id_usuario_1 = :usuario_b OR c.id_usuario_2 = :usuario_c)'
);
$stmt->execute([
    ':usuario_a' => $idUsuario,
    ':usuario_b' => $idUsuario,
    ':usuario_c' => $idUsuario,
    ':conversa'  => $idConversa
]);
$conversaAtual = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$conversaAtual) {
    header('Location: inicio.php');
    exit;
}
 
$nomeAmigo = $conversaAtual['apelido'];
$erroMensagem = '';
 
// Envio de mensagem (POST) -> grava e redireciona (evita reenvio ao atualizar).
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $textoMensagem = trim((string) ($_POST['mensagem'] ?? ''));
 
    if ($textoMensagem === '') {
        $erroMensagem = 'Digite uma mensagem antes de enviar.';
    } elseif (mb_strlen($textoMensagem, 'UTF-8') > 250) {
        $erroMensagem = 'A mensagem pode ter no máximo 250 caracteres.';
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO conversa_mensagem (id_conversa, id_envio, mensagem)
             VALUES (:conversa, :usuario, :mensagem)'
        );
        $stmt->execute([
            ':conversa' => $idConversa,
            ':usuario'  => $idUsuario,
            ':mensagem' => $textoMensagem
        ]);
        header('Location: dm.php?amigo=' . $idConversa);
        exit;
    }
}
 
// Histórico da conversa, do mais antigo para o mais recente.
$stmt = $pdo->prepare(
    'SELECT m.id, m.id_envio, m.mensagem, m.data_envio, u.apelido
     FROM conversa_mensagem m
     INNER JOIN usuarios u ON u.id = m.id_envio
     WHERE m.id_conversa = :conversa
     ORDER BY m.data_envio ASC, m.id ASC'
);
$stmt->execute([':conversa' => $idConversa]);
$mensagens = $stmt->fetchAll(PDO::FETCH_ASSOC);
 
function e(string $valor): string
{
    return htmlspecialchars($valor, ENT_QUOTES, 'UTF-8');
}
?>
 
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($nomeAmigo) ?> - Mensagens Diretas - Mock Discord</title>
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
    include __DIR__ . '/includes/sidebarServidores.php';
    ?>
 
    <!-- 2. Sidebar de Conversas Diretas -->
    <aside class="barra-dms" aria-label="Lista de conversas privadas">
        <header class="cabecalho-dms">
            <input type="search" id="busca-dm" placeholder="Encontre ou comece uma conversa" aria-label="Encontre ou comece uma conversa">
        </header>
 
        <div class="lista-dms-container">
            <?php
            include __DIR__ . '/includes/listaDMs.php';
            ?>
        </div>
 
        <!-- Painel Inferior do Usuário -->
        <div class="painel-usuario">
            <div class="info-usuario">
                <div class="avatar-usuario">
                    <span class="ponto-status online"></span>
                </div>
                <div class="detalhes-usuario">
                    <strong data-nome-usuario><?= e($_SESSION['usuario_apelido'] ?? 'Você') ?></strong>
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
                <h1 id="nome-amigo-ativo"><?= e($nomeAmigo) ?></h1>
            </div>
 
            <div class="ferramentas-chat">
                <button type="button" class="btn-ferramenta" id="btn-iniciar-chamada" title="Iniciar chamada de voz" aria-label="Iniciar chamada de voz">
                    <i class="bi bi-telephone-fill"></i>
                </button>
 
                <!-- Campo de busca completo no Desktop -->
                <div class="caixa-busca-chat desktop-only">
                    <input type="search" id="input-busca-mensagens" placeholder="Buscar <?= e($nomeAmigo) ?>" aria-label="Buscar na conversa">
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
                <strong id="texto-chamada">Em chamada de voz com <?= e($nomeAmigo) ?></strong>
            </div>
            <button type="button" class="btn-encerrar-chamada" id="btn-encerrar-chamada">
                <i class="bi bi-telephone-x-fill"></i> Desconectar
            </button>
        </section>
 
        <!-- Feed de Mensagens -->
        <section class="container-mensagens" id="container-mensagens" aria-live="polite">
            <div class="lista-mensagens-dm" id="lista-mensagens-dm">
                <?php if (!$mensagens): ?>
                    <div class="estado-vazio" id="estado-vazio">
                        <i class="bi bi-chat-dots" aria-hidden="true"></i>
                        <h3>Esta conversa ainda está vazia</h3>
                        <p>Envie a primeira mensagem para <?= e($nomeAmigo) ?>.</p>
                    </div>
                <?php endif; ?>
 
                <?php foreach ($mensagens as $mensagem): ?>
                    <?php $ehMinha = (int) $mensagem['id_envio'] === $idUsuario; ?>
                    <article class="item-mensagem<?= $ehMinha ? ' minha-mensagem' : '' ?>" data-mensagem-id="<?= (int) $mensagem['id'] ?>">
                        <div class="avatar-mensagem" aria-hidden="true">
                            <?= e(mb_strtoupper(mb_substr($mensagem['apelido'], 0, 1, 'UTF-8'), 'UTF-8')) ?>
                        </div>
                        <div class="conteudo-mensagem">
                            <header class="cabecalho-mensagem">
                                <strong class="autor-mensagem"><?= e($mensagem['apelido']) ?></strong>
                                <time class="horario-mensagem" datetime="<?= e(date('c', strtotime($mensagem['data_envio']))) ?>">
                                    <?= e(date('d/m/Y H:i', strtotime($mensagem['data_envio']))) ?>
                                </time>
                            </header>
                            <p class="texto-mensagem"><?= e($mensagem['mensagem']) ?></p>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>
        </section>
 
        <!-- Rodapé com Input de Mensagem -->
        <footer class="rodape-chat">
            <form id="form-mensagem-dm" class="form-mensagem-dm" method="post" action="dm.php?amigo=<?= (int) $idConversa ?>" novalidate>
                <button type="button" class="btn-anexar" title="Enviar arquivo" aria-label="Anexar arquivo">
                    <i class="bi bi-plus-circle-fill"></i>
                </button>
                <input
                    type="text"
                    id="input-mensagem-dm"
                    name="mensagem"
                    placeholder="Conversar em @<?= e($nomeAmigo) ?>"
                    aria-label="Mensagem privada"
                    maxlength="250"
                    autocomplete="off"
                    required
                >
                <button type="submit" class="btn-enviar" title="Enviar mensagem" aria-label="Enviar mensagem">
                    <i class="bi bi-send-fill"></i>
                </button>
            </form>
            <span id="erro-mensagem-dm" class="mensagem-erro" role="alert"><?= e($erroMensagem) ?></span>
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