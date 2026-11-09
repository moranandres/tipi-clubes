CREATE TABLE evidencias (
    id                             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actividad_id                   BIGINT        NOT NULL,
    club_id                        BIGINT        NOT NULL,
    institucion_id                 BIGINT        NOT NULL,
    tipo                           VARCHAR(12)   NOT NULL,
    titulo                         VARCHAR(150)  NOT NULL,
    descripcion                    VARCHAR(1000) NOT NULL,
    fecha_evidencia                DATE          NOT NULL,
    url                            VARCHAR(500),
    archivo_ruta                   VARCHAR(500),
    archivo_nombre                 VARCHAR(150),
    archivo_tipo                   VARCHAR(50),
    archivo_tamano                 BIGINT,
    archivo_hash                   VARCHAR(64),
    sin_estudiantes_identificables BOOLEAN       NOT NULL DEFAULT FALSE,
    estado                         VARCHAR(10)   NOT NULL DEFAULT 'ACTIVA',
    registrado_por                 BIGINT        NOT NULL REFERENCES usuarios (id),
    fecha_registro                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
    motivo_retiro                  VARCHAR(500),
    retirada_por                   BIGINT        REFERENCES usuarios (id),
    fecha_retiro                   TIMESTAMPTZ,
    CONSTRAINT fk_evidencias_actividad FOREIGN KEY (actividad_id, club_id)
        REFERENCES actividades (id, club_id),
    CONSTRAINT fk_evidencias_club FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT ck_evidencias_tipo CHECK (tipo IN ('FOTOGRAFIA', 'DOCUMENTO', 'ENLACE', 'PRODUCTO')),
    CONSTRAINT ck_evidencias_estado CHECK (estado IN ('ACTIVA', 'RETIRADA')),
    CONSTRAINT ck_evidencias_textos CHECK (btrim(titulo) <> '' AND btrim(descripcion) <> ''),
    CONSTRAINT ck_evidencias_url CHECK (
        url IS NULL OR url ~* '^https?://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$'
    ),
    CONSTRAINT ck_evidencias_archivo_completo CHECK (
        (archivo_hash IS NULL AND archivo_nombre IS NULL AND archivo_tipo IS NULL
            AND archivo_tamano IS NULL AND archivo_ruta IS NULL)
        OR (archivo_hash ~ '^[0-9a-f]{64}$' AND btrim(archivo_nombre) <> ''
            AND archivo_tipo IN ('application/pdf', 'image/jpeg', 'image/png')
            AND archivo_tamano BETWEEN 1 AND 5242880
            AND (archivo_ruta IS NOT NULL OR estado = 'RETIRADA'))
    ),
    CONSTRAINT ck_evidencias_contenido_por_tipo CHECK (
        (tipo = 'FOTOGRAFIA' AND url IS NULL AND archivo_tipo IN ('image/jpeg', 'image/png'))
        OR (tipo = 'DOCUMENTO' AND url IS NULL AND archivo_tipo = 'application/pdf')
        OR (tipo = 'ENLACE' AND url IS NOT NULL AND archivo_hash IS NULL)
        OR (tipo = 'PRODUCTO' AND (
            (url IS NOT NULL AND archivo_hash IS NULL)
            OR (url IS NULL AND archivo_tipo = 'application/pdf')))
    ),
    CONSTRAINT ck_evidencias_sin_estudiantes CHECK (NOT sin_estudiantes_identificables OR tipo = 'FOTOGRAFIA'),
    CONSTRAINT ck_evidencias_retiro CHECK (
        (estado = 'ACTIVA' AND motivo_retiro IS NULL AND retirada_por IS NULL AND fecha_retiro IS NULL)
        OR (estado = 'RETIRADA' AND motivo_retiro IS NOT NULL AND btrim(motivo_retiro) <> ''
            AND retirada_por IS NOT NULL AND fecha_retiro IS NOT NULL AND archivo_ruta IS NULL)
    )
);

CREATE UNIQUE INDEX ux_evidencias_archivo_activo ON evidencias (actividad_id, archivo_hash)
    WHERE estado = 'ACTIVA' AND archivo_hash IS NOT NULL;
CREATE UNIQUE INDEX ux_evidencias_url_activa ON evidencias (actividad_id, url)
    WHERE estado = 'ACTIVA' AND url IS NOT NULL;
CREATE INDEX ix_evidencias_actividad ON evidencias (actividad_id);
CREATE INDEX ix_evidencias_club_estado ON evidencias (club_id, estado);
CREATE INDEX ix_evidencias_institucion_fecha ON evidencias (institucion_id, fecha_evidencia);

