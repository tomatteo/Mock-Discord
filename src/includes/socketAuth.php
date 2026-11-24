<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    exit;
}

$usuarioId = (int) $_SESSION['usuario_id'];
$idServidor = filter_input(INPUT_GET, 'servidor', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$idUsuario = filter_input(INPUT_GET, 'usuario', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$idAmizade = filter_input(INPUT_GET, 'amizade', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$incluirAmizades = filter_input(INPUT_GET, 'amizades', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === 1;
$incluirServidores = filter_input(INPUT_GET, 'servidores', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === 1;

if ($idServidor !== null) {
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM servidores_usuario
         WHERE id_servidor = :servidor AND id_usuario = :usuario'
    );
    $stmt->execute([':servidor' => $idServidor, ':usuario' => $usuarioId]);
    if (!$stmt->fetchColumn()) {
        http_response_code(403);
        exit;
    }
}

if ($idUsuario !== null) {
    $stmt = $pdo->prepare(
        "SELECT 1
         FROM amizades
        WHERE id_usuario_1 = LEAST(:atual_min, :alvo_min)
          AND id_usuario_2 = GREATEST(:atual_max, :alvo_max)
         UNION
         SELECT 1
         FROM solicitacao_amizade
         WHERE (
              (id_usuario_solicitante = :atual_solicitante AND id_usuario_solicitado = :alvo_solicitado)
              OR (id_usuario_solicitante = :alvo_solicitante AND id_usuario_solicitado = :atual_solicitado)
           )
         LIMIT 1"
    );
    $stmt->execute([
        ':atual_min' => $usuarioId,
        ':alvo_min' => $idUsuario,
        ':atual_max' => $usuarioId,
        ':alvo_max' => $idUsuario,
        ':atual_solicitante' => $usuarioId,
        ':alvo_solicitado' => $idUsuario,
        ':alvo_solicitante' => $idUsuario,
        ':atual_solicitado' => $usuarioId
    ]);
    if (!$stmt->fetchColumn()) {
        http_response_code(403);
        exit;
    }
}

if ($idAmizade !== null) {
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM amizades
         WHERE id_usuario_1 = LEAST(:atual_1, :alvo_1)
           AND id_usuario_2 = GREATEST(:atual_2, :alvo_2)'
    );
    $stmt->execute([
        ':atual_1' => $usuarioId,
        ':alvo_1' => $idAmizade,
        ':atual_2' => $usuarioId,
        ':alvo_2' => $idAmizade
    ]);
    if (!$stmt->fetchColumn()) {
        http_response_code(403);
        exit;
    }
}

$stmt = $pdo->prepare('SELECT apelido, foto_perfil FROM usuarios WHERE id = :usuario');
$stmt->execute([':usuario' => $usuarioId]);
$perfil = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$perfil) {
    http_response_code(401);
    exit;
}

$dadosUsuario = [
    'usuarioId' => $usuarioId,
    'apelido' => $perfil['apelido'],
    'fotoPerfil' => $perfil['foto_perfil']
];

if ($incluirAmizades) {
    $stmt = $pdo->prepare(
        'SELECT IF(a.id_usuario_1 = :usuario_if, a.id_usuario_2, a.id_usuario_1)
         FROM amizades a
         WHERE a.id_usuario_1 = :usuario_1 OR a.id_usuario_2 = :usuario_2'
    );
    $stmt->execute([
        ':usuario_if' => $usuarioId,
        ':usuario_1' => $usuarioId,
        ':usuario_2' => $usuarioId
    ]);
    $dadosUsuario['amigosIds'] = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

if ($incluirServidores) {
    $stmt = $pdo->prepare(
        'SELECT id_servidor
         FROM servidores_usuario
         WHERE id_usuario = :usuario'
    );
    $stmt->execute([':usuario' => $usuarioId]);
    $dadosUsuario['servidoresIds'] = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

echo json_encode($dadosUsuario, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
