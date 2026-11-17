CREATE OR REPLACE FUNCTION cedula_ecuatoriana_valida(cedula TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    provincia INTEGER;
    suma      INTEGER := 0;
    valor     INTEGER;
    indice    INTEGER;
BEGIN
    IF cedula IS NULL OR cedula !~ '^[0-9]{10}$' THEN
        RETURN FALSE;
    END IF;
    provincia := substr(cedula, 1, 2)::INTEGER;
    IF NOT (provincia BETWEEN 1 AND 24 OR provincia = 30) THEN
        RETURN FALSE;
    END IF;
    IF substr(cedula, 3, 1)::INTEGER >= 6 THEN
        RETURN FALSE;
    END IF;
    FOR indice IN 1..9 LOOP
        valor := substr(cedula, indice, 1)::INTEGER * CASE WHEN indice % 2 = 1 THEN 2 ELSE 1 END;
        IF valor > 9 THEN
            valor := valor - 9;
        END IF;
        suma := suma + valor;
    END LOOP;
    RETURN (10 - suma % 10) % 10 = substr(cedula, 10, 1)::INTEGER;
END;
$$;

ALTER TABLE autorizaciones_estudiante
    ADD COLUMN representante_nombres    VARCHAR(100),
    ADD COLUMN representante_apellidos  VARCHAR(100),
    ADD COLUMN representante_cedula     VARCHAR(10),
    ADD COLUMN representante_parentesco VARCHAR(20),
    ADD COLUMN representante_telefono   VARCHAR(10),
    ADD COLUMN representante_correo     VARCHAR(150);

ALTER TABLE autorizaciones_estudiante
    ADD CONSTRAINT ck_autorizacion_representante_completo CHECK (
        num_nulls(representante_nombres, representante_apellidos, representante_cedula,
                  representante_parentesco, representante_telefono) IN (0, 5)
        AND (representante_correo IS NULL OR representante_cedula IS NOT NULL)
    ),
    ADD CONSTRAINT ck_autorizacion_representante_nombres CHECK (
        representante_nombres IS NULL
        OR (btrim(representante_nombres) <> '' AND btrim(representante_apellidos) <> '')
    ),
    ADD CONSTRAINT ck_autorizacion_representante_cedula CHECK (
        representante_cedula IS NULL OR cedula_ecuatoriana_valida(representante_cedula)
    ),
    ADD CONSTRAINT ck_autorizacion_representante_parentesco CHECK (
        representante_parentesco IS NULL OR representante_parentesco IN
            ('MADRE', 'PADRE', 'TUTOR_LEGAL', 'ABUELO', 'TIO', 'HERMANO', 'OTRO')
    ),
    ADD CONSTRAINT ck_autorizacion_representante_telefono CHECK (
        representante_telefono IS NULL OR representante_telefono ~ '^0[2-9][0-9]{7,8}$'
    ),
    ADD CONSTRAINT ck_autorizacion_representante_correo CHECK (
        representante_correo IS NULL
        OR representante_correo ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    );

CREATE INDEX ix_autorizaciones_estado_tipo ON autorizaciones_estudiante (estado, tipo);
CREATE INDEX ix_autorizaciones_representante_cedula ON autorizaciones_estudiante (representante_cedula)
    WHERE representante_cedula IS NOT NULL;
