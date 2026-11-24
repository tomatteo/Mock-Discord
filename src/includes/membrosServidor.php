<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

function responderMembros(int $status, array $dados): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function lerEntradaMembros(): array
{
    try {
        $entrada = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        responderMembros(400, ['erro' => 'Requisição inválida.']);
    }

    if (!is_array($entrada)) {
        responderMembros(400, ['erro' => 'Requisição inválida.']);
    }

    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!isset($_SESSION['csrf_token']) || !is_string($token) || !hash_equals($_SESSION['csrf_token'], $token)) {
        responderMembros(403, ['erro' => 'Sua sessão expirou. Atualize a página e tente novamente.']);
    }
    return $entrada;
}

$usuarioAtual = (int) $_SESSION['usuario_id'];
$idServidor = filter_input(INPUT_GET, 'servidor', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($idServidor === false || $idServidor === null) {
    responderMembros(422, ['erro' => 'Servidor inválido.']);
}

try {
    $stmt = $pdo->prepare(
        'SELECT 1 FROM servidores_usuario WHERE id_servidor = :servidor AND id_usuario = :usuario'
    );
    $stmt->execute([':servidor' => $idServidor, ':usuario' => $usuarioAtual]);
    if (!$stmt->fetchColumn()) {
        responderMembros(404, ['erro' => 'Servidor não encontrado.']);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare(
            'SELECT u.id, u.apelido,
                    EXISTS(
                        SELECT 1 FROM servidores_usuario su
                        WHERE su.id_servidor = :servidor_existe AND su.id_usuario = u.id
                    ) AS membro
             FROM amizades a
             INNER JOIN usuarios u
                 ON u.id = IF(a.id_usuario_1 = :usuario_if, a.id_usuario_2, a.id_usuario_1)
             WHERE a.id_usuario_1 = :usuario_1 OR a.id_usuario_2 = :usuario_2
             ORDER BY u.apelido, u.id'
        );
        $stmt->execute([
            ':servidor_existe' => $idServidor,
            ':usuario_if' => $usuarioAtual,
            ':usuario_1' => $usuarioAtual,
            ':usuario_2' => $usuarioAtual
        ]);
        $amigos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare(
            'SELECT u.id, u.apelido
             FROM servidores_usuario su
             INNER JOIN usuarios u ON u.id = su.id_usuario
             WHERE su.id_servidor = :servidor
             ORDER BY u.apelido, u.id'
        );
        $stmt->execute([':servidor' => $idServidor]);
        responderMembros(200, [
            'amigos' => $amigos,
            'membros' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: GET, POST');
        responderMembros(405, ['erro' => 'Método não permitido.']);
    }

    $entrada = lerEntradaMembros();
    $amigoId = filter_var($entrada['usuarioId'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($amigoId === false || $amigoId === null || $amigoId === $usuarioAtual) {
        responderMembros(422, ['erro' => 'Amigo inválido.']);
    }

    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        'SELECT id FROM servidores WHERE id = :servidor FOR UPDATE'
    );
    $stmt->execute([':servidor' => $idServidor]);
    if (!$stmt->fetchColumn()) {
        $pdo->rollBack();
        responderMembros(404, ['erro' => 'Servidor não encontrado.']);
    }

    $stmt = $pdo->prepare(
        'SELECT 1 FROM amizades
         WHERE id_usuario_1 = LEAST(:atual_min, :amigo_min)
           AND id_usuario_2 = GREATEST(:atual_max, :amigo_max)'
    );
    $stmt->execute([
        ':atual_min' => $usuarioAtual,
        ':amigo_min' => $amigoId,
        ':atual_max' => $usuarioAtual,
        ':amigo_max' => $amigoId
    ]);
    if (!$stmt->fetchColumn()) {
        $pdo->rollBack();
        responderMembros(403, ['erro' => 'Só é possível adicionar pessoas da sua lista de amigos.']);
    }

    $stmt = $pdo->prepare(
        'SELECT 1 FROM servidores_usuario WHERE id_servidor = :servidor AND id_usuario = :amigo'
    );
    $stmt->execute([':servidor' => $idServidor, ':amigo' => $amigoId]);
    if ($stmt->fetchColumn()) {
        $pdo->rollBack();
        responderMembros(409, ['erro' => 'Esse amigo já faz parte do servidor.']);
    }

    $stmt = $pdo->prepare(
        'SELECT 1 FROM servidor_banimentos
         WHERE id_servidor = :servidor AND id_usuario = :amigo
           AND (data_limite IS NULL OR data_limite > NOW())'
    );
    $stmt->execute([':servidor' => $idServidor, ':amigo' => $amigoId]);
    if ($stmt->fetchColumn()) {
        $pdo->rollBack();
        responderMembros(403, ['erro' => 'Esse usuário não pode entrar neste servidor.']);
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM servidor_cargos
         WHERE id_servidor = :servidor AND membro = TRUE AND adm = FALSE AND moderador = FALSE
         ORDER BY id LIMIT 1'
    );
    $stmt->execute([':servidor' => $idServidor]);
    $idCargo = $stmt->fetchColumn();
    if (!$idCargo) {
        $stmt = $pdo->prepare(
            'INSERT INTO servidor_cargos (nome, id_servidor, adm, moderador, membro)
             VALUES (:nome, :servidor, FALSE, FALSE, TRUE)'
        );
        $stmt->execute([':nome' => 'MEMBRO', ':servidor' => $idServidor]);
        $idCargo = $pdo->lastInsertId();
    }

    $stmt = $pdo->prepare(
        'INSERT INTO servidores_usuario (id_cargo, id_servidor, id_usuario)
         VALUES (:cargo, :servidor, :usuario)'
    );
    $stmt->execute([':cargo' => $idCargo, ':servidor' => $idServidor, ':usuario' => $amigoId]);
    $pdo->commit();

    responderMembros(201, [
        'mensagem' => 'Amigo adicionado ao servidor.',
        'servidorId' => $idServidor,
        'notificarUsuarioId' => $amigoId
    ]);
} catch (Throwable $erro) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Falha ao atualizar membros do servidor: ' . $erro->getMessage());
    responderMembros(500, ['erro' => 'Não foi possível atualizar os membros. Tente novamente.']);
}
