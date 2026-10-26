CREATE OR REPLACE FUNCTION fn_validar_institucion_usuario() RETURNS trigger AS $$
DECLARE
    v_codigo VARCHAR(30);
BEGIN
    SELECT codigo INTO v_codigo FROM roles WHERE id = NEW.rol_id;
    IF v_codigo IN ('RESP_INSTITUCIONAL', 'DOCENTE') AND NEW.institucion_id IS NULL THEN
        RAISE EXCEPTION 'El rol % requiere una institución asignada', v_codigo
            USING ERRCODE = '23TP1';
    END IF;
    IF v_codigo IN ('ADMIN', 'COORDINADOR', 'CONSULTA') AND NEW.institucion_id IS NOT NULL THEN
        RAISE EXCEPTION 'El rol % no debe tener institución asignada', v_codigo
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validar_usuario_docente() RETURNS trigger AS $$
DECLARE
    v_codigo VARCHAR(30);
    v_institucion BIGINT;
BEGIN
    IF NEW.usuario_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT r.codigo, u.institucion_id INTO v_codigo, v_institucion
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = NEW.usuario_id;
    IF v_codigo IS DISTINCT FROM 'DOCENTE' OR v_institucion IS DISTINCT FROM NEW.institucion_id THEN
        RAISE EXCEPTION 'El usuario vinculado debe tener rol DOCENTE y pertenecer a la misma institución del docente'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validar_autorizacion_inscripcion() RETURNS trigger AS $$
BEGIN
    IF NEW.estado = 'ACTIVA' AND NOT EXISTS (
        SELECT 1 FROM autorizaciones_estudiante a
        WHERE a.estudiante_id = NEW.estudiante_id
          AND a.tipo = 'PARTICIPACION'
          AND a.estado = 'OTORGADA'
    ) THEN
        RAISE EXCEPTION 'El estudiante no tiene la autorización de participación otorgada'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validar_cupo_club() RETURNS trigger AS $$
DECLARE
    v_cupo INT;
    v_activas BIGINT;
BEGIN
    IF NEW.estado <> 'ACTIVA' OR NEW.sobrecupo_autorizado THEN
        RETURN NEW;
    END IF;
    SELECT cupo_maximo INTO v_cupo FROM clubes WHERE id = NEW.club_id FOR UPDATE;
    SELECT count(*) INTO v_activas
    FROM inscripciones i
    WHERE i.club_id = NEW.club_id
      AND i.estado = 'ACTIVA'
      AND i.id IS DISTINCT FROM NEW.id;
    IF v_activas >= v_cupo THEN
        RAISE EXCEPTION 'El club alcanzó su cupo máximo de % integrantes', v_cupo
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validar_inscripcion_curso() RETURNS trigger AS $$
DECLARE
    v_cupo INT;
    v_activas BIGINT;
BEGIN
    IF NEW.estado <> 'ACTIVA' THEN
        RETURN NEW;
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validar_horario() RETURNS trigger AS $$
DECLARE
    v_modalidad VARCHAR(15);
    v_estado VARCHAR(15);
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT estado INTO v_estado FROM cursos WHERE id = OLD.curso_id;
        IF v_estado NOT IN ('PLANIFICADO', 'EN_CURSO') THEN
            RAISE EXCEPTION 'No se pueden modificar los horarios de un curso finalizado o cancelado'
                USING ERRCODE = '23TP1';
        END IF;
        IF v_estado = 'EN_CURSO' AND NOT EXISTS (
            SELECT 1 FROM horarios h WHERE h.curso_id = OLD.curso_id AND h.id <> OLD.id
        ) THEN
            RAISE EXCEPTION 'Un curso en marcha debe conservar al menos un horario'
                USING ERRCODE = '23TP1';
        END IF;
        RETURN OLD;
    END IF;

    SELECT modalidad, estado INTO v_modalidad, v_estado FROM cursos WHERE id = NEW.curso_id;
    IF v_estado NOT IN ('PLANIFICADO', 'EN_CURSO') THEN
        RAISE EXCEPTION 'No se pueden modificar los horarios de un curso finalizado o cancelado'
            USING ERRCODE = '23TP1';
    END IF;
    IF (v_modalidad = 'ONLINE' AND NEW.tipo_sesion <> 'VIRTUAL')
       OR (v_modalidad = 'PRESENCIAL' AND NEW.tipo_sesion <> 'PRESENCIAL') THEN
        RAISE EXCEPTION 'El tipo de sesión no es compatible con la modalidad del curso'
            USING ERRCODE = '23TP1';
    END IF;
    IF EXISTS (
        SELECT 1 FROM horarios h
        WHERE h.curso_id = NEW.curso_id
          AND h.dia_semana = NEW.dia_semana
          AND h.id IS DISTINCT FROM NEW.id
          AND h.hora_inicio < NEW.hora_fin
          AND NEW.hora_inicio < h.hora_fin
    ) THEN
        RAISE EXCEPTION 'El horario se cruza con otro horario del mismo curso'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER trg_horarios_validar ON horarios;
