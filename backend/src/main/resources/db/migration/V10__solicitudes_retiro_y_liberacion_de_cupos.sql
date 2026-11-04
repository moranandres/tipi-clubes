UPDATE inscripciones SET fecha_retiro = fecha_ingreso WHERE estado <> 'ACTIVA' AND fecha_retiro IS NULL;
UPDATE inscripciones SET fecha_retiro = NULL WHERE estado = 'ACTIVA' AND fecha_retiro IS NOT NULL;
UPDATE inscripciones_curso SET fecha_fin = fecha_ingreso WHERE estado <> 'ACTIVA' AND fecha_fin IS NULL;
UPDATE inscripciones_curso SET fecha_fin = NULL WHERE estado = 'ACTIVA' AND fecha_fin IS NOT NULL;

ALTER TABLE inscripciones
    ADD CONSTRAINT ck_insc_fecha_retiro_estado CHECK ((estado = 'ACTIVA') = (fecha_retiro IS NULL));

ALTER TABLE inscripciones_curso
    ADD CONSTRAINT ck_inscurso_fecha_fin_estado CHECK ((estado = 'ACTIVA') = (fecha_fin IS NULL));

ALTER TABLE solicitudes_retiro ADD COLUMN fecha_retiro DATE;

ALTER TABLE solicitudes_retiro
    ADD CONSTRAINT ck_retiro_motivo CHECK (btrim(motivo) <> ''),
    ADD CONSTRAINT ck_retiro_pendiente CHECK (
        estado <> 'PENDIENTE'
        OR (resuelto_por IS NULL AND fecha_resolucion IS NULL AND observacion_resolucion IS NULL)
    ),
    ADD CONSTRAINT ck_retiro_cancelacion CHECK (
        estado <> 'CANCELADA'
        OR (resuelto_por IS NOT NULL AND fecha_resolucion IS NOT NULL AND observacion_resolucion IS NOT NULL)
    ),
    ADD CONSTRAINT ck_retiro_fecha_retiro CHECK ((estado = 'APROBADA') = (fecha_retiro IS NOT NULL));

CREATE TABLE solicitudes_retiro_cursos (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_retiro_id  BIGINT      NOT NULL REFERENCES solicitudes_retiro (id),
    inscripcion_curso_id BIGINT      NOT NULL REFERENCES inscripciones_curso (id),
    fecha_fin            DATE        NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_retiro_curso UNIQUE (solicitud_retiro_id, inscripcion_curso_id)
);

CREATE FUNCTION fn_validar_salida_inscripcion() RETURNS trigger AS $$
BEGIN
    IF OLD.estado <> 'ACTIVA' OR NEW.estado = 'ACTIVA' THEN
        RETURN NEW;
    END IF;
    IF EXISTS (
        SELECT 1 FROM inscripciones_curso ic
        WHERE ic.estudiante_id = NEW.estudiante_id
          AND ic.club_id = NEW.club_id
          AND ic.estado = 'ACTIVA'
    ) THEN
        RAISE EXCEPTION 'El estudiante conserva inscripciones activas en cursos del club; deben cerrarse antes de su salida del club'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.estado = 'RETIRADA' AND NOT EXISTS (
        SELECT 1 FROM solicitudes_retiro r
        WHERE r.inscripcion_id = NEW.id
          AND r.estado = 'PENDIENTE'
    ) THEN
        RAISE EXCEPTION 'El retiro de un estudiante de un club solo se registra al aprobar su solicitud de retiro'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscripciones_salida
    BEFORE UPDATE OF estado ON inscripciones
    FOR EACH ROW EXECUTE FUNCTION fn_validar_salida_inscripcion();

