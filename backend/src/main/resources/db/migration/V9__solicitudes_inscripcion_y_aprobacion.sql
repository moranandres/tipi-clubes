ALTER TABLE inscripciones
    ADD CONSTRAINT uq_inscripciones_id_estudiante_club UNIQUE (id, estudiante_id, club_id);

ALTER TABLE inscripciones_curso
    ADD CONSTRAINT uq_inscurso_id_estudiante_curso UNIQUE (id, estudiante_id, curso_id);

ALTER TABLE solicitudes_inscripcion
    ADD COLUMN curso_asignado_id    BIGINT,
    ADD COLUMN inscripcion_id       BIGINT,
    ADD COLUMN inscripcion_curso_id BIGINT,
    ADD COLUMN sobrecupo_autorizado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE solicitudes_inscripcion
    ADD CONSTRAINT fk_solinsc_curso_asignado FOREIGN KEY (curso_asignado_id, club_id)
        REFERENCES cursos (id, club_id),
    ADD CONSTRAINT fk_solinsc_inscripcion FOREIGN KEY (inscripcion_id, estudiante_id, club_id)
        REFERENCES inscripciones (id, estudiante_id, club_id),
    ADD CONSTRAINT fk_solinsc_inscripcion_curso FOREIGN KEY (inscripcion_curso_id, estudiante_id, curso_asignado_id)
        REFERENCES inscripciones_curso (id, estudiante_id, curso_id);

ALTER TABLE solicitudes_inscripcion
    DROP CONSTRAINT ck_solinsc_formulario_nivel,
    DROP CONSTRAINT ck_solinsc_aprobacion;

ALTER TABLE solicitudes_inscripcion
    ADD CONSTRAINT ck_solinsc_motivacion CHECK (btrim(motivacion) <> ''),
    ADD CONSTRAINT ck_solinsc_formulario_nivel CHECK (
        nivel = 'PRINCIPIANTE'
        OR (nivel = 'INTERMEDIO' AND btrim(coalesce(conocimientos, '')) <> '')
        OR (nivel = 'AVANZADO' AND btrim(coalesce(conocimientos, '')) <> ''
            AND btrim(coalesce(experiencia_previa, '')) <> '')
    ),
    ADD CONSTRAINT ck_solinsc_revision CHECK (
        estado <> 'EN_REVISION' OR (revisado_por IS NOT NULL AND fecha_revision IS NOT NULL)
    ),
    ADD CONSTRAINT ck_solinsc_aprobacion CHECK (
        estado <> 'APROBADA'
        OR (nivel_asignado IS NOT NULL AND inscripcion_id IS NOT NULL
            AND (curso_asignado_id IS NULL) = (inscripcion_curso_id IS NULL))
    ),
    ADD CONSTRAINT ck_solinsc_vinculos_aprobada CHECK (
        estado = 'APROBADA'
        OR (inscripcion_id IS NULL AND inscripcion_curso_id IS NULL AND curso_asignado_id IS NULL
            AND NOT sobrecupo_autorizado)
    ),
    ADD CONSTRAINT ck_solinsc_cancelacion CHECK (
        estado <> 'CANCELADA'
        OR (resuelto_por IS NOT NULL AND fecha_resolucion IS NOT NULL AND observacion_resolucion IS NOT NULL)
    );

CREATE FUNCTION fn_cruce_horario_estudiante(p_estudiante_id BIGINT, p_curso_id BIGINT) RETURNS TEXT AS $$
DECLARE
    v_cruce TEXT;
BEGIN
    SELECT format('«%s» (%s %s-%s)', otro.nombre,
                  (ARRAY['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'])[h2.dia_semana],
                  to_char(h2.hora_inicio, 'HH24:MI'), to_char(h2.hora_fin, 'HH24:MI'))
    INTO v_cruce
    FROM cursos actual
    JOIN horarios h1 ON h1.curso_id = actual.id
    JOIN inscripciones_curso ic
      ON ic.estudiante_id = p_estudiante_id
     AND ic.estado = 'ACTIVA'
     AND ic.curso_id <> actual.id
    JOIN cursos otro
      ON otro.id = ic.curso_id
     AND otro.estado IN ('PLANIFICADO', 'EN_CURSO')
     AND otro.fecha_inicio <= actual.fecha_fin
     AND actual.fecha_inicio <= otro.fecha_fin
    JOIN horarios h2
      ON h2.curso_id = otro.id
     AND h2.dia_semana = h1.dia_semana
     AND h2.hora_inicio < h1.hora_fin
     AND h1.hora_inicio < h2.hora_fin
    WHERE actual.id = p_curso_id
    ORDER BY h2.dia_semana, h2.hora_inicio
    LIMIT 1;
    RETURN v_cruce;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE FUNCTION fn_verificar_cruces_inscritos(p_curso_id BIGINT) RETURNS VOID AS $$
DECLARE
    v_codigo VARCHAR(20);
    v_cruce TEXT;
