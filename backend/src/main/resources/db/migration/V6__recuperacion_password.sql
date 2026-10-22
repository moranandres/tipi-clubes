CREATE TABLE tokens_recuperacion (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id    BIGINT       NOT NULL REFERENCES usuarios (id),
    token_hash    VARCHAR(64)  NOT NULL,
    expira_en     TIMESTAMPTZ  NOT NULL,
    usado_en      TIMESTAMPTZ,
    invalidado_en TIMESTAMPTZ,
    solicitado_ip VARCHAR(45),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_tokens_recuperacion_hash UNIQUE (token_hash),
    CONSTRAINT ck_tokens_recuperacion_hash CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_tokens_recuperacion_expira CHECK (expira_en > created_at),
    CONSTRAINT ck_tokens_recuperacion_uso CHECK (usado_en IS NULL OR invalidado_en IS NULL)
);

CREATE INDEX ix_tokrec_usuario_fecha ON tokens_recuperacion (usuario_id, created_at);
CREATE INDEX ix_tokrec_expira ON tokens_recuperacion (expira_en);
CREATE INDEX ix_auditoria_accion_ip_fecha ON auditoria (accion, ip, fecha);