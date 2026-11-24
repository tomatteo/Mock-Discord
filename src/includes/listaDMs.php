<?php
$user = $_SESSION['usuario_id'];

$sql = "select distinct c.id, u.apelido from conversas c left join usuarios u on u.id = c.id_usuario_1 or u.id = c.id_usuario_2 where (c.id_usuario_1 = :user or c.id_usuario_2 = :user) and u.id <> :user";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':user'=>$user
]);

$conversasUser = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<ul class="lista-dms" id="lista-dms">
    <?php foreach($conversasUser as $conversas): ?>
        <li>
            <a href="dm.php?amigo=<?= (INT) $conversas['id'] ?>" class="item-dm" data-amigo="amigo1">
                <div class="avatar-dm"><span class="ponto-status online"></span></div>
                <span class="nome-dm"><?= $conversas['apelido'] ?></span>
            </a>
        </li>
    <?php endforeach; ?>
</ul>