CREATE FUNCTION fn_validar_solicitud_retiro() RETURNS trigger AS $$
DECLARE
    v_estado_inscripcion VARCHAR(15);
    v_fecha_retiro DATE;
    v_estudiante_id BIGINT;
    v_club_id BIGINT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las solicitudes de retiro forman parte del historial y no se eliminan; cancélela en su lugar'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT estado, fecha_retiro, estudiante_id, club_id
    INTO v_estado_inscripcion, v_fecha_retiro, v_estudiante_id, v_club_id
    FROM inscripciones
    WHERE id = NEW.inscripcion_id;

    IF TG_OP = 'INSERT' THEN
        IF NEW.estado <> 'PENDIENTE' THEN
            RAISE EXCEPTION 'Toda solicitud de retiro se registra en estado PENDIENTE'
                USING ERRCODE = '23TP1';
        END IF;
        IF v_estado_inscripcion <> 'ACTIVA' THEN
            RAISE EXCEPTION 'Solo se puede solicitar el retiro de una inscripción activa; la inscripción está en estado %',
                v_estado_inscripcion
                USING ERRCODE = '23TP1';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'La solicitud de retiro ya está en estado % y no se puede modificar', OLD.estado
            USING ERRCODE = '23TP1';
    END IF;

    IF (NEW.inscripcion_id, NEW.institucion_id, NEW.motivo, NEW.solicitado_por, NEW.fecha_solicitud)
       IS DISTINCT FROM
       (OLD.inscripcion_id, OLD.institucion_id, OLD.motivo, OLD.solicitado_por, OLD.fecha_solicitud) THEN
        RAISE EXCEPTION 'Los datos de la solicitud de retiro no se pueden modificar. Cancélela y registre una nueva'
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado IN ('APROBADA', 'RECHAZADA') AND NEW.resuelto_por = NEW.solicitado_por THEN
        RAISE EXCEPTION 'Quien registró la solicitud de retiro no puede aprobarla ni rechazarla'
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado = 'APROBADA' THEN
        IF v_estado_inscripcion <> 'RETIRADA' OR v_fecha_retiro IS DISTINCT FROM NEW.fecha_retiro THEN
            RAISE EXCEPTION 'La aprobación requiere que la inscripción del estudiante en el club quede RETIRADA con la misma fecha de retiro'
                USING ERRCODE = '23TP1';
        END IF;
        IF EXISTS (
            SELECT 1 FROM inscripciones_curso ic
            WHERE ic.estudiante_id = v_estudiante_id
              AND ic.club_id = v_club_id
              AND ic.estado = 'ACTIVA'
        ) THEN
            RAISE EXCEPTION 'La aprobación requiere que el estudiante no conserve inscripciones activas en los cursos del club'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_solicitudes_retiro_validar
    BEFORE INSERT OR UPDATE OR DELETE ON solicitudes_retiro
    FOR EACH ROW EXECUTE FUNCTION fn_validar_solicitud_retiro();

CREATE FUNCTION fn_validar_retiro_curso() RETURNS trigger AS $$
DECLARE
    v_estado_solicitud VARCHAR(15);
    v_estudiante_id BIGINT;
    v_club_id BIGINT;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'El detalle de cursos de una solicitud de retiro forma parte del historial y no se modifica'
            USING ERRCODE = '23TP1';
    END IF;
    SELECT r.estado, i.estudiante_id, i.club_id
    INTO v_estado_solicitud, v_estudiante_id, v_club_id
    FROM solicitudes_retiro r
    JOIN inscripciones i ON i.id = r.inscripcion_id
    WHERE r.id = NEW.solicitud_retiro_id;
    IF v_estado_solicitud <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'Solo se registran cursos retirados mientras la solicitud de retiro está PENDIENTE'
            USING ERRCODE = '23TP1';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM inscripciones_curso ic
        WHERE ic.id = NEW.inscripcion_curso_id
          AND ic.estudiante_id = v_estudiante_id
          AND ic.club_id = v_club_id
          AND ic.estado = 'RETIRADA'
          AND ic.fecha_fin = NEW.fecha_fin
    ) THEN
        RAISE EXCEPTION 'El curso registrado en el retiro debe ser del mismo estudiante y club, y estar RETIRADO con la misma fecha'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_solicitudes_retiro_cursos_validar
    BEFORE INSERT OR UPDATE OR DELETE ON solicitudes_retiro_cursos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_retiro_curso();

CREATE INDEX ix_retiro_institucion ON solicitudes_retiro (institucion_id);
CREATE INDEX ix_retiro_solicitado_por ON solicitudes_retiro (solicitado_por);
CREATE INDEX ix_retiro_cursos_inscripcion_curso ON solicitudes_retiro_cursos (inscripcion_curso_id);
