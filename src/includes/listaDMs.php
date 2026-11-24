<?php
$stmt = $pdo->prepare(
    'SELECT u.id, u.apelido, u.foto_perfil
     FROM amizades a
     INNER JOIN usuarios u
         ON u.id = IF(a.id_usuario_1 = :usuario_if, a.id_usuario_2, a.id_usuario_1)
     WHERE a.id_usuario_1 = :usuario_1 OR a.id_usuario_2 = :usuario_2
     ORDER BY u.apelido, u.id'
);
$stmt->execute([
    ':usuario_if' => $idUsuarioAtual,
    ':usuario_1' => $idUsuarioAtual,
    ':usuario_2' => $idUsuarioAtual
]);
$amigosDM = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<ul class="lista-dms" id="lista-dms">
    <?php foreach ($amigosDM as $amigoDM): ?>
        <?php $idAmigoDM = (int) $amigoDM['id']; ?>
        <li>
            <a
                href="dm.php?amigo=<?= $idAmigoDM ?>"
                class="item-dm<?= $idAmigoDM === ($amigoAtivoId ?? 0) ? ' ativo' : '' ?>"
                data-amigo="<?= $idAmigoDM ?>"
                <?= $idAmigoDM === ($amigoAtivoId ?? 0) ? 'aria-current="page"' : '' ?>
            >
                <div class="avatar-dm">
                    <?php if (!empty($amigoDM['foto_perfil'])): ?>
                        <img src="<?= htmlspecialchars($amigoDM['foto_perfil'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                    <?php endif; ?>
                    <span class="ponto-status online"></span>
                </div>
                <span class="nome-dm"><?= htmlspecialchars($amigoDM['apelido'], ENT_QUOTES, 'UTF-8') ?></span>
            </a>
        </li>
    <?php endforeach; ?>
    <?php if (!$amigosDM): ?>
        <li class="lista-dms-vazia">Adicione amigos para começar uma conversa.</li>
    <?php endif; ?>
</ul>
