CREATE TABLE proyectos (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id            BIGINT        NOT NULL,
    institucion_id     BIGINT        NOT NULL,
    docente_id         BIGINT        NOT NULL,
    tipo               VARCHAR(12)   NOT NULL,
    titulo             VARCHAR(150)  NOT NULL,
    objetivo           VARCHAR(1000) NOT NULL,
    descripcion        VARCHAR(4000),
    fecha_inicio       DATE          NOT NULL,
    fecha_fin_prevista DATE,
    estado             VARCHAR(15)   NOT NULL DEFAULT 'EN_DESARROLLO',
    resultado_final    VARCHAR(2000),
    fecha_finalizacion DATE,
    finalizado_por     BIGINT        REFERENCES usuarios (id),
    motivo_cancelacion VARCHAR(500),
    cancelado_por      BIGINT        REFERENCES usuarios (id),
    fecha_cancelacion  TIMESTAMPTZ,
    creado_por         BIGINT        NOT NULL REFERENCES usuarios (id),
    fecha_registro     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT fk_proyectos_club FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT fk_proyectos_docente FOREIGN KEY (docente_id, institucion_id)
        REFERENCES docentes (id, institucion_id),
    CONSTRAINT uq_proyectos_id_club UNIQUE (id, club_id),
    CONSTRAINT ck_proyectos_tipo CHECK (tipo IN ('PROTOTIPO', 'SOFTWARE', 'OTRO')),
    CONSTRAINT ck_proyectos_estado CHECK (estado IN ('EN_DESARROLLO', 'FINALIZADO', 'CANCELADO')),
    CONSTRAINT ck_proyectos_textos CHECK (btrim(titulo) <> '' AND btrim(objetivo) <> ''),
    CONSTRAINT ck_proyectos_descripcion CHECK (descripcion IS NULL OR btrim(descripcion) <> ''),
    CONSTRAINT ck_proyectos_fechas CHECK (fecha_fin_prevista IS NULL OR fecha_fin_prevista >= fecha_inicio),
    CONSTRAINT ck_proyectos_finalizacion CHECK (
        (estado = 'FINALIZADO' AND resultado_final IS NOT NULL AND btrim(resultado_final) <> ''
            AND fecha_finalizacion IS NOT NULL AND fecha_finalizacion >= fecha_inicio AND finalizado_por IS NOT NULL)
        OR (estado <> 'FINALIZADO' AND resultado_final IS NULL AND fecha_finalizacion IS NULL
            AND finalizado_por IS NULL)
    ),
    CONSTRAINT ck_proyectos_cancelacion CHECK (
        (estado = 'CANCELADO' AND motivo_cancelacion IS NOT NULL AND btrim(motivo_cancelacion) <> ''
            AND cancelado_por IS NOT NULL AND fecha_cancelacion IS NOT NULL)
        OR (estado <> 'CANCELADO' AND motivo_cancelacion IS NULL AND cancelado_por IS NULL
            AND fecha_cancelacion IS NULL)
    )
);

CREATE UNIQUE INDEX ux_proyectos_club_titulo ON proyectos (club_id, lower(btrim(titulo)))
    WHERE estado <> 'CANCELADO';
CREATE INDEX ix_proyectos_club_estado ON proyectos (club_id, estado);
CREATE INDEX ix_proyectos_institucion ON proyectos (institucion_id);
CREATE INDEX ix_proyectos_docente ON proyectos (docente_id);

CREATE TABLE proyecto_integrantes (
    proyecto_id   BIGINT NOT NULL REFERENCES proyectos (id),
    estudiante_id BIGINT NOT NULL REFERENCES estudiantes (id),
    CONSTRAINT pk_proyecto_integrantes PRIMARY KEY (proyecto_id, estudiante_id)
);

CREATE INDEX ix_proyecto_integrantes_estudiante ON proyecto_integrantes (estudiante_id);

CREATE TABLE proyecto_evidencias (
    proyecto_id  BIGINT NOT NULL REFERENCES proyectos (id),
    evidencia_id BIGINT NOT NULL REFERENCES evidencias (id),
    CONSTRAINT pk_proyecto_evidencias PRIMARY KEY (proyecto_id, evidencia_id)
);

CREATE INDEX ix_proyecto_evidencias_evidencia ON proyecto_evidencias (evidencia_id);

