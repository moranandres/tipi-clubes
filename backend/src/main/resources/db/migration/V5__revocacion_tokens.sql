ALTER TABLE usuarios ADD COLUMN version_token INT NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_version_token CHECK (version_token >= 0);

CREATE TABLE tokens_revocados (
    jti         UUID        PRIMARY KEY,
    usuario_id  BIGINT      NOT NULL REFERENCES usuarios (id),
    expira_en   TIMESTAMPTZ NOT NULL,
    revocado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_tokens_revocados_expira ON tokens_revocados (expira_en);
CREATE INDEX ix_tokens_revocados_usuario ON tokens_revocados (usuario_id);