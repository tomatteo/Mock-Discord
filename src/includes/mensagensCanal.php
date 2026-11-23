<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

function responderJson(int $status, array $dados): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo === 'GET') {
    $entrada = $_GET;
} elseif ($metodo === 'POST') {
    try {
        $entrada = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        responderJson(400, ['erro' => 'Requisição inválida.']);
    }
} else {
    responderJson(405, ['erro' => 'Método não permitido.']);
}
if (!is_array($entrada)) {
    responderJson(400, ['erro' => 'Requisição inválida.']);
}

$idServidor = filter_var($entrada['servidor'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$idCanal = filter_var($entrada['canal'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($idServidor === false || $idCanal === false) {
    responderJson(422, ['erro' => 'Servidor ou canal inválido.']);
}

try {
    // confere o vinculo do usuario antes de permitir acesso as mensagens do canal.
    $stmt = $pdo->prepare(
        "SELECT c.id
         FROM canais c
         INNER JOIN servidores_usuario su ON su.id_servidor = c.id_servidor
         WHERE c.id = :canal
           AND c.id_servidor = :servidor
           AND c.tipo = 'texto'
           AND su.id_usuario = :usuario"
    );
    $stmt->execute([
        ':canal' => $idCanal,
        ':servidor' => $idServidor,
        ':usuario' => $_SESSION['usuario_id']
    ]);
    if (!$stmt->fetchColumn()) {
        responderJson(404, ['erro' => 'Canal não encontrado.']);
    }

    if ($metodo === 'GET') {
        // O parâmetro "depois" permite buscar somente mensagens ainda não exibidas.
        $consulta = 'SELECT cm.id, cm.mensagem, cm.data_envio, u.apelido
                     FROM canal_mensagens cm
                     INNER JOIN usuarios u ON u.id = cm.id_usuario
                     WHERE cm.id_canal = :canal';
        $parametros = [':canal' => $idCanal];

        if (array_key_exists('depois', $_GET)) {
            $ultimoId = filter_var($_GET['depois'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            if ($ultimoId === false) {
                responderJson(422, ['erro' => 'Identificador de mensagem inválido.']);
            }
            $consulta .= ' AND cm.id > :ultimo_id';
            $parametros[':ultimo_id'] = $ultimoId;
        }

        $consulta .= ' ORDER BY cm.data_envio, cm.id';
        $stmt = $pdo->prepare($consulta);
        $stmt->execute($parametros);
        $mensagens = array_map(
            static fn(array $mensagem): array => [
                'id' => (int) $mensagem['id'],
                'usuario' => $mensagem['apelido'],
                'texto' => $mensagem['mensagem'],
                'enviadoEm' => $mensagem['data_envio']
            ],
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
        responderJson(200, ['mensagens' => $mensagens]);
    }

    $texto = trim($entrada['mensagem'] ?? '');
    if ($texto === '' || mb_strlen($texto) > 250) {
        responderJson(422, ['erro' => 'A mensagem deve ter entre 1 e 250 caracteres.']);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO canal_mensagens (id_canal, id_usuario, mensagem)
         VALUES (:canal, :usuario, :mensagem)'
    );
    $stmt->execute([
        ':canal' => $idCanal,
        ':usuario' => $_SESSION['usuario_id'],
        ':mensagem' => $texto
    ]);
    $idMensagem = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'SELECT cm.id, cm.mensagem, cm.data_envio, u.apelido
         FROM canal_mensagens cm
         INNER JOIN usuarios u ON u.id = cm.id_usuario
         WHERE cm.id = :mensagem'
    );
    $stmt->execute([':mensagem' => $idMensagem]);
    $mensagemSalva = $stmt->fetch(PDO::FETCH_ASSOC);

    responderJson(201, [
        'mensagem' => [
            'id' => (int) $mensagemSalva['id'],
            'usuario' => $mensagemSalva['apelido'],
            'texto' => $mensagemSalva['mensagem'],
            'enviadoEm' => $mensagemSalva['data_envio']
        ]
    ]);
} catch (Throwable $erro) {
    error_log($erro->getMessage());
    responderJson(500, ['erro' => 'Não foi possível carregar ou enviar as mensagens.']);
}
