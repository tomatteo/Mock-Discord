<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
verificarLogin();

$user = $_SESSION['usuario_id'];

if($_SERVER['REQUEST_METHOD'] === 'POST'){
    $arquivo = $_FILES['imagemServidor'];
    $pasta = '../img/';
    $nomeServidor = $_POST['nomeServidor'];

    if(empty($nomeServidor)){
        die('O nome do servidor é obrigatório.');
    }

    if($arquivo['error'] !== UPLOAD_ERR_OK){
        die('Erro ao enviar o arquivo. ');
    }

    $tamanhoMaximo = 5 * 1024 * 1024;
    if ($arquivo['size'] > $tamanhoMaximo) {
        die('O arquivo excede o limite de 5 MB.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $tipoMime = $finfo->file($arquivo['tmp_name']);
    $tiposPermitidos = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp'
    ];

    if (!array_key_exists($tipoMime, $tiposPermitidos)) {
        die('Formato inválido. Envie apenas JPG, PNG ou WEBP.');
    }

    $extensao = $tiposPermitidos[$tipoMime];
    $nomeUnico = uniqid('img_', true) . '.' . $extensao;
    $caminhoCompleto = $pasta . $nomeUnico;

    if (move_uploaded_file($arquivo['tmp_name'], $caminhoCompleto)){
        echo "Imagem enviada com sucesso! Salva em: ". htmlspecialchars($caminhoCompleto);
    }else{
        echo "Falha ao salvar a imagem no servidor.";
    }

    $sql = "insert into servidores(nome, id_dono, icone, descricao, data_cadastro, cor) values (:nome, :dono, :icone, Null, now(), 'blue'); select LAST_INSERT_ID();";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':nome'=> $nomeServidor, 
        ':dono'=> $user, 
        ':icone'=> $caminhoCompleto
    ]);
    $servidor = $stmt->fetch();

    $sqlCargo = "insert into servidor_cargos (nome, id_servidor, adm, moderador, membro, data_cadastro) values ('ADMINISTRADOR', :servidor, TRUE, FALSE, FALSE, now()); select LAST_INSERT_ID()";
    $stmt = $pdo->prepare($sqlCargo);
    $stmt->execute([
        ':servidor' => $servidor
    ]);
    $cargo = $stmt->fetch();

    $sqlCanalTexto = "insert into canais (nome, id_servidor, data_cadastro, tipo) values ('geral', :servidor, now(), 'texto')";
    $stmt = $pdo->prepare($sqlCanalTexto);
    $stmt->execute([
        ':servidor' => $servidor
    ]);

    $sqlCanalVoz = "insert into canais (nome, id_servidor, data_cadastro, tipo) values ('geral', :servidor, now(), 'texto')";
    $stmt = $pdo->prepare($sqlCanalVoz);
    $stmt->execute([
        ':servidor' => $servidor
    ]);

    $sqlServidorUsuario = "insert into servidores_usuario (id_cargo, id_servidor, id_usuarios, data_cadastro) values (:cargo, :servidor, :usuario, now())";
    $stmt = $pdo->prepare($sqlServidorUsuario);
    $stmt->execute([
        ':cargo'=> $cargo,
        ':servidor'=> $servidor,
        ':usuario' => $user
    ]);
}
?>