CREATE FUNCTION fn_validar_proyecto() RETURNS trigger AS $$
DECLARE
    v_club_estado VARCHAR(15);
    v_periodo_inicio DATE;
    v_periodo_fin DATE;
    v_docente_activo BOOLEAN;
    v_integrantes BIGINT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.estado <> 'EN_DESARROLLO' THEN
            RAISE EXCEPTION 'El proyecto «%» está % y ya no se modifica', OLD.titulo,
                CASE OLD.estado WHEN 'FINALIZADO' THEN 'finalizado' ELSE 'cancelado' END
                USING ERRCODE = '23TP1';
        END IF;
        IF (NEW.club_id, NEW.institucion_id, NEW.creado_por, NEW.fecha_registro)
           IS DISTINCT FROM (OLD.club_id, OLD.institucion_id, OLD.creado_por, OLD.fecha_registro) THEN
            RAISE EXCEPTION 'Un proyecto registrado no cambia de club ni de autor'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.estado <> 'EN_DESARROLLO' THEN
        RAISE EXCEPTION 'Todo proyecto se registra primero en desarrollo'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT c.estado, p.fecha_inicio, p.fecha_fin
    INTO v_club_estado, v_periodo_inicio, v_periodo_fin
    FROM clubes c
    JOIN periodos_academicos p ON p.id = c.periodo_id
    WHERE c.id = NEW.club_id;

    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; sus proyectos forman parte del historial y ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'INSERT' AND v_club_estado <> 'ACTIVO' THEN
        RAISE EXCEPTION 'Solo se registran proyectos en clubes activos; el club está en estado %', v_club_estado
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.estado = 'EN_DESARROLLO' THEN
        IF TG_OP = 'INSERT'
           OR (NEW.fecha_inicio, NEW.fecha_fin_prevista) IS DISTINCT FROM (OLD.fecha_inicio, OLD.fecha_fin_prevista) THEN
            IF NEW.fecha_inicio < v_periodo_inicio OR NEW.fecha_inicio > least(v_periodo_fin, fn_hoy_guayaquil()) THEN
                RAISE EXCEPTION 'La fecha de inicio del proyecto debe estar dentro del período académico del club (% a %) y no puede ser posterior a hoy',
                    to_char(v_periodo_inicio, 'DD/MM/YYYY'), to_char(v_periodo_fin, 'DD/MM/YYYY')
                    USING ERRCODE = '23TP1';
            END IF;
            IF NEW.fecha_fin_prevista > v_periodo_fin THEN
                RAISE EXCEPTION 'La fecha prevista de finalización no puede superar el fin del período académico del club (%)',
                    to_char(v_periodo_fin, 'DD/MM/YYYY')
                    USING ERRCODE = '23TP1';
            END IF;
        END IF;
        IF TG_OP = 'INSERT' OR NEW.docente_id IS DISTINCT FROM OLD.docente_id THEN
            SELECT activo INTO v_docente_activo FROM docentes WHERE id = NEW.docente_id;
            IF NOT v_docente_activo THEN
                RAISE EXCEPTION 'El docente tutor del proyecto está inactivo'
                    USING ERRCODE = '23TP1';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.estado = 'FINALIZADO' THEN
        IF NEW.fecha_finalizacion < NEW.fecha_inicio OR NEW.fecha_finalizacion > fn_hoy_guayaquil() THEN
            RAISE EXCEPTION 'La fecha de finalización del proyecto «%» debe estar entre su fecha de inicio (%) y hoy',
                NEW.titulo, to_char(NEW.fecha_inicio, 'DD/MM/YYYY')
                USING ERRCODE = '23TP1';
        END IF;
        SELECT count(*) INTO v_integrantes FROM proyecto_integrantes WHERE proyecto_id = NEW.id;
        IF v_integrantes = 0 THEN
            RAISE EXCEPTION 'El proyecto «%» no tiene integrantes; registre al menos un estudiante antes de finalizarlo',
                NEW.titulo
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proyectos_validar
    BEFORE INSERT OR UPDATE ON proyectos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_proyecto();

CREATE TRIGGER trg_proyectos_sin_borrado
    BEFORE DELETE ON proyectos
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Los proyectos forman parte del historial del club y no se eliminan; cancélelo en su lugar');

