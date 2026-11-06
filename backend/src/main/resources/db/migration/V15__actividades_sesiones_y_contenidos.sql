CREATE FUNCTION fn_hoy_guayaquil() RETURNS DATE AS $$
    SELECT (now() AT TIME ZONE 'America/Guayaquil')::date;
$$ LANGUAGE sql STABLE;

CREATE TABLE catalogo_contenidos (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo        VARCHAR(15)  NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_contenidos_tipo CHECK (tipo IN ('HERRAMIENTA', 'LENGUAJE', 'COMPONENTE', 'COMPETENCIA')),
    CONSTRAINT ck_contenidos_nombre CHECK (btrim(nombre) <> '')
);

CREATE UNIQUE INDEX ux_contenidos_tipo_nombre ON catalogo_contenidos (tipo, lower(nombre));

CREATE TABLE actividades (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id                  BIGINT       NOT NULL,
    institucion_id           BIGINT       NOT NULL,
    curso_id                 BIGINT,
    responsable_id           BIGINT       NOT NULL,
    fecha                    DATE         NOT NULL,
    hora_inicio              TIME         NOT NULL,
    hora_fin                 TIME         NOT NULL,
    tema                     VARCHAR(200) NOT NULL,
    objetivo                 TEXT         NOT NULL,
    descripcion              TEXT,
    lugar                    VARCHAR(150),
    estado                   VARCHAR(15)  NOT NULL DEFAULT 'PLANIFICADA',
    resumen_ejecucion        TEXT,
    observaciones            TEXT,
    ejecutada_por            BIGINT       REFERENCES usuarios (id),
    fecha_registro_ejecucion TIMESTAMPTZ,
    motivo_cancelacion       VARCHAR(500),
    cancelada_por            BIGINT       REFERENCES usuarios (id),
    fecha_cancelacion        TIMESTAMPTZ,
    creado_por               BIGINT       NOT NULL REFERENCES usuarios (id),
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_actividades_club FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT fk_actividades_curso FOREIGN KEY (curso_id, club_id)
        REFERENCES cursos (id, club_id),
    CONSTRAINT fk_actividades_responsable FOREIGN KEY (responsable_id, institucion_id)
        REFERENCES docentes (id, institucion_id),
    CONSTRAINT uq_actividades_id_club UNIQUE (id, club_id),
    CONSTRAINT ck_actividades_estado CHECK (estado IN ('PLANIFICADA', 'EJECUTADA', 'CANCELADA')),
    CONSTRAINT ck_actividades_horas CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_actividades_duracion CHECK (hora_fin - hora_inicio <= INTERVAL '8 hours'),
    CONSTRAINT ck_actividades_textos CHECK (btrim(tema) <> '' AND btrim(objetivo) <> ''),
    CONSTRAINT ck_actividades_ejecucion CHECK (
        (estado = 'EJECUTADA' AND resumen_ejecucion IS NOT NULL AND btrim(resumen_ejecucion) <> ''
            AND ejecutada_por IS NOT NULL AND fecha_registro_ejecucion IS NOT NULL)
        OR (estado <> 'EJECUTADA' AND resumen_ejecucion IS NULL AND ejecutada_por IS NULL
            AND fecha_registro_ejecucion IS NULL)
    ),
    CONSTRAINT ck_actividades_cancelacion CHECK (
        (estado = 'CANCELADA' AND motivo_cancelacion IS NOT NULL AND btrim(motivo_cancelacion) <> ''
            AND fecha_cancelacion IS NOT NULL)
        OR (estado <> 'CANCELADA' AND motivo_cancelacion IS NULL AND cancelada_por IS NULL
            AND fecha_cancelacion IS NULL)
    )
);

CREATE TABLE actividad_contenidos (
    actividad_id BIGINT NOT NULL REFERENCES actividades (id) ON DELETE CASCADE,
    contenido_id INT    NOT NULL REFERENCES catalogo_contenidos (id),
    CONSTRAINT pk_actividad_contenidos PRIMARY KEY (actividad_id, contenido_id)
);

