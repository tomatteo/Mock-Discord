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

echo json_encode([
    'usuarioId' => $usuarioId,
    'apelido' => $_SESSION['usuario_apelido'] ?? ''
], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
