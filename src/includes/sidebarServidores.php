<?php
$servidorSelecionado = basename($_SERVER['SCRIPT_NAME']) === 'servidor.php'
    ? filter_input(INPUT_GET, 'servidor', FILTER_VALIDATE_INT)
    : null;
$paginaInicialAtiva = basename($_SERVER['SCRIPT_NAME']) === 'inicio.php';

$stmt = $pdo->prepare(
    'SELECT s.id, s.nome, s.icone
     FROM servidores s
     INNER JOIN servidores_usuario su ON su.id_servidor = s.id
     WHERE su.id_usuario = :usuario
     ORDER BY su.data_cadastro, s.id'
);
$stmt->execute([':usuario' => $_SESSION['usuario_id']]);
$servidoresDoUsuario = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<nav class="barra-servidores" aria-label="Lista de servidores">
    <a href="inicio.php" class="icone-servidor icone-inicio<?= $paginaInicialAtiva ? ' ativo' : '' ?>" title="Página Inicial / Amigos">
        <i class="bi bi-discord"></i>
    </a>
    <div class="divisoria-servidores"></div>
    <?php foreach ($servidoresDoUsuario as $servidor): ?>
        <?php
        $idServidor = (int) $servidor['id'];
        $nomeServidor = htmlspecialchars($servidor['nome'], ENT_QUOTES, 'UTF-8');
        $iconeServidor = trim((string) $servidor['icone']);
        ?>
        <a
            href="servidor.php?servidor=<?= $idServidor ?>"
            class="icone-servidor<?= $servidorSelecionado === $idServidor ? ' ativo' : '' ?>"
            title="<?= $nomeServidor ?>"
            aria-label="<?= $nomeServidor ?>"
            <?= $servidorSelecionado === $idServidor ? 'aria-current="page"' : '' ?>
        >
            <?php if ($iconeServidor !== ''): ?>
                <img src="<?= htmlspecialchars($iconeServidor, ENT_QUOTES, 'UTF-8') ?>" alt="">
            <?php else: ?>
                <i class="bi bi-people-fill" aria-hidden="true"></i>
            <?php endif; ?>
        </a>
    <?php endforeach; ?>
    <button type="button" class="icone-servidor adicionar-servidor" id="btn-novo-servidor" title="Adicionar um servidor">
        <i class="bi bi-plus-lg"></i>
    </button>
</nav>
<?php
include __DIR__ . '/modalCriarServidor.php';
?>