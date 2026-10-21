ALTER TABLE inscripciones ADD COLUMN sobrecupo_autorizado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inscripciones ADD CONSTRAINT uq_inscripcion_estudiante_club UNIQUE (estudiante_id, club_id);
ALTER TABLE inscripciones ADD CONSTRAINT uq_inscripciones_id_institucion UNIQUE (id, institucion_id);

CREATE FUNCTION fn_validar_autorizacion_inscripcion() RETURNS trigger AS $$
BEGIN
    IF NEW.estado = 'ACTIVA' AND NOT EXISTS (
        SELECT 1 FROM autorizaciones_estudiante a
        WHERE a.estudiante_id = NEW.estudiante_id
          AND a.tipo = 'PARTICIPACION'
          AND a.estado = 'OTORGADA'
    ) THEN
        RAISE EXCEPTION 'El estudiante no tiene la autorización de participación otorgada'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscripciones_autorizacion
    BEFORE INSERT OR UPDATE OF estado ON inscripciones
    FOR EACH ROW EXECUTE FUNCTION fn_validar_autorizacion_inscripcion();

CREATE FUNCTION fn_validar_cupo_club() RETURNS trigger AS $$
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
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscripciones_cupo
    BEFORE INSERT OR UPDATE OF estado, sobrecupo_autorizado ON inscripciones
    FOR EACH ROW EXECUTE FUNCTION fn_validar_cupo_club();

CREATE TABLE cursos (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id        BIGINT       NOT NULL,
    institucion_id BIGINT       NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    TEXT,
    nivel          VARCHAR(15)  NOT NULL,
    modalidad      VARCHAR(15)  NOT NULL,
    lugar          VARCHAR(150),
    enlace_virtual VARCHAR(300),
    fecha_inicio   DATE         NOT NULL,
    fecha_fin      DATE         NOT NULL,
    duracion_horas SMALLINT,
    cupo_maximo    INT          NOT NULL,
    estado         VARCHAR(15)  NOT NULL DEFAULT 'PLANIFICADO',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_cursos_club_institucion FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT uq_cursos_club_nombre UNIQUE (club_id, nombre),
    CONSTRAINT uq_cursos_id_club UNIQUE (id, club_id),
    CONSTRAINT ck_cursos_nivel CHECK (nivel IN ('PRINCIPIANTE','INTERMEDIO','AVANZADO')),
    CONSTRAINT ck_cursos_modalidad CHECK (modalidad IN ('ONLINE','PRESENCIAL','HIBRIDO')),
    CONSTRAINT ck_cursos_estado CHECK (estado IN ('PLANIFICADO','EN_CURSO','FINALIZADO','CANCELADO')),
    CONSTRAINT ck_cursos_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT ck_cursos_cupo CHECK (cupo_maximo > 0),
    CONSTRAINT ck_cursos_duracion CHECK (duracion_horas IS NULL OR duracion_horas > 0),
    CONSTRAINT ck_cursos_modalidad_datos CHECK (
        (modalidad = 'ONLINE' AND enlace_virtual IS NOT NULL)
        OR (modalidad = 'PRESENCIAL' AND lugar IS NOT NULL)
        OR (modalidad = 'HIBRIDO' AND lugar IS NOT NULL AND enlace_virtual IS NOT NULL)
    )
);

CREATE TABLE horarios (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curso_id    BIGINT      NOT NULL REFERENCES cursos (id),
    dia_semana  SMALLINT    NOT NULL,
    hora_inicio TIME        NOT NULL,
    hora_fin    TIME        NOT NULL,
    tipo_sesion VARCHAR(10) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_horarios_dia CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT ck_horarios_horas CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_horarios_tipo CHECK (tipo_sesion IN ('PRESENCIAL','VIRTUAL'))
);

CREATE FUNCTION fn_validar_horario() RETURNS trigger AS $$
DECLARE
    v_modalidad VARCHAR(15);