CREATE FUNCTION fn_validar_integrante_proyecto() RETURNS trigger AS $$
DECLARE
    v_proyecto_id BIGINT;
    v_estado VARCHAR(15);
    v_titulo VARCHAR(150);
    v_club_id BIGINT;
    v_club_estado VARCHAR(15);
    v_codigo VARCHAR(20);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_proyecto_id := OLD.proyecto_id;
    ELSE
        v_proyecto_id := NEW.proyecto_id;
    END IF;

    SELECT p.estado, p.titulo, p.club_id, c.estado
    INTO v_estado, v_titulo, v_club_id, v_club_estado
    FROM proyectos p
    JOIN clubes c ON c.id = p.club_id
    WHERE p.id = v_proyecto_id;

    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; sus proyectos forman parte del historial y ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;
    IF v_estado <> 'EN_DESARROLLO' THEN
        RAISE EXCEPTION 'El proyecto «%» está %; sus integrantes ya no se modifican', v_titulo,
            CASE v_estado WHEN 'FINALIZADO' THEN 'finalizado' ELSE 'cancelado' END
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM inscripciones i
        WHERE i.estudiante_id = NEW.estudiante_id
          AND i.club_id = v_club_id
          AND i.estado = 'ACTIVA'
    ) THEN
        SELECT codigo_interno INTO v_codigo FROM estudiantes WHERE id = NEW.estudiante_id;
        RAISE EXCEPTION 'El estudiante % no es integrante activo del club; solo los integrantes activos se suman al proyecto «%»',
            v_codigo, v_titulo
            USING ERRCODE = '23TP1';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proyecto_integrantes_validar
    BEFORE INSERT OR DELETE ON proyecto_integrantes
    FOR EACH ROW EXECUTE FUNCTION fn_validar_integrante_proyecto();

CREATE TRIGGER trg_proyecto_integrantes_sin_edicion
    BEFORE UPDATE ON proyecto_integrantes
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Los integrantes de un proyecto no se editan; se quitan o se agregan');

CREATE FUNCTION fn_validar_evidencia_proyecto() RETURNS trigger AS $$
DECLARE
    v_proyecto_id BIGINT;
    v_estado VARCHAR(15);
    v_titulo VARCHAR(150);
    v_club_id BIGINT;
    v_club_estado VARCHAR(15);
    v_evidencia_club BIGINT;
    v_evidencia_estado VARCHAR(10);
    v_evidencia_titulo VARCHAR(150);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_proyecto_id := OLD.proyecto_id;
    ELSE
        v_proyecto_id := NEW.proyecto_id;
    END IF;

    SELECT p.estado, p.titulo, p.club_id, c.estado
    INTO v_estado, v_titulo, v_club_id, v_club_estado
    FROM proyectos p
    JOIN clubes c ON c.id = p.club_id
    WHERE p.id = v_proyecto_id;

    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; sus proyectos forman parte del historial y ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;
    IF v_estado = 'CANCELADO' THEN
        RAISE EXCEPTION 'El proyecto «%» fue cancelado; sus evidencias vinculadas ya no se modifican', v_titulo
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    SELECT club_id, estado, titulo
    INTO v_evidencia_club, v_evidencia_estado, v_evidencia_titulo
    FROM evidencias
    WHERE id = NEW.evidencia_id;

    IF v_evidencia_club <> v_club_id THEN
        RAISE EXCEPTION 'La evidencia «%» pertenece a otro club y no se vincula con el proyecto «%»',
            v_evidencia_titulo, v_titulo
            USING ERRCODE = '23TP1';
    END IF;
    IF v_evidencia_estado <> 'ACTIVA' THEN
        RAISE EXCEPTION 'La evidencia «%» fue retirada y no se vincula con proyectos', v_evidencia_titulo
            USING ERRCODE = '23TP1';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proyecto_evidencias_validar
    BEFORE INSERT OR DELETE ON proyecto_evidencias
    FOR EACH ROW EXECUTE FUNCTION fn_validar_evidencia_proyecto();

CREATE TRIGGER trg_proyecto_evidencias_sin_edicion
    BEFORE UPDATE ON proyecto_evidencias
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Las evidencias vinculadas a un proyecto no se editan; se quitan o se agregan');

CREATE FUNCTION fn_validar_proyectos_en_desarrollo() RETURNS trigger AS $$
DECLARE
    v_total BIGINT;
    v_lista TEXT;