CREATE TABLE evidencia_estudiantes (
    evidencia_id  BIGINT NOT NULL REFERENCES evidencias (id),
    estudiante_id BIGINT NOT NULL REFERENCES estudiantes (id),
    CONSTRAINT pk_evidencia_estudiantes PRIMARY KEY (evidencia_id, estudiante_id)
);

CREATE INDEX ix_evidencia_estudiantes_estudiante ON evidencia_estudiantes (estudiante_id);

CREATE FUNCTION fn_validar_evidencia() RETURNS trigger AS $$
DECLARE
    v_actividad_estado VARCHAR(15);
    v_fecha DATE;
    v_tema VARCHAR(200);
    v_club_estado VARCHAR(15);
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.estado = 'RETIRADA' THEN
            RAISE EXCEPTION 'La evidencia «%» fue retirada y ya no se modifica', OLD.titulo
                USING ERRCODE = '23TP1';
        END IF;
        IF (NEW.actividad_id, NEW.club_id, NEW.institucion_id, NEW.tipo, NEW.url, NEW.archivo_nombre,
            NEW.archivo_tipo, NEW.archivo_tamano, NEW.archivo_hash, NEW.registrado_por, NEW.fecha_registro)
           IS DISTINCT FROM
           (OLD.actividad_id, OLD.club_id, OLD.institucion_id, OLD.tipo, OLD.url, OLD.archivo_nombre,
            OLD.archivo_tipo, OLD.archivo_tamano, OLD.archivo_hash, OLD.registrado_por, OLD.fecha_registro) THEN
            RAISE EXCEPTION 'Una evidencia registrada no cambia de actividad, de tipo, de archivo ni de enlace; retírela y registre una nueva'
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.archivo_ruta IS DISTINCT FROM OLD.archivo_ruta AND NEW.estado <> 'RETIRADA' THEN
            RAISE EXCEPTION 'El archivo de una evidencia solo se libera al retirarla'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.estado <> 'ACTIVA' THEN
        RAISE EXCEPTION 'Toda evidencia se registra primero como activa'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT a.estado, a.fecha, a.tema
    INTO v_actividad_estado, v_fecha, v_tema
    FROM actividades a
    WHERE a.id = NEW.actividad_id;

    IF TG_OP = 'INSERT' AND v_actividad_estado <> 'EJECUTADA' THEN
        RAISE EXCEPTION 'Las evidencias se registran en actividades ejecutadas; la actividad «%» está %',
            v_tema, CASE v_actividad_estado WHEN 'PLANIFICADA' THEN 'planificada' ELSE 'cancelada' END
            USING ERRCODE = '23TP1';
    END IF;

    SELECT estado INTO v_club_estado FROM clubes WHERE id = NEW.club_id;
    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; sus evidencias forman parte del historial y ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;

    IF TG_OP = 'INSERT' OR NEW.fecha_evidencia IS DISTINCT FROM OLD.fecha_evidencia THEN
        IF NEW.fecha_evidencia < v_fecha OR NEW.fecha_evidencia > fn_hoy_guayaquil() THEN
            RAISE EXCEPTION 'La fecha de la evidencia debe estar entre la fecha de la actividad «%» (%) y hoy',
                v_tema, to_char(v_fecha, 'DD/MM/YYYY')
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evidencias_validar
    BEFORE INSERT OR UPDATE ON evidencias
    FOR EACH ROW EXECUTE FUNCTION fn_validar_evidencia();

CREATE TRIGGER trg_evidencias_sin_borrado
    BEFORE DELETE ON evidencias
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Las evidencias forman parte del historial de la actividad y no se eliminan; retírela en su lugar');

