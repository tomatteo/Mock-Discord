<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';
verificarLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../inicio.php');
    exit;
}

$nomeServidor = trim($_POST['nomeServidor'] ?? '');
if (!preg_match('/\A.{2,25}\z/u', $nomeServidor)) {
    http_response_code(422);
    exit('O nome do servidor deve ter entre 2 e 25 caracteres.');
}

$iconeServidor = '';
$arquivoMovido = null;
$arquivo = $_FILES['arquivoServidor'] ?? null;

if ($arquivo && $arquivo['error'] !== UPLOAD_ERR_NO_FILE) {
    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        exit('Não foi possível enviar o ícone do servidor.');
    }

    if ($arquivo['size'] > 5 * 1024 * 1024) {
        http_response_code(422);
        exit('O ícone do servidor não pode exceder 5 MB.');
    }

    $tiposPermitidos = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];
    $tipoMime = (new finfo(FILEINFO_MIME_TYPE))->file($arquivo['tmp_name']);
    if (!isset($tiposPermitidos[$tipoMime])) {
        http_response_code(422);
        exit('O ícone deve estar no formato JPG, PNG ou WEBP.');
    }

    $diretorioImagens = getenv('SERVER_ICONS_DIR') ?: __DIR__ . '/../img';
    if (!is_dir($diretorioImagens) && !mkdir($diretorioImagens, 0775, true) && !is_dir($diretorioImagens)) {
        throw new RuntimeException('Não foi possível preparar o diretório de ícones.');
    }

    $nomeArquivo = bin2hex(random_bytes(16)) . '.' . $tiposPermitidos[$tipoMime];
    $arquivoMovido = $diretorioImagens . '/' . $nomeArquivo;
    if (!move_uploaded_file($arquivo['tmp_name'], $arquivoMovido)) {
        throw new RuntimeException('Não foi possível salvar o ícone do servidor.');
    }
    $iconeServidor = 'img/' . $nomeArquivo;
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare(
        'INSERT INTO servidores (nome, id_dono, icone, descricao, cor)
         VALUES (:nome, :dono, :icone, NULL, :cor)'
    );
    $stmt->execute([
        ':nome' => $nomeServidor,
        ':dono' => $_SESSION['usuario_id'],
        ':icone' => $iconeServidor,
        ':cor' => 'blue'
    ]);
    $idServidor = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'INSERT INTO servidor_cargos (nome, id_servidor, adm, moderador, membro)
         VALUES (:nome, :servidor, TRUE, FALSE, FALSE)'
    );
    $stmt->execute([
        ':nome' => 'ADMINISTRADOR',
        ':servidor' => $idServidor
    ]);
    $idCargo = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'INSERT INTO canais (nome, id_servidor, tipo)
         VALUES (:nome_texto, :servidor_texto, :tipo_texto),
                (:nome_voz, :servidor_voz, :tipo_voz)'
    );
    $stmt->execute([
        ':nome_texto' => 'geral',
        ':servidor_texto' => $idServidor,
        ':tipo_texto' => 'texto',
        ':nome_voz' => 'geral',
        ':servidor_voz' => $idServidor,
        ':tipo_voz' => 'voz'
    ]);

    $stmt = $pdo->prepare(
        'INSERT INTO servidores_usuario (id_cargo, id_servidor, id_usuario)
         VALUES (:cargo, :servidor, :usuario)'
    );
    $stmt->execute([
        ':cargo' => $idCargo,
        ':servidor' => $idServidor,
        ':usuario' => $_SESSION['usuario_id']
    ]);

    $pdo->commit();
} catch (Throwable $erro) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($arquivoMovido !== null && is_file($arquivoMovido)) {
        unlink($arquivoMovido);
    }
    throw $erro;
}

header('Location: ../servidor.php?servidor=' . $idServidor);
exit;
