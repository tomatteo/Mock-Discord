<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

$usuarioAtual = (int) $_SESSION['usuario_id'];
$stmt = $pdo->prepare(
    'SELECT u.id, u.apelido,
            COALESCE((
                SELECT MAX(cm.id)
                FROM conversas c
                INNER JOIN conversa_mensagem cm ON cm.id_conversa = c.id
                WHERE c.id_usuario_1 = LEAST(:usuario_1, u.id)
                  AND c.id_usuario_2 = GREATEST(:usuario_2, u.id)
                  AND cm.id_envio = u.id
            ), 0) AS ultima_mensagem
     FROM amizades a
     INNER JOIN usuarios u
         ON u.id = IF(a.id_usuario_1 = :usuario_if, a.id_usuario_2, a.id_usuario_1)
     WHERE a.id_usuario_1 = :usuario_where_1 OR a.id_usuario_2 = :usuario_where_2
     ORDER BY u.apelido, u.id'
);
$stmt->execute([
    ':usuario_1' => $usuarioAtual,
    ':usuario_2' => $usuarioAtual,
    ':usuario_if' => $usuarioAtual,
    ':usuario_where_1' => $usuarioAtual,
    ':usuario_where_2' => $usuarioAtual
]);

echo json_encode([
    'usuarioId' => $usuarioAtual,
    'amigos' => array_map(
        static fn (array $amigo): array => [
            'id' => (int) $amigo['id'],
            'apelido' => $amigo['apelido'],
            'ultimaMensagem' => (int) $amigo['ultima_mensagem']
        ],
        $stmt->fetchAll(PDO::FETCH_ASSOC)
    )
], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
