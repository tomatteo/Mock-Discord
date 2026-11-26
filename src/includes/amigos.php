<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

function responderAmigos(int $status, array $dados): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function lerEntradaAmigos(): array
{
    try {
        $entrada = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        responderAmigos(400, ['erro' => 'Requisição inválida.']);
    }

    if (!is_array($entrada)) {
        responderAmigos(400, ['erro' => 'Requisição inválida.']);
    }

    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!isset($_SESSION['csrf_token']) || !is_string($token) || !hash_equals($_SESSION['csrf_token'], $token)) {
        responderAmigos(403, ['erro' => 'Sua sessão expirou. Atualize a página e tente novamente.']);
    }

    return $entrada;
}

$usuarioAtual = (int) $_SESSION['usuario_id'];
$metodo = $_SERVER['REQUEST_METHOD'];

try {
    if ($metodo === 'GET') {
        $stmt = $pdo->prepare(
            'SELECT u.id, u.apelido, u.foto_perfil
             FROM amizades a
             INNER JOIN usuarios u
                 ON u.id = IF(a.id_usuario_1 = :usuario_if, a.id_usuario_2, a.id_usuario_1)
             WHERE a.id_usuario_1 = :usuario_1 OR a.id_usuario_2 = :usuario_2
             ORDER BY u.apelido, u.id'
        );
        $stmt->execute([
            ':usuario_if' => $usuarioAtual,
            ':usuario_1' => $usuarioAtual,
            ':usuario_2' => $usuarioAtual
        ]);
        $amigos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare(
            "SELECT sa.id, u.id AS usuario_id, u.apelido
             FROM solicitacao_amizade sa
             INNER JOIN usuarios u ON u.id = sa.id_usuario_solicitante
             WHERE sa.id_usuario_solicitado = :usuario AND sa.st_status = 'pendente'
             ORDER BY sa.data_cadastro, sa.id"
        );
        $stmt->execute([':usuario' => $usuarioAtual]);
        responderAmigos(200, ['amigos' => $amigos, 'solicitacoes' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    if ($metodo !== 'POST') {
        header('Allow: GET, POST');
        responderAmigos(405, ['erro' => 'Método não permitido.']);
    }

    $entrada = lerEntradaAmigos();
    $acao = $entrada['acao'] ?? '';

    if ($acao === 'enviar') {
        $valorIdentificador = $entrada['identificador'] ?? null;
        if (!is_string($valorIdentificador) && !is_int($valorIdentificador)) {
            responderAmigos(422, ['erro' => 'Informe um nome de usuário ou identificador válido.']);
        }
        $identificador = trim((string) $valorIdentificador);
        if (!preg_match('/\A.{1,80}\z/us', $identificador)) {
            responderAmigos(422, ['erro' => 'Informe um nome de usuário ou identificador válido.']);
        }

        if (preg_match('/\A[1-9][0-9]*\z/', $identificador)) {
            $stmt = $pdo->prepare('SELECT id, apelido FROM usuarios WHERE id = :id');
            $stmt->execute([':id' => $identificador]);
            $alvo = $stmt->fetch(PDO::FETCH_ASSOC);
        } elseif (preg_match('/\A(.+)#([1-9][0-9]*)\z/u', $identificador, $partes)) {
            $stmt = $pdo->prepare('SELECT id, apelido FROM usuarios WHERE id = :id AND LOWER(apelido) = LOWER(:apelido)');
            $stmt->execute([':id' => $partes[2], ':apelido' => trim($partes[1])]);
            $alvo = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $pdo->prepare('SELECT id, apelido FROM usuarios WHERE LOWER(apelido) = LOWER(:apelido) ORDER BY id LIMIT 2');
            $stmt->execute([':apelido' => $identificador]);
            $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (count($resultados) > 1) {
                responderAmigos(422, ['erro' => 'Há mais de uma conta com esse nome. Use o identificador numérico exibido na lista.']);
            }
            $alvo = $resultados[0] ?? false;
        }

        if (!$alvo) {
            responderAmigos(404, ['erro' => 'Não encontramos esse usuário. Confira o nome ou identificador.']);
        }

        $alvoId = (int) $alvo['id'];
        if ($alvoId === $usuarioAtual) {
            responderAmigos(422, ['erro' => 'Você não pode enviar uma solicitação para si mesmo.']);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE id IN (:atual, :alvo) ORDER BY id FOR UPDATE');
        $stmt->execute([':atual' => $usuarioAtual, ':alvo' => $alvoId]);
        $stmt->fetchAll(PDO::FETCH_COLUMN);

        $stmt = $pdo->prepare(
            'SELECT 1 FROM amizades
             WHERE id_usuario_1 = LEAST(:atual_min, :alvo_min)
               AND id_usuario_2 = GREATEST(:atual_max, :alvo_max)'
        );
        $stmt->execute([
            ':atual_min' => $usuarioAtual,
            ':alvo_min' => $alvoId,
            ':atual_max' => $usuarioAtual,
            ':alvo_max' => $alvoId
        ]);
        if ($stmt->fetchColumn()) {
            $pdo->rollBack();
            responderAmigos(409, ['erro' => 'Esse usuário já está na sua lista de amigos.']);
        }

        $stmt = $pdo->prepare(
            "SELECT 1 FROM solicitacao_amizade
             WHERE st_status = 'pendente'
               AND (
                   (id_usuario_solicitante = :atual_solicitante AND id_usuario_solicitado = :alvo_solicitado)
                   OR (id_usuario_solicitante = :alvo_solicitante AND id_usuario_solicitado = :atual_solicitado)
               )"
        );
        $stmt->execute([
            ':atual_solicitante' => $usuarioAtual,
            ':alvo_solicitado' => $alvoId,
            ':alvo_solicitante' => $alvoId,
            ':atual_solicitado' => $usuarioAtual
        ]);
        if ($stmt->fetchColumn()) {
            $pdo->rollBack();
            responderAmigos(409, ['erro' => 'Já existe uma solicitação pendente entre vocês.']);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO solicitacao_amizade (id_usuario_solicitante, id_usuario_solicitado, st_status)
             VALUES (:solicitante, :solicitado, 'pendente')"
        );
        $stmt->execute([':solicitante' => $usuarioAtual, ':solicitado' => $alvoId]);
        $pdo->commit();
        responderAmigos(201, ['mensagem' => 'Solicitação enviada.', 'notificarUsuarioId' => $alvoId]);
    }

    if ($acao === 'responder') {
        $solicitacaoId = filter_var($entrada['solicitacaoId'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $resposta = $entrada['resposta'] ?? '';
        if ($solicitacaoId === false || !in_array($resposta, ['aceitar', 'recusar'], true)) {
            responderAmigos(422, ['erro' => 'Solicitação ou resposta inválida.']);
        }

        $stmt = $pdo->prepare(
            "SELECT id_usuario_solicitante
             FROM solicitacao_amizade
             WHERE id = :id AND id_usuario_solicitado = :usuario AND st_status = 'pendente'"
        );
        $stmt->execute([':id' => $solicitacaoId, ':usuario' => $usuarioAtual]);
        $solicitanteId = $stmt->fetchColumn();
        if (!$solicitanteId) {
            responderAmigos(404, ['erro' => 'Essa solicitação não está mais pendente.']);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE id IN (:atual, :solicitante) ORDER BY id FOR UPDATE');
        $stmt->execute([':atual' => $usuarioAtual, ':solicitante' => $solicitanteId]);
        $stmt->fetchAll(PDO::FETCH_COLUMN);

        $stmt = $pdo->prepare(
            "SELECT id, id_usuario_solicitante
             FROM solicitacao_amizade
             WHERE id = :id AND id_usuario_solicitado = :usuario AND st_status = 'pendente'
             FOR UPDATE"
        );
        $stmt->execute([':id' => $solicitacaoId, ':usuario' => $usuarioAtual]);
        $solicitacao = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$solicitacao) {
            $pdo->rollBack();
            responderAmigos(404, ['erro' => 'Essa solicitação não está mais pendente.']);
        }

        $novoStatus = $resposta === 'aceitar' ? 'aceito' : 'negado';
        $stmt = $pdo->prepare('UPDATE solicitacao_amizade SET st_status = :status WHERE id = :id');
        $stmt->execute([':status' => $novoStatus, ':id' => $solicitacaoId]);

        if ($resposta === 'aceitar') {
            $solicitanteId = (int) $solicitacao['id_usuario_solicitante'];
            $stmt = $pdo->prepare(
                'INSERT INTO amizades (id_usuario_1, id_usuario_2)
                 VALUES (:menor_id, :maior_id)'
            );
            $stmt->execute([
                ':menor_id' => min($usuarioAtual, $solicitanteId),
                ':maior_id' => max($usuarioAtual, $solicitanteId)
            ]);
        }

        $pdo->commit();
        responderAmigos(200, [
            'mensagem' => $resposta === 'aceitar' ? 'Solicitação aceita.' : 'Solicitação recusada.',
            'notificarUsuarioId' => (int) $solicitacao['id_usuario_solicitante']
        ]);
    }

    responderAmigos(422, ['erro' => 'Ação inválida.']);
} catch (Throwable $erro) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Falha ao processar operação de amizade: ' . $erro->getMessage());
    responderAmigos(500, ['erro' => 'Não foi possível concluir a operação. Tente novamente.']);
}
