<?php
$user = $_SESSION['usuario_id'];

$sql = "select id_servidor from servidores_usuario where id_usuario = :user";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ":user" => $user
]);

$servidores_liberados = $stmt->fetchAll();
?>
<nav class="barra-servidores" aria-label="Lista de servidores">
    <a href="inicio.php" class="icone-servidor icone-inicio ativo" title="Página Inicial / Amigos">
        <i class="bi bi-discord"></i>
    </a>
    <div class="divisoria-servidores"></div>
    <?php
    foreach($servidores_liberados as $servidores_liberados):
                    $sql2 = "select * from servidores where id = :id";
                    $stmt= $pdo->prepare($sql2);
                    $stmt->execute([
                        ":id"=> $servidores_liberados['id_servidor']
                    ]);
                    $servidores = $stmt->fetch(PDO::FETCH_ASSOC); 
    ?>
    <a href="servidor.php?servidor=<?= htmlspecialchars($servidores['id']) ?>" class="icone-servidor" title="<?= htmlspecialchars($servidores['nome']) ?>">
        <span class="icone-reserva"><i class="bi bi-people-fill"></i></span>
    </a>
    <?php endforeach; ?>
    <button type="button" class="icone-servidor adicionar-servidor" id="btn-novo-servidor" title="Adicionar um servidor">
        <i class="bi bi-plus-lg"></i>
    </button>
</nav>
<?php
include __DIR__ . '/modalCriarServidor.php';
?>