BEGIN
    SELECT modalidad INTO v_modalidad FROM cursos WHERE id = NEW.curso_id;
    IF (v_modalidad = 'ONLINE' AND NEW.tipo_sesion <> 'VIRTUAL')
       OR (v_modalidad = 'PRESENCIAL' AND NEW.tipo_sesion <> 'PRESENCIAL') THEN
        RAISE EXCEPTION 'El tipo de sesión no es compatible con la modalidad del curso'
            USING ERRCODE = 'check_violation';
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
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_horarios_validar
    BEFORE INSERT OR UPDATE ON horarios
    FOR EACH ROW EXECUTE FUNCTION fn_validar_horario();

CREATE TABLE inscripciones_curso (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estudiante_id BIGINT      NOT NULL,
    curso_id      BIGINT      NOT NULL,
    club_id       BIGINT      NOT NULL,
    fecha_ingreso DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin     DATE,
    estado        VARCHAR(15) NOT NULL DEFAULT 'ACTIVA',
    resultado     VARCHAR(15),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_inscripcion_curso UNIQUE (estudiante_id, curso_id),
    CONSTRAINT uq_inscurso_id_estudiante UNIQUE (id, estudiante_id),
    CONSTRAINT fk_inscurso_inscripcion_club FOREIGN KEY (estudiante_id, club_id)
        REFERENCES inscripciones (estudiante_id, club_id),
    CONSTRAINT fk_inscurso_curso_club FOREIGN KEY (curso_id, club_id)
        REFERENCES cursos (id, club_id),
    CONSTRAINT ck_inscurso_estado CHECK (estado IN ('ACTIVA','RETIRADA','FINALIZADA')),
    CONSTRAINT ck_inscurso_resultado CHECK (resultado IS NULL OR resultado IN ('APROBADO','NO_APROBADO')),
    CONSTRAINT ck_inscurso_resultado_estado CHECK (resultado IS NULL OR estado = 'FINALIZADA'),
    CONSTRAINT ck_inscurso_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_ingreso)
);

CREATE FUNCTION fn_validar_inscripcion_curso() RETURNS trigger AS $$
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
            USING ERRCODE = 'check_violation';
    END IF;
    SELECT cupo_maximo INTO v_cupo FROM cursos WHERE id = NEW.curso_id FOR UPDATE;
    SELECT count(*) INTO v_activas
    FROM inscripciones_curso ic
    WHERE ic.curso_id = NEW.curso_id
      AND ic.estado = 'ACTIVA'
      AND ic.id IS DISTINCT FROM NEW.id;
    IF v_activas >= v_cupo THEN
        RAISE EXCEPTION 'El curso alcanzó su cupo máximo de % participantes', v_cupo
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscripciones_curso_validar
    BEFORE INSERT OR UPDATE OF estado ON inscripciones_curso
    FOR EACH ROW EXECUTE FUNCTION fn_validar_inscripcion_curso();