BEGIN
    SELECT e.codigo_interno, fn_cruce_horario_estudiante(ic.estudiante_id, p_curso_id)
    INTO v_codigo, v_cruce
    FROM inscripciones_curso ic
    JOIN estudiantes e ON e.id = ic.estudiante_id
    WHERE ic.curso_id = p_curso_id
      AND ic.estado = 'ACTIVA'
      AND fn_cruce_horario_estudiante(ic.estudiante_id, p_curso_id) IS NOT NULL
    ORDER BY e.codigo_interno
    LIMIT 1;
    IF v_codigo IS NOT NULL THEN
        RAISE EXCEPTION 'El cambio produce un cruce de horario para el estudiante %, que también está inscrito en el curso %',
            v_codigo, v_cruce
            USING ERRCODE = '23TP1';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_validar_apertura_inscripcion() RETURNS trigger AS $$
DECLARE
    v_estado_estudiante VARCHAR(15);
    v_estado_club VARCHAR(15);
BEGIN
    IF NEW.estado <> 'ACTIVA' OR (TG_OP = 'UPDATE' AND OLD.estado = 'ACTIVA') THEN
        RETURN NEW;
    END IF;
    SELECT estado INTO v_estado_estudiante FROM estudiantes WHERE id = NEW.estudiante_id;
    IF v_estado_estudiante <> 'ACTIVO' THEN
        RAISE EXCEPTION 'El estudiante está en estado % y no puede inscribirse en clubes', v_estado_estudiante
            USING ERRCODE = '23TP1';
    END IF;
    SELECT estado INTO v_estado_club FROM clubes WHERE id = NEW.club_id;
    IF v_estado_club NOT IN ('PLANIFICADO', 'ACTIVO') THEN
        RAISE EXCEPTION 'El club está en estado % y no admite nuevas inscripciones', v_estado_club
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscripciones_apertura
    BEFORE INSERT OR UPDATE OF estado ON inscripciones
    FOR EACH ROW EXECUTE FUNCTION fn_validar_apertura_inscripcion();

CREATE OR REPLACE FUNCTION fn_validar_inscripcion_curso() RETURNS trigger AS $$
DECLARE
    v_cupo INT;
    v_activas BIGINT;
    v_estado_curso VARCHAR(15);
    v_nombre_curso VARCHAR(150);
    v_cruce TEXT;