CREATE INDEX ix_actividades_club_fecha ON actividades (club_id, fecha);
CREATE INDEX ix_actividades_institucion_fecha ON actividades (institucion_id, fecha);
CREATE INDEX ix_actividades_curso ON actividades (curso_id);
CREATE INDEX ix_actividades_responsable_fecha ON actividades (responsable_id, fecha);
CREATE INDEX ix_actividades_estado ON actividades (estado);
CREATE INDEX ix_actividad_contenidos_contenido ON actividad_contenidos (contenido_id);

CREATE FUNCTION fn_validar_actividad() RETURNS trigger AS $$
DECLARE
    v_club_estado VARCHAR(15);
    v_periodo_inicio DATE;
    v_periodo_fin DATE;
    v_curso_nombre VARCHAR(150);
    v_curso_estado VARCHAR(15);
    v_curso_inicio DATE;
    v_curso_fin DATE;
    v_docente_activo BOOLEAN;
    v_cruce TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.estado = 'CANCELADA' THEN
        RAISE EXCEPTION 'La actividad «%» está cancelada y ya no se modifica', OLD.tema
            USING ERRCODE = '23TP1';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.estado = 'EJECUTADA' THEN
        IF NEW.estado <> 'EJECUTADA' THEN
            RAISE EXCEPTION 'La actividad «%» ya fue ejecutada y no puede pasar a %', OLD.tema, NEW.estado
                USING ERRCODE = '23TP1';
        END IF;
        IF (NEW.club_id, NEW.curso_id, NEW.responsable_id, NEW.fecha, NEW.hora_inicio, NEW.hora_fin,
            NEW.tema, NEW.objetivo, NEW.descripcion, NEW.lugar)
           IS DISTINCT FROM
           (OLD.club_id, OLD.curso_id, OLD.responsable_id, OLD.fecha, OLD.hora_inicio, OLD.hora_fin,
            OLD.tema, OLD.objetivo, OLD.descripcion, OLD.lugar) THEN
            RAISE EXCEPTION 'La actividad «%» ya fue ejecutada; solo se pueden corregir los datos de su ejecución',
                OLD.tema
                USING ERRCODE = '23TP1';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.estado <> 'PLANIFICADA' THEN
        RAISE EXCEPTION 'Toda actividad se registra primero como planificada'
            USING ERRCODE = '23TP1';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.club_id <> OLD.club_id THEN
        RAISE EXCEPTION 'Una actividad no puede cambiar de club'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT c.estado, p.fecha_inicio, p.fecha_fin
    INTO v_club_estado, v_periodo_inicio, v_periodo_fin
    FROM clubes c
    JOIN periodos_academicos p ON p.id = c.periodo_id
    WHERE c.id = NEW.club_id;

    IF NEW.estado = 'PLANIFICADA' THEN
        IF v_club_estado NOT IN ('PLANIFICADO', 'ACTIVO') THEN
            RAISE EXCEPTION 'El club está en estado % y no admite programar ni modificar actividades', v_club_estado
                USING ERRCODE = '23TP1';
        END IF;

        IF TG_OP = 'INSERT'
           OR (NEW.fecha, NEW.hora_inicio, NEW.hora_fin, NEW.curso_id, NEW.responsable_id)
              IS DISTINCT FROM (OLD.fecha, OLD.hora_inicio, OLD.hora_fin, OLD.curso_id, OLD.responsable_id) THEN

            IF NEW.fecha < v_periodo_inicio OR NEW.fecha > v_periodo_fin THEN
                RAISE EXCEPTION 'La fecha de la actividad debe estar dentro del período académico del club (% a %)',
                    to_char(v_periodo_inicio, 'DD/MM/YYYY'), to_char(v_periodo_fin, 'DD/MM/YYYY')
                    USING ERRCODE = '23TP1';
            END IF;

            IF NEW.curso_id IS NOT NULL THEN
                SELECT nombre, estado, fecha_inicio, fecha_fin
                INTO v_curso_nombre, v_curso_estado, v_curso_inicio, v_curso_fin
                FROM cursos
                WHERE id = NEW.curso_id;
                IF v_curso_estado NOT IN ('PLANIFICADO', 'EN_CURSO') THEN
                    RAISE EXCEPTION 'El curso «%» está en estado % y no admite actividades', v_curso_nombre, v_curso_estado
                        USING ERRCODE = '23TP1';
                END IF;
                IF NEW.fecha < v_curso_inicio OR NEW.fecha > v_curso_fin THEN
                    RAISE EXCEPTION 'La fecha de la actividad debe estar dentro de las fechas del curso «%» (% a %)',
                        v_curso_nombre, to_char(v_curso_inicio, 'DD/MM/YYYY'), to_char(v_curso_fin, 'DD/MM/YYYY')
                        USING ERRCODE = '23TP1';
                END IF;
            END IF;

            SELECT activo INTO v_docente_activo
            FROM docentes
            WHERE id = NEW.responsable_id
            FOR NO KEY UPDATE;
            IF NOT v_docente_activo THEN
                RAISE EXCEPTION 'El docente responsable de la actividad está inactivo'
                    USING ERRCODE = '23TP1';
            END IF;

            SELECT format('«%s» de %s a %s', a.tema, to_char(a.hora_inicio, 'HH24:MI'), to_char(a.hora_fin, 'HH24:MI'))
            INTO v_cruce
            FROM actividades a
            WHERE a.responsable_id = NEW.responsable_id
              AND a.fecha = NEW.fecha
              AND a.estado <> 'CANCELADA'
              AND a.id IS DISTINCT FROM NEW.id
              AND a.hora_inicio < NEW.hora_fin
              AND NEW.hora_inicio < a.hora_fin
            ORDER BY a.hora_inicio
            LIMIT 1;
            IF v_cruce IS NOT NULL THEN
                RAISE EXCEPTION 'El docente responsable ya tiene la actividad % el %; los horarios se cruzan',
                    v_cruce, to_char(NEW.fecha, 'DD/MM/YYYY')
                    USING ERRCODE = '23TP1';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.estado = 'EJECUTADA' THEN
        IF v_club_estado <> 'ACTIVO' THEN
            RAISE EXCEPTION 'Solo se registra la ejecución de actividades de un club activo; el club está en estado %',
                v_club_estado
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.fecha > fn_hoy_guayaquil() THEN
            RAISE EXCEPTION 'La actividad está programada para el % y no puede registrarse como ejecutada antes de esa fecha',
                to_char(NEW.fecha, 'DD/MM/YYYY')
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.curso_id IS NOT NULL THEN
            SELECT nombre, estado INTO v_curso_nombre, v_curso_estado FROM cursos WHERE id = NEW.curso_id;
            IF v_curso_estado <> 'EN_CURSO' THEN
                RAISE EXCEPTION 'El curso «%» está en estado %; solo se registra la ejecución de actividades de cursos en marcha',
                    v_curso_nombre, v_curso_estado
                    USING ERRCODE = '23TP1';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actividades_validar
    BEFORE INSERT OR UPDATE ON actividades
    FOR EACH ROW EXECUTE FUNCTION fn_validar_actividad();