BEGIN
    SELECT count(*) INTO v_total FROM proyectos WHERE club_id = NEW.id AND estado = 'EN_DESARROLLO';
    IF v_total > 0 THEN
        SELECT string_agg(format('«%s»', x.titulo), ', ' ORDER BY x.titulo)
        INTO v_lista
        FROM (
            SELECT p.titulo FROM proyectos p
            WHERE p.club_id = NEW.id AND p.estado = 'EN_DESARROLLO'
            ORDER BY p.titulo
            LIMIT 5
        ) x;
        IF v_total > 5 THEN
            v_lista := v_lista || ' y ' || (v_total - 5) || ' más';
        END IF;
        RAISE EXCEPTION 'El club tiene proyectos en desarrollo (%): %. Finalícelos o cancélelos antes de cerrar el club',
            v_total, v_lista
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clubes_proyectos_en_desarrollo
    BEFORE UPDATE OF estado ON clubes
    FOR EACH ROW
    WHEN (NEW.estado = 'CERRADO' AND OLD.estado IS DISTINCT FROM 'CERRADO')
    EXECUTE FUNCTION fn_validar_proyectos_en_desarrollo();

CREATE TABLE avances (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id           BIGINT        NOT NULL,
    institucion_id    BIGINT        NOT NULL,
    alcance           VARCHAR(10)   NOT NULL,
    estudiante_id     BIGINT,
    proyecto_id       BIGINT,
    actividad_id      BIGINT,
    fecha             DATE          NOT NULL,
    resultados        VARCHAR(2000) NOT NULL,
    logros            VARCHAR(2000),
    dificultades      VARCHAR(2000),
    proximos_pasos    VARCHAR(1000),
    porcentaje_avance SMALLINT,
    estado            VARCHAR(10)   NOT NULL DEFAULT 'ACTIVO',
    registrado_por    BIGINT        NOT NULL REFERENCES usuarios (id),
    fecha_registro    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    motivo_anulacion  VARCHAR(500),
    anulado_por       BIGINT        REFERENCES usuarios (id),
    fecha_anulacion   TIMESTAMPTZ,
    CONSTRAINT fk_avances_club FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    CONSTRAINT fk_avances_estudiante FOREIGN KEY (estudiante_id, institucion_id)
        REFERENCES estudiantes (id, institucion_id),
    CONSTRAINT fk_avances_proyecto FOREIGN KEY (proyecto_id, club_id)
        REFERENCES proyectos (id, club_id),
    CONSTRAINT fk_avances_actividad FOREIGN KEY (actividad_id, club_id)
        REFERENCES actividades (id, club_id),
    CONSTRAINT ck_avances_alcance CHECK (alcance IN ('CLUB', 'ESTUDIANTE', 'PROYECTO')),
    CONSTRAINT ck_avances_estado CHECK (estado IN ('ACTIVO', 'ANULADO')),
    CONSTRAINT ck_avances_sujeto CHECK (
        (alcance = 'CLUB' AND estudiante_id IS NULL AND proyecto_id IS NULL)
        OR (alcance = 'ESTUDIANTE' AND estudiante_id IS NOT NULL AND proyecto_id IS NULL)
        OR (alcance = 'PROYECTO' AND proyecto_id IS NOT NULL AND estudiante_id IS NULL)
    ),
    CONSTRAINT ck_avances_porcentaje CHECK (
        (alcance = 'PROYECTO' AND porcentaje_avance IS NOT NULL AND porcentaje_avance BETWEEN 0 AND 100)
        OR (alcance <> 'PROYECTO' AND porcentaje_avance IS NULL)
    ),
    CONSTRAINT ck_avances_textos CHECK (
        btrim(resultados) <> ''
        AND (logros IS NULL OR btrim(logros) <> '')
        AND (dificultades IS NULL OR btrim(dificultades) <> '')
        AND (proximos_pasos IS NULL OR btrim(proximos_pasos) <> '')
    ),
    CONSTRAINT ck_avances_anulacion CHECK (
        (estado = 'ACTIVO' AND motivo_anulacion IS NULL AND anulado_por IS NULL AND fecha_anulacion IS NULL)
        OR (estado = 'ANULADO' AND motivo_anulacion IS NOT NULL AND btrim(motivo_anulacion) <> ''
            AND anulado_por IS NOT NULL AND fecha_anulacion IS NOT NULL)
    )
);

CREATE UNIQUE INDEX ux_avances_club_fecha ON avances (club_id, fecha)
    WHERE estado = 'ACTIVO' AND alcance = 'CLUB';
CREATE UNIQUE INDEX ux_avances_estudiante_fecha ON avances (club_id, estudiante_id, fecha)
    WHERE estado = 'ACTIVO' AND alcance = 'ESTUDIANTE';
