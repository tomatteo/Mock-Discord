<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT s.id, s.nome, s.icone
     FROM servidores s
     INNER JOIN servidores_usuario su ON su.id_servidor = s.id
     WHERE su.id_usuario = :usuario
     ORDER BY su.data_cadastro, s.id'
);
$stmt->execute([':usuario' => (int) $_SESSION['usuario_id']]);
echo json_encode(
    ['servidores' => $stmt->fetchAll(PDO::FETCH_ASSOC)],
    JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
);
