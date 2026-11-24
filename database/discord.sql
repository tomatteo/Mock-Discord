CREATE DATABASE IF NOT EXISTS discord;
USE discord;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    apelido VARCHAR(25) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    numero VARCHAR(20) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    foto_perfil VARCHAR(255),
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE servidores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_dono INT NOT NULL,
    nome VARCHAR(25) NOT NULL,
    descricao VARCHAR(250),
    icone VARCHAR(250) NOT NULL,
    cor VARCHAR(20) NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_servidores_dono FOREIGN KEY (id_dono) REFERENCES usuarios(id)
);

CREATE TABLE servidor_cargos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(25) NOT NULL,
    id_servidor INT NOT NULL,
    adm BOOLEAN DEFAULT FALSE,
    membro BOOLEAN DEFAULT TRUE,
    moderador BOOLEAN DEFAULT FALSE,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cargos_servidor FOREIGN KEY (id_servidor) REFERENCES servidores(id),
    UNIQUE KEY uq_cargo_servidor (id, id_servidor)
);

CREATE TABLE servidores_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_servidor INT NOT NULL,
    id_cargo INT NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_su_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    CONSTRAINT fk_su_servidor FOREIGN KEY (id_servidor) REFERENCES servidores(id),
    CONSTRAINT fk_su_cargo_servidor FOREIGN KEY (id_cargo, id_servidor) REFERENCES servidor_cargos(id, id_servidor),
    CONSTRAINT uq_usuario_servidor UNIQUE (id_usuario, id_servidor)
);

CREATE TABLE servidor_banimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_servidor INT NOT NULL,
    id_adm INT NOT NULL,
    motivo VARCHAR(250),
    data_banimento DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_limite DATETIME,
    CONSTRAINT fk_ban_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    CONSTRAINT fk_ban_servidor FOREIGN KEY (id_servidor) REFERENCES servidores(id),
    CONSTRAINT fk_ban_adm FOREIGN KEY (id_adm) REFERENCES usuarios(id)
);

CREATE TABLE servidor_convites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_solicitado INT NOT NULL,
    id_usuario_solicitante INT NOT NULL,
    id_servidor INT NOT NULL,
    descricao VARCHAR(250),
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_convite_solicitado FOREIGN KEY (id_usuario_solicitado) REFERENCES usuarios(id),
    CONSTRAINT fk_convite_solicitante FOREIGN KEY (id_usuario_solicitante) REFERENCES usuarios(id),
    CONSTRAINT fk_convite_servidor FOREIGN KEY (id_servidor) REFERENCES servidores(id)
);

CREATE TABLE solicitacao_amizade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_solicitado INT NOT NULL,
    id_usuario_solicitante INT NOT NULL,
    descricao VARCHAR(250),
    st_status ENUM(
        'pendente',
        'aceito',
        'negado',
        'expirado'
    ) DEFAULT 'pendente',
    data_limite DATETIME,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_solicitacao_solicitado FOREIGN KEY (id_usuario_solicitado) REFERENCES usuarios(id),
    CONSTRAINT fk_solicitacao_solicitante FOREIGN KEY (id_usuario_solicitante) REFERENCES usuarios(id),
    CONSTRAINT chk_solicitacao_diferente CHECK (id_usuario_solicitado <> id_usuario_solicitante)
);

CREATE TABLE amizades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_1 INT NOT NULL,
    id_usuario_2 INT NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_amizade_usuario1 FOREIGN KEY (id_usuario_1) REFERENCES usuarios(id),
    CONSTRAINT fk_amizade_usuario2 FOREIGN KEY (id_usuario_2) REFERENCES usuarios(id),
    CONSTRAINT uq_amizade UNIQUE (id_usuario_1, id_usuario_2),
    CONSTRAINT chk_amizade_diferente CHECK (id_usuario_1 < id_usuario_2)
);

CREATE TABLE conversas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_1 INT NOT NULL,
    id_usuario_2 INT NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversa_usuario1 FOREIGN KEY (id_usuario_1) REFERENCES usuarios(id),
    CONSTRAINT fk_conversa_usuario2 FOREIGN KEY (id_usuario_2) REFERENCES usuarios(id),
    CONSTRAINT uq_conversa UNIQUE (id_usuario_1, id_usuario_2),
    CONSTRAINT chk_conversa_diferente CHECK (id_usuario_1 < id_usuario_2)
);

CREATE TABLE conversa_mensagem (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_conversa INT NOT NULL,
    id_envio INT NOT NULL,
    mensagem VARCHAR(250) NOT NULL,
    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cm_conversa FOREIGN KEY (id_conversa) REFERENCES conversas(id),
    CONSTRAINT fk_cm_usuario FOREIGN KEY (id_envio) REFERENCES usuarios(id)
);

CREATE TABLE canais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_servidor INT NOT NULL,
    nome VARCHAR(50) NOT NULL,
    tipo ENUM('texto', 'voz') DEFAULT 'texto',
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_canais_servidor FOREIGN KEY (id_servidor) REFERENCES servidores(id)
);

CREATE TABLE canal_mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_canal INT NOT NULL,
    id_usuario INT NOT NULL,
    mensagem VARCHAR(250) NOT NULL,
    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_canal_mensagem_canal FOREIGN KEY (id_canal) REFERENCES canais(id),
    CONSTRAINT fk_canal_mensagem_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);