CREATE UNIQUE INDEX ux_avances_proyecto_fecha ON avances (proyecto_id, fecha)
    WHERE estado = 'ACTIVO' AND alcance = 'PROYECTO';
CREATE INDEX ix_avances_club_estado ON avances (club_id, estado);
CREATE INDEX ix_avances_estudiante ON avances (estudiante_id);
CREATE INDEX ix_avances_proyecto ON avances (proyecto_id);
CREATE INDEX ix_avances_actividad ON avances (actividad_id);
CREATE INDEX ix_avances_institucion_fecha ON avances (institucion_id, fecha);

CREATE TABLE avance_competencias (
    avance_id    BIGINT      NOT NULL REFERENCES avances (id),
    contenido_id INT         NOT NULL REFERENCES catalogo_contenidos (id),
    nivel        VARCHAR(12) NOT NULL,
    CONSTRAINT pk_avance_competencias PRIMARY KEY (avance_id, contenido_id),
    CONSTRAINT ck_avance_competencias_nivel CHECK (nivel IN ('INICIAL', 'EN_PROCESO', 'LOGRADO', 'DESTACADO'))
);

CREATE INDEX ix_avance_competencias_contenido ON avance_competencias (contenido_id);

CREATE FUNCTION fn_validar_avance() RETURNS trigger AS $$
DECLARE
    v_club_estado VARCHAR(15);
    v_periodo_inicio DATE;
    v_periodo_fin DATE;
    v_proyecto_estado VARCHAR(15);
    v_proyecto_titulo VARCHAR(150);
    v_proyecto_inicio DATE;
    v_actividad_estado VARCHAR(15);
    v_actividad_fecha DATE;
    v_actividad_tema VARCHAR(200);
    v_codigo VARCHAR(20);
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.estado = 'ANULADO' THEN
            RAISE EXCEPTION 'El avance del % fue anulado y ya no se modifica', to_char(OLD.fecha, 'DD/MM/YYYY')
                USING ERRCODE = '23TP1';
        END IF;
        IF (NEW.club_id, NEW.institucion_id, NEW.alcance, NEW.estudiante_id, NEW.proyecto_id, NEW.registrado_por,
            NEW.fecha_registro)
           IS DISTINCT FROM
           (OLD.club_id, OLD.institucion_id, OLD.alcance, OLD.estudiante_id, OLD.proyecto_id, OLD.registrado_por,
            OLD.fecha_registro) THEN
            RAISE EXCEPTION 'Un avance registrado no cambia de club, de alcance, de estudiante, de proyecto ni de autor; anúlelo y registre uno nuevo'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.estado <> 'ACTIVO' THEN
        RAISE EXCEPTION 'Todo avance se registra primero como activo'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT c.estado, p.fecha_inicio, p.fecha_fin
    INTO v_club_estado, v_periodo_inicio, v_periodo_fin
    FROM clubes c
    JOIN periodos_academicos p ON p.id = c.periodo_id
    WHERE c.id = NEW.club_id;

    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; sus avances forman parte del historial y ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'INSERT' AND v_club_estado = 'PLANIFICADO' THEN
        RAISE EXCEPTION 'El club aún está planificado; los avances se registran desde que el club está activo'
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.proyecto_id IS NOT NULL THEN
        SELECT estado, titulo, fecha_inicio
        INTO v_proyecto_estado, v_proyecto_titulo, v_proyecto_inicio
        FROM proyectos
        WHERE id = NEW.proyecto_id;
        IF v_proyecto_estado <> 'EN_DESARROLLO' THEN
            RAISE EXCEPTION 'El proyecto «%» está %; sus avances ya no se registran ni se modifican', v_proyecto_titulo,
                CASE v_proyecto_estado WHEN 'FINALIZADO' THEN 'finalizado' ELSE 'cancelado' END
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    IF NEW.estado = 'ANULADO' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' OR (NEW.fecha, NEW.actividad_id) IS DISTINCT FROM (OLD.fecha, OLD.actividad_id) THEN
        IF NEW.fecha < v_periodo_inicio OR NEW.fecha > least(v_periodo_fin, fn_hoy_guayaquil()) THEN
            RAISE EXCEPTION 'La fecha del avance debe estar dentro del período académico del club (% a %) y no puede ser posterior a hoy',
                to_char(v_periodo_inicio, 'DD/MM/YYYY'), to_char(v_periodo_fin, 'DD/MM/YYYY')
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.proyecto_id IS NOT NULL AND NEW.fecha < v_proyecto_inicio THEN
            RAISE EXCEPTION 'La fecha del avance no puede ser anterior al inicio del proyecto «%» (%)',
                v_proyecto_titulo, to_char(v_proyecto_inicio, 'DD/MM/YYYY')
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.actividad_id IS NOT NULL THEN
            SELECT estado, fecha, tema
            INTO v_actividad_estado, v_actividad_fecha, v_actividad_tema
            FROM actividades
            WHERE id = NEW.actividad_id;
            IF v_actividad_estado <> 'EJECUTADA' THEN
                RAISE EXCEPTION 'Los avances se vinculan con actividades ejecutadas; la actividad «%» está %',
                    v_actividad_tema, CASE v_actividad_estado WHEN 'PLANIFICADA' THEN 'planificada' ELSE 'cancelada' END
                    USING ERRCODE = '23TP1';
            END IF;
            IF NEW.fecha < v_actividad_fecha THEN
                RAISE EXCEPTION 'La fecha del avance no puede ser anterior a la de la actividad «%» (%)',
                    v_actividad_tema, to_char(v_actividad_fecha, 'DD/MM/YYYY')
                    USING ERRCODE = '23TP1';
            END IF;
        END IF;
        IF NEW.estudiante_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM inscripciones i
            WHERE i.estudiante_id = NEW.estudiante_id
              AND i.club_id = NEW.club_id
              AND i.fecha_ingreso <= NEW.fecha
              AND (i.fecha_retiro IS NULL OR i.fecha_retiro >= NEW.fecha)
        ) THEN
            SELECT codigo_interno INTO v_codigo FROM estudiantes WHERE id = NEW.estudiante_id;
            RAISE EXCEPTION 'El estudiante % no era integrante del club el %', v_codigo, to_char(NEW.fecha, 'DD/MM/YYYY')
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_avances_validar
    BEFORE INSERT OR UPDATE ON avances
    FOR EACH ROW EXECUTE FUNCTION fn_validar_avance();