CREATE TABLE solicitudes_inscripcion (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estudiante_id          BIGINT       NOT NULL,
    institucion_id         BIGINT       NOT NULL,
    club_id                BIGINT       NOT NULL,
    curso_id               BIGINT,
    nivel                  VARCHAR(15)  NOT NULL,
    experiencia_previa     TEXT,
    conocimientos          TEXT,
    motivacion             TEXT         NOT NULL,
    estado                 VARCHAR(15)  NOT NULL DEFAULT 'PENDIENTE',
    solicitado_por         BIGINT       NOT NULL REFERENCES usuarios (id),
    fecha_solicitud        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    revisado_por           BIGINT       REFERENCES usuarios (id),
    fecha_revision         TIMESTAMPTZ,
    resuelto_por           BIGINT       REFERENCES usuarios (id),
    fecha_resolucion       TIMESTAMPTZ,
    nivel_asignado         VARCHAR(15),
    observacion_resolucion VARCHAR(500),
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_solinsc_estudiante FOREIGN KEY (estudiante_id, institucion_id)
        REFERENCES estudiantes (id, institucion_id),
    CONSTRAINT fk_solinsc_club FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT fk_solinsc_curso FOREIGN KEY (curso_id, club_id)
        REFERENCES cursos (id, club_id),
    CONSTRAINT ck_solinsc_nivel CHECK (nivel IN ('PRINCIPIANTE','INTERMEDIO','AVANZADO')),
    CONSTRAINT ck_solinsc_nivel_asignado CHECK
        (nivel_asignado IS NULL OR nivel_asignado IN ('PRINCIPIANTE','INTERMEDIO','AVANZADO')),
    CONSTRAINT ck_solinsc_estado CHECK
        (estado IN ('PENDIENTE','EN_REVISION','APROBADA','RECHAZADA','CANCELADA')),
    CONSTRAINT ck_solinsc_formulario_nivel CHECK (
        nivel = 'PRINCIPIANTE'
        OR (nivel = 'INTERMEDIO' AND conocimientos IS NOT NULL)
        OR (nivel = 'AVANZADO' AND conocimientos IS NOT NULL AND experiencia_previa IS NOT NULL)
    ),
    CONSTRAINT ck_solinsc_resolucion CHECK
        (estado NOT IN ('APROBADA','RECHAZADA') OR (resuelto_por IS NOT NULL AND fecha_resolucion IS NOT NULL)),
    CONSTRAINT ck_solinsc_rechazo CHECK
        (estado <> 'RECHAZADA' OR observacion_resolucion IS NOT NULL),
    CONSTRAINT ck_solinsc_aprobacion CHECK
        (estado <> 'APROBADA' OR nivel_asignado IS NOT NULL)
);

CREATE UNIQUE INDEX ux_solinsc_abierta
    ON solicitudes_inscripcion (estudiante_id, club_id)
    WHERE estado IN ('PENDIENTE','EN_REVISION');

CREATE TABLE solicitudes_retiro (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inscripcion_id         BIGINT       NOT NULL,
    institucion_id         BIGINT       NOT NULL,
    motivo                 VARCHAR(500) NOT NULL,
    estado                 VARCHAR(15)  NOT NULL DEFAULT 'PENDIENTE',
    solicitado_por         BIGINT       NOT NULL REFERENCES usuarios (id),
    fecha_solicitud        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    resuelto_por           BIGINT       REFERENCES usuarios (id),
    fecha_resolucion       TIMESTAMPTZ,
    observacion_resolucion VARCHAR(500),
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_retiro_inscripcion FOREIGN KEY (inscripcion_id, institucion_id)
        REFERENCES inscripciones (id, institucion_id),
    CONSTRAINT ck_retiro_estado CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','CANCELADA')),
    CONSTRAINT ck_retiro_resolucion CHECK
        (estado NOT IN ('APROBADA','RECHAZADA') OR (resuelto_por IS NOT NULL AND fecha_resolucion IS NOT NULL)),
    CONSTRAINT ck_retiro_rechazo CHECK
        (estado <> 'RECHAZADA' OR observacion_resolucion IS NOT NULL)
);

CREATE UNIQUE INDEX ux_retiro_pendiente
    ON solicitudes_retiro (inscripcion_id)
    WHERE estado = 'PENDIENTE';

CREATE TABLE competencias (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    organizador VARCHAR(200),
    sitio_web   VARCHAR(200),
    activa      BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_competencias_nombre UNIQUE (nombre)
);