CREATE FUNCTION fn_validar_estudiante_evidencia() RETURNS trigger AS $$
DECLARE
    v_evidencia_id BIGINT;
    v_tipo VARCHAR(12);
    v_estado VARCHAR(10);
    v_titulo VARCHAR(150);
    v_club_id BIGINT;
    v_fecha DATE;
    v_club_estado VARCHAR(15);
    v_codigo VARCHAR(20);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_evidencia_id := OLD.evidencia_id;
    ELSE
        v_evidencia_id := NEW.evidencia_id;
    END IF;

    SELECT ev.tipo, ev.estado, ev.titulo, ev.club_id, a.fecha, c.estado
    INTO v_tipo, v_estado, v_titulo, v_club_id, v_fecha, v_club_estado
    FROM evidencias ev
    JOIN actividades a ON a.id = ev.actividad_id
    JOIN clubes c ON c.id = ev.club_id
    WHERE ev.id = v_evidencia_id;

    IF v_estado = 'RETIRADA' THEN
        RAISE EXCEPTION 'La evidencia «%» fue retirada; sus estudiantes relacionados ya no se modifican', v_titulo
            USING ERRCODE = '23TP1';
    END IF;
    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; sus evidencias forman parte del historial y ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    IF v_tipo NOT IN ('FOTOGRAFIA', 'PRODUCTO') THEN
        RAISE EXCEPTION 'Solo las fotografías y los productos se relacionan con estudiantes; «%» es de tipo %',
            v_titulo, v_tipo
            USING ERRCODE = '23TP1';
    END IF;

    SELECT codigo_interno INTO v_codigo FROM estudiantes WHERE id = NEW.estudiante_id;

    IF NOT EXISTS (
        SELECT 1 FROM inscripciones i
        WHERE i.estudiante_id = NEW.estudiante_id
          AND i.club_id = v_club_id
          AND i.fecha_ingreso <= v_fecha
          AND (i.fecha_retiro IS NULL OR i.fecha_retiro >= v_fecha)
    ) THEN
        RAISE EXCEPTION 'El estudiante % no era integrante del club el % (fecha de la actividad de «%»)',
            v_codigo, to_char(v_fecha, 'DD/MM/YYYY'), v_titulo
            USING ERRCODE = '23TP1';
    END IF;

    IF v_tipo = 'FOTOGRAFIA' AND NOT EXISTS (
        SELECT 1 FROM autorizaciones_estudiante au
        WHERE au.estudiante_id = NEW.estudiante_id
          AND au.tipo = 'USO_IMAGEN'
          AND au.estado = 'OTORGADA'
    ) THEN
        RAISE EXCEPTION 'El estudiante % no tiene otorgada la autorización de uso de imagen y no puede aparecer en la fotografía «%»',
            v_codigo, v_titulo
            USING ERRCODE = '23TP1';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evidencia_estudiantes_validar
    BEFORE INSERT OR DELETE ON evidencia_estudiantes
    FOR EACH ROW EXECUTE FUNCTION fn_validar_estudiante_evidencia();

CREATE TRIGGER trg_evidencia_estudiantes_sin_edicion
    BEFORE UPDATE ON evidencia_estudiantes
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Los estudiantes de una evidencia no se editan; se quitan o se agregan');

CREATE FUNCTION fn_verificar_declaracion_fotografia() RETURNS trigger AS $$
DECLARE
    v_evidencia_id BIGINT;
    v_tipo VARCHAR(12);
    v_estado VARCHAR(10);
    v_titulo VARCHAR(150);
    v_sin_estudiantes BOOLEAN;
    v_total BIGINT;
BEGIN
    IF TG_TABLE_NAME = 'evidencias' THEN
        v_evidencia_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_evidencia_id := OLD.evidencia_id;
    ELSE
        v_evidencia_id := NEW.evidencia_id;
    END IF;

    SELECT tipo, estado, titulo, sin_estudiantes_identificables
    INTO v_tipo, v_estado, v_titulo, v_sin_estudiantes
    FROM evidencias
    WHERE id = v_evidencia_id;

    IF v_tipo IS DISTINCT FROM 'FOTOGRAFIA' OR v_estado <> 'ACTIVA' THEN
        RETURN NULL;
    END IF;

    SELECT count(*) INTO v_total FROM evidencia_estudiantes WHERE evidencia_id = v_evidencia_id;

    IF v_sin_estudiantes AND v_total > 0 THEN
        RAISE EXCEPTION 'La fotografía «%» se declaró sin estudiantes identificables, pero tiene % estudiante(s) relacionado(s)',
            v_titulo, v_total
            USING ERRCODE = '23TP1';
    END IF;
    IF NOT v_sin_estudiantes AND v_total = 0 THEN
        RAISE EXCEPTION 'La fotografía «%» debe indicar qué estudiantes aparecen en ella o declararse sin estudiantes identificables',
            v_titulo
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_evidencias_declaracion_fotografia
    AFTER INSERT OR UPDATE ON evidencias
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_verificar_declaracion_fotografia();

CREATE CONSTRAINT TRIGGER trg_evidencia_estudiantes_declaracion_fotografia
    AFTER INSERT OR DELETE ON evidencia_estudiantes
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_verificar_declaracion_fotografia();