CREATE FUNCTION fn_validar_borrado_actividad() RETURNS trigger AS $$
BEGIN
    IF OLD.estado <> 'PLANIFICADA' THEN
        RAISE EXCEPTION 'La actividad «%» está % y forma parte del historial del club; no se elimina',
            OLD.tema, CASE OLD.estado WHEN 'EJECUTADA' THEN 'ejecutada' ELSE 'cancelada' END
            USING ERRCODE = '23TP1';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actividades_borrado
    BEFORE DELETE ON actividades
    FOR EACH ROW EXECUTE FUNCTION fn_validar_borrado_actividad();

CREATE FUNCTION fn_validar_contenido_actividad() RETURNS trigger AS $$
DECLARE
    v_estado VARCHAR(15);
    v_tema VARCHAR(200);
    v_activo BOOLEAN;
    v_nombre VARCHAR(100);
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT estado, tema INTO v_estado, v_tema FROM actividades WHERE id = OLD.actividad_id;
    ELSE
        SELECT estado, tema INTO v_estado, v_tema FROM actividades WHERE id = NEW.actividad_id;
    END IF;
    IF v_estado = 'CANCELADA' THEN
        RAISE EXCEPTION 'La actividad «%» está cancelada y sus contenidos ya no se modifican', v_tema
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'INSERT' THEN
        SELECT activo, nombre INTO v_activo, v_nombre FROM catalogo_contenidos WHERE id = NEW.contenido_id;
        IF NOT v_activo THEN
            RAISE EXCEPTION 'El contenido «%» está inactivo en el catálogo y no se puede asignar a una actividad', v_nombre
                USING ERRCODE = '23TP1';
        END IF;
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actividad_contenidos_validar
    BEFORE INSERT OR DELETE ON actividad_contenidos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_contenido_actividad();