CREATE TABLE ediciones_competencia (
    id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    competencia_id INT          NOT NULL REFERENCES competencias (id),
    nombre         VARCHAR(100) NOT NULL,
    anio           SMALLINT     NOT NULL,
    fecha_inicio   DATE,
    fecha_fin      DATE,
    sede           VARCHAR(150),
    activa         BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_ediciones_nombre UNIQUE (competencia_id, nombre),
    CONSTRAINT uq_ediciones_id_competencia UNIQUE (id, competencia_id),
    CONSTRAINT ck_ediciones_anio CHECK (anio BETWEEN 2000 AND 2100),
    CONSTRAINT ck_ediciones_fechas CHECK
        (fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE categorias_competencia (
    id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    competencia_id INT          NOT NULL REFERENCES competencias (id),
    nivel          VARCHAR(10)  NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    VARCHAR(500),
    activa         BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_categorias_nombre UNIQUE (competencia_id, nivel, nombre),
    CONSTRAINT uq_categorias_id_competencia UNIQUE (id, competencia_id),
    CONSTRAINT ck_categorias_nivel CHECK (nivel IN ('BASICA','AVANZADA'))
);

CREATE TABLE participaciones_competencia (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estudiante_id  BIGINT       NOT NULL,
    institucion_id BIGINT       NOT NULL,
    club_id        BIGINT,
    competencia_id INT          NOT NULL,
    edicion_id     INT          NOT NULL,
    categoria_id   INT          NOT NULL,
    equipo_nombre  VARCHAR(150),
    puesto         SMALLINT,
    reconocimiento VARCHAR(100),
    observaciones  TEXT,
    registrado_por BIGINT       NOT NULL REFERENCES usuarios (id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_part_estudiante FOREIGN KEY (estudiante_id, institucion_id)
        REFERENCES estudiantes (id, institucion_id),
    CONSTRAINT fk_part_club FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT fk_part_edicion FOREIGN KEY (edicion_id, competencia_id)
        REFERENCES ediciones_competencia (id, competencia_id),
    CONSTRAINT fk_part_categoria FOREIGN KEY (categoria_id, competencia_id)
        REFERENCES categorias_competencia (id, competencia_id),
    CONSTRAINT uq_part_estudiante_edicion_categoria UNIQUE (estudiante_id, edicion_id, categoria_id),
    CONSTRAINT uq_part_id_estudiante UNIQUE (id, estudiante_id),
    CONSTRAINT ck_part_puesto CHECK (puesto IS NULL OR puesto > 0)
);

CREATE TABLE certificados (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_verificacion  VARCHAR(24)  NOT NULL,
    estudiante_id        BIGINT       NOT NULL,
    institucion_id       BIGINT       NOT NULL,
    tipo                 VARCHAR(30)  NOT NULL,
    inscripcion_curso_id BIGINT,
    participacion_id     BIGINT,
    titulo               VARCHAR(200) NOT NULL,
    fecha_emision        DATE         NOT NULL DEFAULT CURRENT_DATE,
    emitido_por          BIGINT       NOT NULL REFERENCES usuarios (id),
    estado               VARCHAR(10)  NOT NULL DEFAULT 'EMITIDO',
    anulado_por          BIGINT       REFERENCES usuarios (id),
    fecha_anulacion      TIMESTAMPTZ,
    motivo_anulacion     VARCHAR(500),
    archivo_ruta         VARCHAR(500),
    archivo_hash         VARCHAR(64),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_certificados_codigo UNIQUE (codigo_verificacion),
    CONSTRAINT fk_cert_estudiante FOREIGN KEY (estudiante_id, institucion_id)
        REFERENCES estudiantes (id, institucion_id),
    CONSTRAINT fk_cert_inscripcion_curso FOREIGN KEY (inscripcion_curso_id, estudiante_id)
        REFERENCES inscripciones_curso (id, estudiante_id),
    CONSTRAINT fk_cert_participacion FOREIGN KEY (participacion_id, estudiante_id)
        REFERENCES participaciones_competencia (id, estudiante_id),
    CONSTRAINT ck_cert_tipo CHECK (tipo IN
        ('PARTICIPACION_CURSO','APROBACION_CURSO','PARTICIPACION_COMPETENCIA','RECONOCIMIENTO_COMPETENCIA')),
    CONSTRAINT ck_cert_estado CHECK (estado IN ('EMITIDO','ANULADO')),
    CONSTRAINT ck_cert_origen CHECK (
        (tipo IN ('PARTICIPACION_CURSO','APROBACION_CURSO')
            AND inscripcion_curso_id IS NOT NULL AND participacion_id IS NULL)
        OR (tipo IN ('PARTICIPACION_COMPETENCIA','RECONOCIMIENTO_COMPETENCIA')
            AND participacion_id IS NOT NULL AND inscripcion_curso_id IS NULL)
    ),
    CONSTRAINT ck_cert_anulacion CHECK (
        estado <> 'ANULADO'
        OR (anulado_por IS NOT NULL AND fecha_anulacion IS NOT NULL AND motivo_anulacion IS NOT NULL)
    )
);

CREATE UNIQUE INDEX ux_cert_curso_vigente
    ON certificados (tipo, inscripcion_curso_id)
    WHERE estado = 'EMITIDO' AND inscripcion_curso_id IS NOT NULL;

CREATE UNIQUE INDEX ux_cert_competencia_vigente
    ON certificados (tipo, participacion_id)
    WHERE estado = 'EMITIDO' AND participacion_id IS NOT NULL;

CREATE INDEX ix_cursos_club ON cursos (club_id);
CREATE INDEX ix_horarios_curso ON horarios (curso_id);
CREATE INDEX ix_inscurso_curso ON inscripciones_curso (curso_id);
CREATE INDEX ix_inscurso_club ON inscripciones_curso (club_id);
CREATE INDEX ix_solinsc_estudiante ON solicitudes_inscripcion (estudiante_id);
CREATE INDEX ix_solinsc_club ON solicitudes_inscripcion (club_id);
CREATE INDEX ix_solinsc_estado ON solicitudes_inscripcion (estado);
CREATE INDEX ix_retiro_inscripcion ON solicitudes_retiro (inscripcion_id);
CREATE INDEX ix_retiro_estado ON solicitudes_retiro (estado);
CREATE INDEX ix_part_edicion ON participaciones_competencia (edicion_id);
CREATE INDEX ix_part_categoria ON participaciones_competencia (categoria_id);
CREATE INDEX ix_cert_estudiante ON certificados (estudiante_id);
CREATE INDEX ix_cert_tipo ON certificados (tipo);

INSERT INTO competencias (nombre, organizador, sitio_web)
VALUES ('Killtronic', 'Universidad Politécnica Salesiana, Sede Guayaquil', 'https://killtronic.ups.edu.ec');

INSERT INTO categorias_competencia (competencia_id, nivel, nombre)
SELECT c.id, v.nivel, v.nombre
FROM competencias c
CROSS JOIN (VALUES
    ('BASICA', 'Seguidor de línea LEGO'),
    ('BASICA', 'Seguidor de línea Makeblock'),
    ('BASICA', 'Seguidor de línea Amateur'),
    ('BASICA', 'Sumo LEGO'),
    ('BASICA', 'Sumo Makeblock'),
    ('BASICA', 'Mini sumo RC Amateur'),
    ('BASICA', 'Mini sumo autónomo Amateur'),
    ('BASICA', 'Batalla simulada'),
    ('BASICA', 'Soccer Junior'),
    ('BASICA', 'Hackaton Tinkercad'),
    ('BASICA', 'Hackaton Scratch'),
    ('BASICA', 'Skill soldadura'),
    ('BASICA', 'Impacto tecnológico'),
    ('AVANZADA', 'Seguidor de línea sin turbina'),
    ('AVANZADA', 'Seguidor de línea destreza'),
    ('AVANZADA', 'Seguidor de línea con turbina'),
    ('AVANZADA', 'Robot bailarín'),
    ('AVANZADA', 'Carrera de humanoides'),
    ('AVANZADA', 'Pelea de humanoides'),
    ('AVANZADA', 'Dron destreza'),
    ('AVANZADA', 'Carrera de balance'),
    ('AVANZADA', 'Trepador'),
    ('AVANZADA', 'Laberinto'),
    ('AVANZADA', 'Soccer'),
    ('AVANZADA', 'Carrera de insectos'),
    ('AVANZADA', 'Minisumo autónomo'),
    ('AVANZADA', 'Minisumo RC'),
    ('AVANZADA', 'Microsumo'),
    ('AVANZADA', 'Batalla 1/2 libra'),
    ('AVANZADA', 'Batalla 1 libra'),
    ('AVANZADA', 'Batalla 3 libras'),
    ('AVANZADA', 'Batalla 12 libras'),
    ('AVANZADA', 'Programación industrial')
) AS v(nivel, nombre)
WHERE c.nombre = 'Killtronic';