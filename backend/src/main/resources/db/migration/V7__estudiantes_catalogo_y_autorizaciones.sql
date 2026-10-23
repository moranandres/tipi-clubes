ALTER TABLE estudiantes ADD CONSTRAINT ck_estudiantes_curso CHECK (curso IN (
    'INICIAL_1', 'INICIAL_2',
    'EGB_1', 'EGB_2', 'EGB_3', 'EGB_4', 'EGB_5', 'EGB_6', 'EGB_7', 'EGB_8', 'EGB_9', 'EGB_10',
    'BGU_1', 'BGU_2', 'BGU_3'
));
ALTER TABLE estudiantes ADD CONSTRAINT ck_estudiantes_nombres CHECK (btrim(nombres) <> '' AND btrim(apellidos) <> '');

ALTER TABLE autorizaciones_estudiante
    ADD COLUMN documento_nombre     VARCHAR(150),
    ADD COLUMN documento_tipo       VARCHAR(50),
    ADD COLUMN documento_tamano     BIGINT,
    ADD COLUMN documento_hash       VARCHAR(64),
    ADD COLUMN documento_subido_en  TIMESTAMPTZ,
    ADD COLUMN documento_subido_por BIGINT REFERENCES usuarios (id),
    ADD COLUMN revocado_en          TIMESTAMPTZ,
    ADD COLUMN actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE autorizaciones_estudiante
    ADD CONSTRAINT ck_autorizacion_documento_completo CHECK (
        (documento_ruta IS NULL AND documento_hash IS NULL AND documento_tipo IS NULL
            AND documento_tamano IS NULL AND documento_subido_en IS NULL)
        OR (documento_ruta IS NOT NULL AND documento_hash ~ '^[0-9a-f]{64}$'
            AND documento_tipo IN ('application/pdf', 'image/jpeg', 'image/png')
            AND documento_tamano > 0 AND documento_subido_en IS NOT NULL)
    ),
    ADD CONSTRAINT ck_autorizacion_otorgada_documento CHECK (estado <> 'OTORGADA' OR documento_ruta IS NOT NULL),
    ADD CONSTRAINT ck_autorizacion_revocada CHECK (estado <> 'REVOCADA' OR revocado_en IS NOT NULL);

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e
CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) AS t(tipo)
WHERE NOT EXISTS (
    SELECT 1 FROM autorizaciones_estudiante a WHERE a.estudiante_id = e.id AND a.tipo = t.tipo
);

CREATE INDEX ix_autorizaciones_estudiante ON autorizaciones_estudiante (estudiante_id);
CREATE INDEX ix_estudiantes_curso ON estudiantes (curso);
CREATE INDEX ix_estudiantes_estado ON estudiantes (estado);