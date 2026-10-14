-- =====================================================================
-- V1: Modelo inicial TIPI 3.0 (Fase 1 y Fase 2)
-- =====================================================================

-- ---------- ROLES ----------
CREATE TABLE roles (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo      VARCHAR(30)  NOT NULL,
    nombre      VARCHAR(80)  NOT NULL,
    descripcion VARCHAR(255),
    CONSTRAINT uq_roles_codigo UNIQUE (codigo),
    CONSTRAINT ck_roles_codigo CHECK (codigo IN
        ('ADMIN','COORDINADOR','RESP_INSTITUCIONAL','DOCENTE','CONSULTA'))
);

INSERT INTO roles (codigo, nombre, descripcion) VALUES
 ('ADMIN','Administrador del sistema','Gestiona usuarios, roles, catálogos, parámetros y respaldos'),
 ('COORDINADOR','Coordinador TIPI 3.0','Consulta todas las instituciones, supervisa clubes y genera reportes generales'),
 ('RESP_INSTITUCIONAL','Responsable institucional','Gestiona la información de su institución y sus clubes'),
 ('DOCENTE','Docente coordinador del club','Gestiona estudiantes, asistencia, actividades y evidencias de su club'),
 ('CONSULTA','Consulta / auditoría','Consulta información y reportes autorizados sin modificar registros');

-- ---------- INSTITUCIONES ----------
CREATE TABLE instituciones (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_amie      VARCHAR(10)  NOT NULL,
    nombre           VARCHAR(200) NOT NULL,
    zona             VARCHAR(30),
    circuito         VARCHAR(80),
    provincia        VARCHAR(80)  NOT NULL,
    canton           VARCHAR(80)  NOT NULL,
    direccion        VARCHAR(255),
    telefono         VARCHAR(30),
    correo_contacto  VARCHAR(150),
    autoridad_nombre VARCHAR(150),
    autoridad_cargo  VARCHAR(80),
    estado_adhesion  VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    fecha_adhesion   DATE,
    responsable_id   BIGINT,  -- FK a usuarios (se agrega más abajo)
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_instituciones_amie UNIQUE (codigo_amie),
    CONSTRAINT ck_instituciones_amie_formato CHECK (codigo_amie ~ '^[0-9]{2}[A-Z][0-9]{5}$'),
    CONSTRAINT ck_instituciones_estado CHECK (estado_adhesion IN
        ('PENDIENTE','ADHERIDA','SUSPENDIDA','RETIRADA')),
    CONSTRAINT ck_instituciones_fecha_adhesion CHECK
        (estado_adhesion <> 'ADHERIDA' OR fecha_adhesion IS NOT NULL)
);

-- ---------- USUARIOS ----------
CREATE TABLE usuarios (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username          VARCHAR(50)  NOT NULL,
    email             VARCHAR(150) NOT NULL,
    password_hash     VARCHAR(100) NOT NULL,
    nombres           VARCHAR(100) NOT NULL,
    apellidos         VARCHAR(100) NOT NULL,
    rol_id            INT          NOT NULL REFERENCES roles(id),
    institucion_id    BIGINT       REFERENCES instituciones(id),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    intentos_fallidos INT          NOT NULL DEFAULT 0,
    bloqueado_hasta   TIMESTAMPTZ,
    ultimo_acceso     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuarios_username CHECK (username !~ '[@\s]'),
    CONSTRAINT ck_usuarios_intentos CHECK (intentos_fallidos >= 0)
);
CREATE UNIQUE INDEX ux_usuarios_username ON usuarios (lower(username));
CREATE UNIQUE INDEX ux_usuarios_email    ON usuarios (lower(email));
CREATE INDEX ix_usuarios_rol         ON usuarios (rol_id);
CREATE INDEX ix_usuarios_institucion ON usuarios (institucion_id);

ALTER TABLE instituciones
    ADD CONSTRAINT fk_instituciones_responsable
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id);

-- ---------- PERÍODOS ACADÉMICOS ----------
CREATE TABLE periodos_academicos (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(50) NOT NULL,
    fecha_inicio DATE        NOT NULL,
    fecha_fin    DATE        NOT NULL,
    activo       BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_periodos_nombre UNIQUE (nombre),
    CONSTRAINT ck_periodos_fechas CHECK (fecha_fin > fecha_inicio)
);
-- Solo puede existir un período activo a la vez
CREATE UNIQUE INDEX ux_periodo_unico_activo ON periodos_academicos (activo) WHERE activo;

-- ---------- DOCENTES ----------
CREATE TABLE docentes (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institucion_id BIGINT       NOT NULL REFERENCES instituciones(id),
    usuario_id     BIGINT       REFERENCES usuarios(id),
    nombres        VARCHAR(100) NOT NULL,
    apellidos      VARCHAR(100) NOT NULL,
    correo         VARCHAR(150),
    telefono       VARCHAR(30),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_docentes_usuario UNIQUE (usuario_id),
    CONSTRAINT uq_docentes_id_institucion UNIQUE (id, institucion_id)
);
CREATE INDEX ix_docentes_institucion ON docentes (institucion_id);

