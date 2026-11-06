CREATE TABLE asistencias (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actividad_id      BIGINT       NOT NULL,
    club_id           BIGINT       NOT NULL,
    estudiante_id     BIGINT       NOT NULL,
    inscripcion_id    BIGINT       NOT NULL,
    estado            VARCHAR(12)  NOT NULL,
    observacion       VARCHAR(500),
    registrado_por    BIGINT       NOT NULL REFERENCES usuarios (id),
    fecha_registro    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    corregido_por     BIGINT       REFERENCES usuarios (id),
    fecha_correccion  TIMESTAMPTZ,
    motivo_correccion VARCHAR(500),
    CONSTRAINT fk_asistencias_actividad FOREIGN KEY (actividad_id, club_id)
        REFERENCES actividades (id, club_id),
    CONSTRAINT fk_asistencias_inscripcion FOREIGN KEY (inscripcion_id, estudiante_id, club_id)
        REFERENCES inscripciones (id, estudiante_id, club_id),
    CONSTRAINT uq_asistencias_actividad_estudiante UNIQUE (actividad_id, estudiante_id),
    CONSTRAINT ck_asistencias_estado CHECK (estado IN ('PRESENTE', 'AUSENTE', 'ATRASADO', 'JUSTIFICADO')),
    CONSTRAINT ck_asistencias_observacion CHECK (observacion IS NULL OR btrim(observacion) <> ''),
    CONSTRAINT ck_asistencias_justificacion CHECK (estado <> 'JUSTIFICADO' OR observacion IS NOT NULL),
    CONSTRAINT ck_asistencias_correccion CHECK (
        (corregido_por IS NULL AND fecha_correccion IS NULL AND motivo_correccion IS NULL)
        OR (corregido_por IS NOT NULL AND fecha_correccion IS NOT NULL AND motivo_correccion IS NOT NULL
            AND btrim(motivo_correccion) <> '')
    )
);

CREATE INDEX ix_asistencias_club ON asistencias (club_id);
CREATE INDEX ix_asistencias_estudiante ON asistencias (estudiante_id);
CREATE INDEX ix_asistencias_inscripcion ON asistencias (inscripcion_id);

CREATE TABLE asistencia_correcciones (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asistencia_id        BIGINT       NOT NULL REFERENCES asistencias (id),
    estado_anterior      VARCHAR(12)  NOT NULL,
    estado_nuevo         VARCHAR(12)  NOT NULL,
    observacion_anterior VARCHAR(500),
    observacion_nueva    VARCHAR(500),
    motivo               VARCHAR(500) NOT NULL,
    corregido_por        BIGINT       NOT NULL REFERENCES usuarios (id),
    fecha                TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_correcciones_estados CHECK (
        estado_anterior IN ('PRESENTE', 'AUSENTE', 'ATRASADO', 'JUSTIFICADO')
        AND estado_nuevo IN ('PRESENTE', 'AUSENTE', 'ATRASADO', 'JUSTIFICADO')
    ),
    CONSTRAINT ck_correcciones_motivo CHECK (btrim(motivo) <> '')
);

CREATE INDEX ix_asistencia_correcciones_asistencia ON asistencia_correcciones (asistencia_id, fecha);