BEGIN
    IF NEW.estado <> 'ACTIVA' OR (TG_OP = 'UPDATE' AND OLD.estado = 'ACTIVA') THEN
        RETURN NEW;
    END IF;
    PERFORM 1 FROM estudiantes WHERE id = NEW.estudiante_id FOR UPDATE;
    SELECT estado, nombre INTO v_estado_curso, v_nombre_curso FROM cursos WHERE id = NEW.curso_id;
    IF v_estado_curso NOT IN ('PLANIFICADO', 'EN_CURSO') THEN
        RAISE EXCEPTION 'El curso «%» está en estado % y no admite nuevas inscripciones', v_nombre_curso, v_estado_curso
            USING ERRCODE = '23TP1';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM inscripciones i
        WHERE i.estudiante_id = NEW.estudiante_id
          AND i.club_id = NEW.club_id
          AND i.estado = 'ACTIVA'
    ) THEN
        RAISE EXCEPTION 'El estudiante debe tener una inscripción activa en el club del curso'
            USING ERRCODE = '23TP1';
    END IF;
    SELECT cupo_maximo INTO v_cupo FROM cursos WHERE id = NEW.curso_id FOR UPDATE;
    SELECT count(*) INTO v_activas
    FROM inscripciones_curso ic
    WHERE ic.curso_id = NEW.curso_id
      AND ic.estado = 'ACTIVA'
      AND ic.id IS DISTINCT FROM NEW.id;
    IF v_activas >= v_cupo THEN
        RAISE EXCEPTION 'El curso alcanzó su cupo máximo de % participantes', v_cupo
            USING ERRCODE = '23TP1';
    END IF;
    v_cruce := fn_cruce_horario_estudiante(NEW.estudiante_id, NEW.curso_id);
    IF v_cruce IS NOT NULL THEN
        RAISE EXCEPTION 'El horario del curso «%» se cruza con el curso % en el que el estudiante ya está inscrito',
            v_nombre_curso, v_cruce
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_validar_cruces_por_horario() RETURNS trigger AS $$
BEGIN
    PERFORM fn_verificar_cruces_inscritos(NEW.curso_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_horarios_cruces_inscritos
    AFTER INSERT OR UPDATE ON horarios
    FOR EACH ROW EXECUTE FUNCTION fn_validar_cruces_por_horario();

CREATE FUNCTION fn_validar_cruces_por_fechas() RETURNS trigger AS $$
BEGIN
    IF NEW.fecha_inicio <> OLD.fecha_inicio OR NEW.fecha_fin <> OLD.fecha_fin THEN
        PERFORM fn_verificar_cruces_inscritos(NEW.id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cursos_cruces_inscritos
    AFTER UPDATE OF fecha_inicio, fecha_fin ON cursos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_cruces_por_fechas();

CREATE FUNCTION fn_validar_solicitud_inscripcion() RETURNS trigger AS $$
DECLARE
    v_estado_estudiante VARCHAR(15);
    v_estado_club VARCHAR(15);
    v_estado_curso VARCHAR(15);
    v_nivel_curso VARCHAR(15);
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.estado <> 'PENDIENTE' THEN
            RAISE EXCEPTION 'Toda solicitud de inscripción se registra en estado PENDIENTE'
                USING ERRCODE = '23TP1';
        END IF;
        SELECT estado INTO v_estado_estudiante FROM estudiantes WHERE id = NEW.estudiante_id;
        IF v_estado_estudiante <> 'ACTIVO' THEN
            RAISE EXCEPTION 'Solo se registran solicitudes de estudiantes activos; el estudiante está en estado %',
                v_estado_estudiante
                USING ERRCODE = '23TP1';
        END IF;
        SELECT estado INTO v_estado_club FROM clubes WHERE id = NEW.club_id;
        IF v_estado_club NOT IN ('PLANIFICADO', 'ACTIVO') THEN
            RAISE EXCEPTION 'El club está en estado % y no recibe solicitudes de inscripción', v_estado_club
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.curso_id IS NOT NULL THEN
            SELECT estado INTO v_estado_curso FROM cursos WHERE id = NEW.curso_id;
            IF v_estado_curso NOT IN ('PLANIFICADO', 'EN_CURSO') THEN
                RAISE EXCEPTION 'El curso está en estado % y no recibe solicitudes de inscripción', v_estado_curso
                    USING ERRCODE = '23TP1';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.estado IN ('APROBADA', 'RECHAZADA', 'CANCELADA') THEN
        RAISE EXCEPTION 'La solicitud ya está en estado % y no se puede modificar', OLD.estado
            USING ERRCODE = '23TP1';
    END IF;

    IF (NEW.estudiante_id, NEW.institucion_id, NEW.club_id, NEW.curso_id, NEW.nivel, NEW.experiencia_previa,
        NEW.conocimientos, NEW.motivacion, NEW.solicitado_por, NEW.fecha_solicitud)
       IS DISTINCT FROM
       (OLD.estudiante_id, OLD.institucion_id, OLD.club_id, OLD.curso_id, OLD.nivel, OLD.experiencia_previa,
        OLD.conocimientos, OLD.motivacion, OLD.solicitado_por, OLD.fecha_solicitud) THEN
        RAISE EXCEPTION 'Los datos del formulario no se pueden modificar. Cancele la solicitud y registre una nueva'
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado <> OLD.estado AND NOT (
        (OLD.estado = 'PENDIENTE' AND NEW.estado IN ('EN_REVISION', 'CANCELADA'))
        OR (OLD.estado = 'EN_REVISION' AND NEW.estado IN ('APROBADA', 'RECHAZADA', 'CANCELADA'))
    ) THEN
        RAISE EXCEPTION 'Transición de estado no permitida: % -> %', OLD.estado, NEW.estado
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado = 'EN_REVISION' AND NEW.revisado_por = NEW.solicitado_por THEN
        RAISE EXCEPTION 'Quien registró la solicitud no puede tomarla en revisión'
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado IN ('APROBADA', 'RECHAZADA') AND NEW.resuelto_por = NEW.solicitado_por THEN
        RAISE EXCEPTION 'Quien registró la solicitud no puede aprobarla ni rechazarla'
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado = 'APROBADA' THEN
        IF NOT EXISTS (
            SELECT 1 FROM inscripciones i WHERE i.id = NEW.inscripcion_id AND i.estado = 'ACTIVA'
        ) THEN
            RAISE EXCEPTION 'La aprobación requiere una inscripción activa del estudiante en el club'
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.curso_asignado_id IS NOT NULL THEN
            SELECT nivel INTO v_nivel_curso FROM cursos WHERE id = NEW.curso_asignado_id;
            IF v_nivel_curso <> NEW.nivel_asignado THEN
                RAISE EXCEPTION 'El curso asignado es de nivel % y no coincide con el nivel asignado al estudiante (%)',
                    v_nivel_curso, NEW.nivel_asignado
                    USING ERRCODE = '23TP1';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM inscripciones_curso ic
                WHERE ic.id = NEW.inscripcion_curso_id AND ic.estado = 'ACTIVA'
            ) THEN
                RAISE EXCEPTION 'La aprobación requiere una inscripción activa del estudiante en el curso asignado'
                    USING ERRCODE = '23TP1';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_solicitudes_inscripcion_validar
    BEFORE INSERT OR UPDATE ON solicitudes_inscripcion
    FOR EACH ROW EXECUTE FUNCTION fn_validar_solicitud_inscripcion();

CREATE INDEX ix_solinsc_institucion ON solicitudes_inscripcion (institucion_id);
CREATE INDEX ix_solinsc_curso ON solicitudes_inscripcion (curso_id);
CREATE INDEX ix_solinsc_solicitado_por ON solicitudes_inscripcion (solicitado_por);
CREATE INDEX ix_inscurso_estudiante ON inscripciones_curso (estudiante_id);