CREATE FUNCTION fn_impedir_cambio_contenido_actividad() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Los contenidos de una actividad no se editan; se quitan o se agregan'
        USING ERRCODE = '23TP1';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actividad_contenidos_sin_edicion
    BEFORE UPDATE ON actividad_contenidos
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_cambio_contenido_actividad();

CREATE FUNCTION fn_validar_actividades_planificadas() RETURNS trigger AS $$
DECLARE
    v_total BIGINT;
    v_lista TEXT;
BEGIN
    IF TG_TABLE_NAME = 'clubes' THEN
        SELECT count(*) INTO v_total
        FROM actividades a
        WHERE a.club_id = NEW.id AND a.estado = 'PLANIFICADA';
        SELECT string_agg(format('«%s» (%s)', x.tema, to_char(x.fecha, 'DD/MM/YYYY')), ', ' ORDER BY x.fecha, x.hora_inicio)
        INTO v_lista
        FROM (
            SELECT a.tema, a.fecha, a.hora_inicio
            FROM actividades a
            WHERE a.club_id = NEW.id AND a.estado = 'PLANIFICADA'
            ORDER BY a.fecha, a.hora_inicio
            LIMIT 5
        ) x;
    ELSE
        SELECT count(*) INTO v_total
        FROM actividades a
        WHERE a.curso_id = NEW.id AND a.estado = 'PLANIFICADA';
        SELECT string_agg(format('«%s» (%s)', x.tema, to_char(x.fecha, 'DD/MM/YYYY')), ', ' ORDER BY x.fecha, x.hora_inicio)
        INTO v_lista
        FROM (
            SELECT a.tema, a.fecha, a.hora_inicio
            FROM actividades a
            WHERE a.curso_id = NEW.id AND a.estado = 'PLANIFICADA'
            ORDER BY a.fecha, a.hora_inicio
            LIMIT 5
        ) x;
    END IF;
    IF v_total > 0 THEN
        IF v_total > 5 THEN
            v_lista := v_lista || ' y ' || (v_total - 5) || ' más';
        END IF;
        RAISE EXCEPTION '% tiene actividades planificadas pendientes (%): %. Registre su ejecución o cancélelas antes de %',
            TG_ARGV[0], v_total, v_lista, TG_ARGV[1]
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clubes_actividades_planificadas
    BEFORE UPDATE OF estado ON clubes
    FOR EACH ROW
    WHEN (NEW.estado = 'CERRADO' AND OLD.estado IS DISTINCT FROM 'CERRADO')
    EXECUTE FUNCTION fn_validar_actividades_planificadas('El club', 'cerrar el club');