CREATE FUNCTION fn_validar_asistencia() RETURNS trigger AS $$
DECLARE
    v_actividad_estado VARCHAR(15);
    v_fecha DATE;
    v_tema VARCHAR(200);
    v_curso_id BIGINT;
    v_club_estado VARCHAR(15);
    v_curso_nombre VARCHAR(150);
    v_curso_estado VARCHAR(15);
    v_ingreso DATE;
    v_retiro DATE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.actividad_id, NEW.club_id, NEW.estudiante_id, NEW.inscripcion_id, NEW.registrado_por, NEW.fecha_registro)
           IS DISTINCT FROM
           (OLD.actividad_id, OLD.club_id, OLD.estudiante_id, OLD.inscripcion_id, OLD.registrado_por, OLD.fecha_registro) THEN
            RAISE EXCEPTION 'Una asistencia registrada no cambia de sesión, de estudiante ni de autor; solo se corrige su estado u observación'
                USING ERRCODE = '23TP1';
        END IF;
        IF (NEW.estado, NEW.observacion) IS NOT DISTINCT FROM (OLD.estado, OLD.observacion) THEN
            IF (NEW.corregido_por, NEW.fecha_correccion, NEW.motivo_correccion)
               IS DISTINCT FROM (OLD.corregido_por, OLD.fecha_correccion, OLD.motivo_correccion) THEN
                RAISE EXCEPTION 'Una corrección de asistencia debe cambiar el estado o la observación'
                    USING ERRCODE = '23TP1';
            END IF;
            RETURN NEW;
        END IF;
        IF NEW.corregido_por IS NULL OR NEW.motivo_correccion IS NULL OR btrim(NEW.motivo_correccion) = ''
           OR NEW.fecha_correccion IS NULL
           OR NEW.fecha_correccion IS NOT DISTINCT FROM OLD.fecha_correccion THEN
            RAISE EXCEPTION 'Toda corrección de una asistencia registrada debe indicar quién la corrige, cuándo y por qué'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' AND (NEW.corregido_por IS NOT NULL OR NEW.fecha_correccion IS NOT NULL
                             OR NEW.motivo_correccion IS NOT NULL) THEN
        RAISE EXCEPTION 'Una asistencia nueva no puede registrarse como corregida'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT a.estado, a.fecha, a.tema, a.curso_id
    INTO v_actividad_estado, v_fecha, v_tema, v_curso_id
    FROM actividades a
    WHERE a.id = NEW.actividad_id;

    IF v_actividad_estado <> 'EJECUTADA' THEN
        RAISE EXCEPTION 'La asistencia solo se registra en sesiones ejecutadas; la actividad «%» está %',
            v_tema, CASE v_actividad_estado WHEN 'PLANIFICADA' THEN 'planificada' ELSE 'cancelada' END
            USING ERRCODE = '23TP1';
    END IF;

    SELECT estado INTO v_club_estado FROM clubes WHERE id = NEW.club_id;
    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; su asistencia forma parte del historial y ya no se modifica'
            USING ERRCODE = '23TP1';
    END IF;

    IF v_curso_id IS NOT NULL THEN
        SELECT nombre, estado INTO v_curso_nombre, v_curso_estado FROM cursos WHERE id = v_curso_id;
        IF v_curso_estado IN ('FINALIZADO', 'CANCELADO') THEN
            RAISE EXCEPTION 'El curso «%» está % y su asistencia ya no se modifica',
                v_curso_nombre, CASE v_curso_estado WHEN 'FINALIZADO' THEN 'finalizado' ELSE 'cancelado' END
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT fecha_ingreso, fecha_retiro INTO v_ingreso, v_retiro
        FROM inscripciones
        WHERE id = NEW.inscripcion_id;
        IF v_ingreso > v_fecha OR (v_retiro IS NOT NULL AND v_retiro < v_fecha) THEN
            RAISE EXCEPTION 'El estudiante no era integrante del club el % (fecha de la sesión «%»)',
                to_char(v_fecha, 'DD/MM/YYYY'), v_tema
                USING ERRCODE = '23TP1';
        END IF;
        IF v_curso_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM inscripciones_curso ic
            WHERE ic.curso_id = v_curso_id
              AND ic.estudiante_id = NEW.estudiante_id
              AND ic.fecha_ingreso <= v_fecha
              AND (ic.fecha_fin IS NULL OR ic.fecha_fin >= v_fecha)
        ) THEN
            RAISE EXCEPTION 'El estudiante no estaba inscrito en el curso «%» el % (fecha de la sesión «%»)',
                v_curso_nombre, to_char(v_fecha, 'DD/MM/YYYY'), v_tema
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asistencias_validar
    BEFORE INSERT OR UPDATE ON asistencias
    FOR EACH ROW EXECUTE FUNCTION fn_validar_asistencia();

CREATE FUNCTION fn_registrar_correccion_asistencia() RETURNS trigger AS $$
BEGIN
    INSERT INTO asistencia_correcciones (asistencia_id, estado_anterior, estado_nuevo, observacion_anterior,
                                         observacion_nueva, motivo, corregido_por, fecha)
    VALUES (NEW.id, OLD.estado, NEW.estado, OLD.observacion, NEW.observacion, NEW.motivo_correccion,
            NEW.corregido_por, NEW.fecha_correccion);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asistencias_correccion
    AFTER UPDATE ON asistencias
    FOR EACH ROW
    WHEN ((NEW.estado, NEW.observacion) IS DISTINCT FROM (OLD.estado, OLD.observacion))
    EXECUTE FUNCTION fn_registrar_correccion_asistencia();

CREATE TRIGGER trg_asistencias_sin_borrado
    BEFORE DELETE ON asistencias
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'La asistencia registrada forma parte del historial de la sesión y no se elimina; corrija su estado en su lugar');

CREATE TRIGGER trg_asistencia_correcciones_sin_borrado
    BEFORE DELETE ON asistencia_correcciones
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'El historial de correcciones de asistencia no se elimina');

CREATE TRIGGER trg_asistencia_correcciones_sin_edicion
    BEFORE UPDATE ON asistencia_correcciones
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'El historial de correcciones de asistencia no se modifica');
