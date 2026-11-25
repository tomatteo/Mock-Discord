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

function serializarMensagemCanal(array $mensagem): array
{
    $texto = $mensagem['mensagem'];
    $tipo = 'texto';
    $urlImagem = null;
    if (preg_match('~\A\[imagem\](/img/canais/[a-f0-9]{32}\.(?:jpg|png|webp))\z~', $texto, $correspondencia)) {
        $tipo = 'imagem';
        $urlImagem = $correspondencia[1];
        $texto = '';
    }

    return [
        'id' => (int) $mensagem['id'],
        'usuarioId' => (int) $mensagem['usuario_id'],
        'usuario' => $mensagem['apelido'],
        'fotoPerfil' => $mensagem['foto_perfil'],
        'tipo' => $tipo,
        'texto' => $texto,
        'url' => $urlImagem,
        'enviadoEm' => $mensagem['data_envio']
    ];
}

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo === 'GET') {
    $entrada = $_GET;
} elseif ($metodo === 'POST') {
    $tipoConteudo = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_starts_with($tipoConteudo, 'application/json')) {
        try {
            $entrada = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            responderJson(400, ['erro' => 'Requisição inválida.']);
        }
    } elseif (str_starts_with($tipoConteudo, 'multipart/form-data')) {
        $entrada = $_POST;
    } else {
        responderJson(415, ['erro' => 'Tipo de requisição não suportado.']);
    }
} else {
    responderJson(405, ['erro' => 'Método não permitido.']);
}
if (!is_array($entrada)) {
    responderJson(400, ['erro' => 'Requisição inválida.']);
}

$caminhoImagemSalva = null;
$idCanal = filter_var($entrada['canal'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($idCanal === false) {
    responderJson(422, ['erro' => 'Canal inválido.']);
}
if ($metodo === 'POST') {
    $token = $entrada['csrf_token'] ?? '';
    if (
        !is_string($token)
        || !isset($_SESSION['csrf_token'])
        || !hash_equals($_SESSION['csrf_token'], $token)
    ) {
        responderJson(403, ['erro' => 'Sua sessão expirou. Atualize a página e tente novamente.']);
    }
}

try {
    // Confere o vínculo do usuário com o servidor dono do canal.
    $stmt = $pdo->prepare(
        "SELECT c.id
         FROM canais c
         INNER JOIN servidores_usuario su ON su.id_servidor = c.id_servidor
         WHERE c.id = :canal
           AND c.tipo = 'texto'
           AND su.id_usuario = :usuario"
    );
    $stmt->execute([
        ':canal' => $idCanal,
        ':usuario' => $_SESSION['usuario_id']
    ]);
    if (!$stmt->fetchColumn()) {
        responderJson(404, ['erro' => 'Canal não encontrado.']);
    }

    if ($metodo === 'GET') {
        // O parâmetro "depois" permite buscar somente mensagens ainda não exibidas.
        $consulta = 'SELECT cm.id, cm.mensagem, cm.data_envio, u.id AS usuario_id, u.apelido, u.foto_perfil
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
        $mensagens = array_map('serializarMensagemCanal', $stmt->fetchAll(PDO::FETCH_ASSOC));
        responderJson(200, ['mensagens' => $mensagens]);
    }

    $arquivo = $_FILES['imagem'] ?? null;
    $mensagem = null;
    if (is_array($arquivo) && ($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if (($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_INI_SIZE) {
            responderJson(413, ['erro' => 'A imagem deve ter no máximo 5 MB.']);
        }
        if (($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            responderJson(400, ['erro' => 'Não foi possível receber a imagem. Selecione-a novamente.']);
        }
        if (($arquivo['size'] ?? 0) > 5 * 1024 * 1024) {
            responderJson(413, ['erro' => 'A imagem deve ter no máximo 5 MB.']);
        }

        $tipoImagem = (new finfo(FILEINFO_MIME_TYPE))->file($arquivo['tmp_name']);
        $extensoes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp'
        ];
        $dimensoes = @getimagesize($arquivo['tmp_name']);
        if (
            !isset($extensoes[$tipoImagem])
            || $dimensoes === false
            || $dimensoes[0] > 4096
            || $dimensoes[1] > 4096
        ) {
            responderJson(415, ['erro' => 'Use uma imagem JPEG, PNG ou WebP válida, de até 4096 × 4096 pixels.']);
        }

        $diretorioImagens = (getenv('SERVER_ICONS_DIR') ?: '/var/www/assets/img') . '/canais';
        if (!is_dir($diretorioImagens) && !mkdir($diretorioImagens, 0755, true) && !is_dir($diretorioImagens)) {
            responderJson(500, ['erro' => 'Não foi possível preparar o armazenamento das imagens.']);
        }
        $nomeArquivo = bin2hex(random_bytes(16)) . '.' . $extensoes[$tipoImagem];
        $caminhoImagemSalva = $diretorioImagens . '/' . $nomeArquivo;
        if (!move_uploaded_file($arquivo['tmp_name'], $caminhoImagemSalva)) {
            $caminhoImagemSalva = null;
            responderJson(500, ['erro' => 'Não foi possível gravar a imagem enviada.']);
        }
        $mensagem = '[imagem]/img/canais/' . $nomeArquivo;
    } else {
        $texto = $entrada['mensagem'] ?? '';
        if (!is_string($texto)) {
            responderJson(422, ['erro' => 'A mensagem é inválida.']);
        }
        $texto = trim($texto);
        if ($texto === '' || mb_strlen($texto) > 250) {
            responderJson(422, ['erro' => 'A mensagem deve ter entre 1 e 250 caracteres.']);
        }
        $mensagem = $texto;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO canal_mensagens (id_canal, id_usuario, mensagem)
         VALUES (:canal, :usuario, :mensagem)'
    );
    $stmt->execute([
        ':canal' => $idCanal,
        ':usuario' => $_SESSION['usuario_id'],
        ':mensagem' => $mensagem
    ]);
    $idMensagem = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'SELECT cm.id, cm.mensagem, cm.data_envio, u.id AS usuario_id, u.apelido, u.foto_perfil
         FROM canal_mensagens cm
         INNER JOIN usuarios u ON u.id = cm.id_usuario
         WHERE cm.id = :mensagem'
    );
    $stmt->execute([':mensagem' => $idMensagem]);
    $mensagemSalva = $stmt->fetch(PDO::FETCH_ASSOC);

    responderJson(201, ['mensagem' => serializarMensagemCanal($mensagemSalva)]);
} catch (Throwable $erro) {
    if (is_string($caminhoImagemSalva) && is_file($caminhoImagemSalva) && !unlink($caminhoImagemSalva)) {
        error_log('Não foi possível remover uma imagem de canal após falha ao salvar a mensagem.');
    }
    error_log($erro->getMessage());
    responderJson(500, ['erro' => 'Não foi possível carregar ou enviar as mensagens.']);
}
