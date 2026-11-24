SET @existe_foto_perfil = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'foto_perfil'
);

SET @sql_migracao = IF(
    @existe_foto_perfil = 0,
    'ALTER TABLE usuarios ADD COLUMN foto_perfil VARCHAR(255) NULL',
    'SELECT 1'
);

PREPARE migracao_foto_perfil FROM @sql_migracao;
EXECUTE migracao_foto_perfil;
DEALLOCATE PREPARE migracao_foto_perfil;