CREATE TRIGGER trg_cursos_actividades_planificadas
    BEFORE UPDATE OF estado ON cursos
    FOR EACH ROW
    WHEN (NEW.estado IN ('FINALIZADO', 'CANCELADO') AND OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION fn_validar_actividades_planificadas('El curso', 'finalizarlo o cancelarlo');

CREATE OR REPLACE FUNCTION fn_validar_borrado_curso() RETURNS trigger AS $$
BEGIN
    IF OLD.estado <> 'PLANIFICADO' THEN
        RAISE EXCEPTION 'El curso «%» está en estado % y forma parte del historial; solo se eliminan cursos planificados, cancélelo en su lugar',
            OLD.nombre, OLD.estado
            USING ERRCODE = '23TP1';
    END IF;
    IF EXISTS (SELECT 1 FROM inscripciones_curso ic WHERE ic.curso_id = OLD.id)
       OR EXISTS (
           SELECT 1 FROM solicitudes_inscripcion s
           WHERE s.curso_id = OLD.id OR s.curso_asignado_id = OLD.id
       )
       OR EXISTS (SELECT 1 FROM actividades a WHERE a.curso_id = OLD.id) THEN
        RAISE EXCEPTION 'El curso «%» tiene inscripciones, solicitudes o actividades registradas y forma parte del historial; cancélelo en su lugar',
            OLD.nombre
            USING ERRCODE = '23TP1';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

INSERT INTO catalogo_contenidos (tipo, nombre, descripcion) VALUES
    ('HERRAMIENTA', 'Scratch', 'Entorno de programación por bloques del MIT'),
    ('HERRAMIENTA', 'mBlock', 'Programación por bloques y Python para robots Makeblock y Arduino'),
    ('HERRAMIENTA', 'Tinkercad', 'Diseño 3D y simulación de circuitos en línea'),
    ('HERRAMIENTA', 'Arduino IDE', 'Entorno para programar placas Arduino'),
    ('HERRAMIENTA', 'LEGO Education SPIKE', 'Aplicación para programar kits LEGO Education'),
    ('HERRAMIENTA', 'MakeCode', 'Editor de Microsoft para micro:bit y otras placas'),
    ('HERRAMIENTA', 'Thonny', 'Editor de Python para principiantes'),
    ('LENGUAJE', 'Programación por bloques', 'Scratch, mBlock, MakeCode o similares'),
    ('LENGUAJE', 'Python', NULL),
    ('LENGUAJE', 'C++ para Arduino', NULL),
    ('LENGUAJE', 'JavaScript', NULL),
    ('COMPONENTE', 'Placa Arduino UNO', NULL),
    ('COMPONENTE', 'Sensor ultrasónico', NULL),
    ('COMPONENTE', 'Sensor infrarrojo', NULL),
    ('COMPONENTE', 'Servomotor', NULL),
    ('COMPONENTE', 'Motor DC', NULL),
    ('COMPONENTE', 'Protoboard y cables', NULL),
    ('COMPONENTE', 'LED y resistencias', NULL),
    ('COMPONENTE', 'Kit LEGO', NULL),
    ('COMPONENTE', 'Kit Makeblock (mBot)', NULL),
    ('COMPONENTE', 'Robot metálico', NULL),
    ('COMPETENCIA', 'Pensamiento computacional', 'Descomponer problemas, reconocer patrones y diseñar algoritmos'),
    ('COMPETENCIA', 'Programación de secuencias y ciclos', NULL),
    ('COMPETENCIA', 'Electrónica básica', NULL),
    ('COMPETENCIA', 'Mecánica y ensamblaje', NULL),
    ('COMPETENCIA', 'Resolución de problemas', NULL),
    ('COMPETENCIA', 'Trabajo en equipo', NULL),
    ('COMPETENCIA', 'Creatividad e innovación', NULL),
    ('COMPETENCIA', 'Comunicación de resultados', NULL);