-- ---------- CLUBES ----------
CREATE TABLE clubes (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institucion_id BIGINT       NOT NULL REFERENCES instituciones(id),
    periodo_id     INT          NOT NULL REFERENCES periodos_academicos(id),
    docente_id     BIGINT       NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    objetivo       TEXT         NOT NULL,
    fecha_creacion DATE         NOT NULL DEFAULT CURRENT_DATE,
    dia_semana     SMALLINT,
    hora_inicio    TIME,
    hora_fin       TIME,
    lugar          VARCHAR(150),
    cupo_maximo    INT          NOT NULL,
    estado         VARCHAR(15)  NOT NULL DEFAULT 'PLANIFICADO',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- El docente responsable debe pertenecer a la MISMA institución del club
    CONSTRAINT fk_clubes_docente_misma_inst FOREIGN KEY (docente_id, institucion_id)
        REFERENCES docentes (id, institucion_id),
    CONSTRAINT uq_clubes_nombre UNIQUE (institucion_id, periodo_id, nombre),
    CONSTRAINT uq_clubes_id_institucion UNIQUE (id, institucion_id),
    CONSTRAINT uq_clubes_id_periodo UNIQUE (id, periodo_id),
    CONSTRAINT ck_clubes_cupo CHECK (cupo_maximo > 0),
    CONSTRAINT ck_clubes_estado CHECK (estado IN ('PLANIFICADO','ACTIVO','SUSPENDIDO','CERRADO')),
    CONSTRAINT ck_clubes_dia CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT ck_clubes_horario CHECK (hora_inicio IS NULL OR hora_fin IS NULL OR hora_fin > hora_inicio)
);
CREATE INDEX ix_clubes_institucion ON clubes (institucion_id);
CREATE INDEX ix_clubes_docente     ON clubes (docente_id);

-- ---------- ESTUDIANTES ----------
CREATE SEQUENCE seq_codigo_estudiante START 1;

CREATE TABLE estudiantes (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_interno VARCHAR(20)  NOT NULL
        DEFAULT ('EST-' || lpad(nextval('seq_codigo_estudiante')::text, 6, '0')),
    nombres        VARCHAR(100) NOT NULL,
    apellidos      VARCHAR(100) NOT NULL,
    institucion_id BIGINT       NOT NULL REFERENCES instituciones(id),
    curso          VARCHAR(50)  NOT NULL,
    estado         VARCHAR(15)  NOT NULL DEFAULT 'ACTIVO',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_estudiantes_codigo UNIQUE (codigo_interno),
    CONSTRAINT uq_estudiantes_id_institucion UNIQUE (id, institucion_id),
    CONSTRAINT ck_estudiantes_estado CHECK (estado IN ('ACTIVO','RETIRADO','EGRESADO'))
);
CREATE INDEX ix_estudiantes_institucion ON estudiantes (institucion_id);

-- ---------- AUTORIZACIONES (protección de datos de menores) ----------
CREATE TABLE autorizaciones_estudiante (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estudiante_id  BIGINT      NOT NULL REFERENCES estudiantes(id),
    tipo           VARCHAR(20) NOT NULL,
    estado         VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
    fecha_registro DATE,
    documento_ruta VARCHAR(500),
    observacion    VARCHAR(255),
    registrado_por BIGINT      REFERENCES usuarios(id),
    CONSTRAINT uq_autorizacion UNIQUE (estudiante_id, tipo),
    CONSTRAINT ck_autorizacion_tipo CHECK (tipo IN ('PARTICIPACION','USO_IMAGEN')),
    CONSTRAINT ck_autorizacion_estado CHECK (estado IN ('PENDIENTE','OTORGADA','NO_OTORGADA','REVOCADA')),
    CONSTRAINT ck_autorizacion_fecha CHECK (estado <> 'OTORGADA' OR fecha_registro IS NOT NULL)
);

-- ---------- INSCRIPCIONES ----------
CREATE TABLE inscripciones (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estudiante_id  BIGINT      NOT NULL,
    club_id        BIGINT      NOT NULL,
    institucion_id BIGINT      NOT NULL,
    periodo_id     INT         NOT NULL,
    fecha_ingreso  DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_retiro   DATE,
    estado         VARCHAR(15) NOT NULL DEFAULT 'ACTIVA',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Sin inscripciones duplicadas
    CONSTRAINT uq_inscripcion UNIQUE (estudiante_id, club_id, periodo_id),
    -- Estudiante y club deben ser de la MISMA institución, y el período debe ser el del club
    CONSTRAINT fk_insc_estudiante_inst FOREIGN KEY (estudiante_id, institucion_id)
        REFERENCES estudiantes (id, institucion_id),
    CONSTRAINT fk_insc_club_inst FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT fk_insc_club_periodo FOREIGN KEY (club_id, periodo_id)
        REFERENCES clubes (id, periodo_id),
    CONSTRAINT ck_insc_estado CHECK (estado IN ('ACTIVA','RETIRADA','TRASLADADA')),
    CONSTRAINT ck_insc_fechas CHECK (fecha_retiro IS NULL OR fecha_retiro >= fecha_ingreso)
);
CREATE INDEX ix_inscripciones_club       ON inscripciones (club_id);
CREATE INDEX ix_inscripciones_estudiante ON inscripciones (estudiante_id);

-- ---------- AUDITORÍA (RF-07) ----------
CREATE TABLE auditoria (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id    BIGINT       REFERENCES usuarios(id),
    identificador VARCHAR(150),
    accion        VARCHAR(50)  NOT NULL,
    entidad       VARCHAR(50),
    entidad_id    BIGINT,
    detalle       TEXT,
    ip            VARCHAR(45),
    fecha         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_auditoria_fecha   ON auditoria (fecha);
CREATE INDEX ix_auditoria_usuario ON auditoria (usuario_id);