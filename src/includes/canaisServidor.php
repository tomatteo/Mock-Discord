<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

header('Content-Type: application/json; charset=utf-8');

function responderJson(int $status, array $dados): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(405, ['erro' => 'Método não permitido.']);
}

try {
    $entrada = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    responderJson(400, ['erro' => 'Requisição inválida.']);
}
if (!is_array($entrada)) {
    responderJson(400, ['erro' => 'Requisição inválida.']);
}

$idServidor = filter_var($entrada['servidor'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$nome = trim($entrada['nome'] ?? '');
if ($idServidor === false || $nome === '' || mb_strlen($nome) > 50) {
    responderJson(422, ['erro' => 'Informe um nome de canal com até 50 caracteres.']);
}

try {
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM servidores_usuario
         WHERE id_servidor = :servidor AND id_usuario = :usuario'
    );
    $stmt->execute([
        ':servidor' => $idServidor,
        ':usuario' => $_SESSION['usuario_id']
    ]);
    if (!$stmt->fetchColumn()) {
        responderJson(404, ['erro' => 'Servidor não encontrado.']);
    }

    $stmt = $pdo->prepare(
        "SELECT 1
         FROM canais
         WHERE id_servidor = :servidor AND tipo = 'texto' AND LOWER(nome) = LOWER(:nome)
         LIMIT 1"
    );
    $stmt->execute([
        ':servidor' => $idServidor,
        ':nome' => $nome
    ]);
    if ($stmt->fetchColumn()) {
        responderJson(409, ['erro' => 'Já existe um canal de texto com esse nome.']);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO canais (id_servidor, nome, tipo)
         VALUES (:servidor, :nome, 'texto')"
    );
    $stmt->execute([
        ':servidor' => $idServidor,
        ':nome' => $nome
    ]);

    responderJson(201, [
        'canal' => [
            'id' => (int) $pdo->lastInsertId(),
            'nome' => $nome
        ]
    ]);
} catch (Throwable $erro) {
    error_log($erro->getMessage());
    responderJson(500, ['erro' => 'Não foi possível criar o canal.']);
}