CREATE TRIGGER trg_avances_sin_borrado
    BEFORE DELETE ON avances
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Los avances forman parte del historial del club y no se eliminan; anúlelo en su lugar');

CREATE FUNCTION fn_validar_competencia_avance() RETURNS trigger AS $$
DECLARE
    v_avance_id BIGINT;
    v_alcance VARCHAR(10);
    v_estado VARCHAR(10);
    v_club_estado VARCHAR(15);
    v_tipo VARCHAR(15);
    v_nombre VARCHAR(100);
    v_activo BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_avance_id := OLD.avance_id;
    ELSE
        v_avance_id := NEW.avance_id;
    END IF;

    SELECT a.alcance, a.estado, c.estado
    INTO v_alcance, v_estado, v_club_estado
    FROM avances a
    JOIN clubes c ON c.id = a.club_id
    WHERE a.id = v_avance_id;

    IF v_club_estado = 'CERRADO' THEN
        RAISE EXCEPTION 'El club está cerrado; sus avances forman parte del historial y ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;
    IF v_estado = 'ANULADO' THEN
        RAISE EXCEPTION 'El avance fue anulado; sus competencias evaluadas ya no se modifican'
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    IF v_alcance <> 'ESTUDIANTE' THEN
        RAISE EXCEPTION 'Las competencias se evalúan en avances individuales de un estudiante'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT tipo, nombre, activo INTO v_tipo, v_nombre, v_activo FROM catalogo_contenidos WHERE id = NEW.contenido_id;
    IF v_tipo <> 'COMPETENCIA' THEN
        RAISE EXCEPTION '«%» es un contenido de tipo % del catálogo; solo se evalúan competencias', v_nombre, v_tipo
            USING ERRCODE = '23TP1';
    END IF;
    IF NOT v_activo THEN
        RAISE EXCEPTION 'La competencia «%» está inactiva en el catálogo y no se puede evaluar', v_nombre
            USING ERRCODE = '23TP1';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_avance_competencias_validar
    BEFORE INSERT OR DELETE ON avance_competencias
    FOR EACH ROW EXECUTE FUNCTION fn_validar_competencia_avance();

CREATE TRIGGER trg_avance_competencias_sin_edicion
    BEFORE UPDATE ON avance_competencias
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Las competencias evaluadas de un avance no se editan; se quitan o se agregan');