CREATE TRIGGER trg_horarios_validar
    BEFORE INSERT OR UPDATE OR DELETE ON horarios
    FOR EACH ROW EXECUTE FUNCTION fn_validar_horario();

CREATE FUNCTION fn_validar_curso() RETURNS trigger AS $$
DECLARE
    v_estado_club VARCHAR(15);
    v_cupo_club INT;
    v_inicio DATE;
    v_fin DATE;
BEGIN
    SELECT c.estado, c.cupo_maximo, p.fecha_inicio, p.fecha_fin
    INTO v_estado_club, v_cupo_club, v_inicio, v_fin
    FROM clubes c
    JOIN periodos_academicos p ON p.id = c.periodo_id
    WHERE c.id = NEW.club_id;

    IF TG_OP = 'INSERT' AND v_estado_club = 'CERRADO' THEN
        RAISE EXCEPTION 'No se pueden crear cursos en un club cerrado'
            USING ERRCODE = '23TP1';
    END IF;

    IF (TG_OP = 'INSERT' OR NEW.fecha_inicio <> OLD.fecha_inicio OR NEW.fecha_fin <> OLD.fecha_fin)
       AND (NEW.fecha_inicio < v_inicio OR NEW.fecha_fin > v_fin) THEN
        RAISE EXCEPTION 'Las fechas del curso deben estar dentro del período académico del club (% a %)',
            to_char(v_inicio, 'DD/MM/YYYY'), to_char(v_fin, 'DD/MM/YYYY')
            USING ERRCODE = '23TP1';
    END IF;

    IF (TG_OP = 'INSERT' OR NEW.cupo_maximo <> OLD.cupo_maximo) AND NEW.cupo_maximo > v_cupo_club THEN
        RAISE EXCEPTION 'El cupo del curso (%) no puede superar el cupo del club (%)', NEW.cupo_maximo, v_cupo_club
            USING ERRCODE = '23TP1';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.modalidad <> OLD.modalidad AND EXISTS (
        SELECT 1 FROM horarios h
        WHERE h.curso_id = NEW.id
          AND ((NEW.modalidad = 'ONLINE' AND h.tipo_sesion <> 'VIRTUAL')
            OR (NEW.modalidad = 'PRESENCIAL' AND h.tipo_sesion <> 'PRESENCIAL'))
    ) THEN
        RAISE EXCEPTION 'La nueva modalidad no es compatible con los horarios registrados del curso. Elimine o cambie esos horarios primero'
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado = 'EN_CURSO' AND (TG_OP = 'INSERT' OR OLD.estado <> 'EN_CURSO') THEN
        IF v_estado_club <> 'ACTIVO' THEN
            RAISE EXCEPTION 'Solo se puede iniciar un curso cuando su club está activo'
                USING ERRCODE = '23TP1';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM horarios h WHERE h.curso_id = NEW.id) THEN
            RAISE EXCEPTION 'El curso necesita al menos un horario para iniciar'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cursos_validar
    BEFORE INSERT OR UPDATE ON cursos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_curso();

CREATE FUNCTION fn_validar_club_cursos() RETURNS trigger AS $$
BEGIN
    IF NEW.estado = 'CERRADO' AND OLD.estado <> 'CERRADO' AND EXISTS (
        SELECT 1 FROM cursos WHERE club_id = NEW.id AND estado IN ('PLANIFICADO', 'EN_CURSO')
    ) THEN
        RAISE EXCEPTION 'El club tiene cursos planificados o en curso. Finalícelos o cancélelos antes de cerrar el club'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.cupo_maximo < OLD.cupo_maximo AND EXISTS (
        SELECT 1 FROM cursos
        WHERE club_id = NEW.id AND estado IN ('PLANIFICADO', 'EN_CURSO') AND cupo_maximo > NEW.cupo_maximo
    ) THEN
        RAISE EXCEPTION 'El club tiene cursos con un cupo mayor que el nuevo cupo del club. Reduzca primero el cupo de esos cursos'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clubes_cursos
    BEFORE UPDATE OF estado, cupo_maximo ON clubes
    FOR EACH ROW EXECUTE FUNCTION fn_validar_club_cursos();

CREATE INDEX ix_cursos_estado ON cursos (estado);