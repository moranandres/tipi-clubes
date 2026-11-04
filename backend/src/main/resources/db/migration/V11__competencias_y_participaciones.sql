DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM participaciones_competencia) THEN
        RAISE EXCEPTION 'La tabla participaciones_competencia tiene filas cargadas a mano antes de V11; elimínelas y vuelva a ejecutar la migración';
    END IF;
END;
$$;

ALTER TABLE competencias
    ADD CONSTRAINT ck_competencias_nombre CHECK (btrim(nombre) <> ''),
    ADD CONSTRAINT ck_competencias_sitio_web CHECK (sitio_web IS NULL OR sitio_web ~ '^https?://[^[:space:]]+$');

ALTER TABLE ediciones_competencia
    ADD CONSTRAINT ck_ediciones_nombre_texto CHECK (btrim(nombre) <> ''),
    ADD CONSTRAINT ck_ediciones_anio_inicio CHECK (fecha_inicio IS NULL OR EXTRACT(YEAR FROM fecha_inicio) = anio),
    ADD CONSTRAINT ck_ediciones_fin_con_inicio CHECK (fecha_fin IS NULL OR fecha_inicio IS NOT NULL);

ALTER TABLE categorias_competencia
    ADD CONSTRAINT ck_categorias_nombre_texto CHECK (btrim(nombre) <> '');

CREATE UNIQUE INDEX ux_competencias_nombre_ci ON competencias (lower(btrim(nombre)));
CREATE UNIQUE INDEX ux_ediciones_nombre_ci ON ediciones_competencia (competencia_id, lower(btrim(nombre)));
CREATE UNIQUE INDEX ux_categorias_nombre_ci ON categorias_competencia (competencia_id, nivel, lower(btrim(nombre)));

ALTER TABLE participaciones_competencia
    ADD COLUMN inscripcion_id  BIGINT NOT NULL,
    ADD COLUMN actualizado_por BIGINT REFERENCES usuarios (id),
    ADD COLUMN updated_at      TIMESTAMPTZ,
    ALTER COLUMN club_id SET NOT NULL;

ALTER TABLE participaciones_competencia
    ADD CONSTRAINT fk_part_inscripcion FOREIGN KEY (inscripcion_id, estudiante_id, club_id)
        REFERENCES inscripciones (id, estudiante_id, club_id),
    ADD CONSTRAINT ck_part_equipo CHECK (
        equipo_nombre IS NULL OR (btrim(equipo_nombre) <> '' AND equipo_nombre = btrim(equipo_nombre))
    ),
    ADD CONSTRAINT ck_part_reconocimiento CHECK (reconocimiento IS NULL OR btrim(reconocimiento) <> ''),
    ADD CONSTRAINT ck_part_observaciones CHECK (
        observaciones IS NULL OR (btrim(observaciones) <> '' AND char_length(observaciones) <= 1000)
    ),
    ADD CONSTRAINT ck_part_puesto_maximo CHECK (puesto IS NULL OR puesto <= 999),
    ADD CONSTRAINT ck_part_actualizacion CHECK ((actualizado_por IS NULL) = (updated_at IS NULL));

CREATE FUNCTION fn_validar_participacion_competencia() RETURNS trigger AS $$
DECLARE
    v_estado_inscripcion VARCHAR(15);
    v_estado_estudiante  VARCHAR(15);
    v_estado_club        VARCHAR(15);
    v_competencia        VARCHAR(100);
    v_competencia_activa BOOLEAN;
    v_edicion            VARCHAR(100);
    v_edicion_activa     BOOLEAN;
    v_inicio_edicion     DATE;
    v_categoria          VARCHAR(150);
    v_categoria_activa   BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF EXISTS (SELECT 1 FROM certificados c WHERE c.participacion_id = OLD.id) THEN
            RAISE EXCEPTION 'La participación tiene certificados registrados y forma parte del historial; no se puede eliminar'
                USING ERRCODE = '23TP1';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND (NEW.estudiante_id, NEW.institucion_id, NEW.club_id, NEW.inscripcion_id,
                             NEW.competencia_id, NEW.edicion_id, NEW.categoria_id, NEW.registrado_por, NEW.created_at)
                            IS DISTINCT FROM
                            (OLD.estudiante_id, OLD.institucion_id, OLD.club_id, OLD.inscripcion_id,
                             OLD.competencia_id, OLD.edicion_id, OLD.categoria_id, OLD.registrado_por, OLD.created_at) THEN
        RAISE EXCEPTION 'El estudiante, la inscripción, la edición y la categoría de una participación no se modifican; elimínela y regístrela de nuevo'
            USING ERRCODE = '23TP1';
    END IF;

    SELECT e.nombre, e.activa, e.fecha_inicio INTO v_edicion, v_edicion_activa, v_inicio_edicion
    FROM ediciones_competencia e WHERE e.id = NEW.edicion_id;

    IF TG_OP = 'INSERT' THEN
        SELECT estado INTO v_estado_inscripcion FROM inscripciones WHERE id = NEW.inscripcion_id;
        IF v_estado_inscripcion IS DISTINCT FROM 'ACTIVA' THEN
            RAISE EXCEPTION 'Solo se registran participaciones de estudiantes con inscripción ACTIVA en el club; la inscripción está en estado %',
                coalesce(v_estado_inscripcion, 'desconocido')
                USING ERRCODE = '23TP1';
        END IF;

        SELECT estado INTO v_estado_estudiante FROM estudiantes WHERE id = NEW.estudiante_id;
        IF v_estado_estudiante <> 'ACTIVO' THEN
            RAISE EXCEPTION 'El estudiante está en estado % y no puede registrar participaciones en competencias', v_estado_estudiante
                USING ERRCODE = '23TP1';
        END IF;

        SELECT estado INTO v_estado_club FROM clubes WHERE id = NEW.club_id;
        IF v_estado_club NOT IN ('PLANIFICADO', 'ACTIVO') THEN
            RAISE EXCEPTION 'El club está en estado % y no puede registrar participaciones en competencias', v_estado_club
                USING ERRCODE = '23TP1';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM autorizaciones_estudiante a
            WHERE a.estudiante_id = NEW.estudiante_id
              AND a.tipo = 'PARTICIPACION'
              AND a.estado = 'OTORGADA'
        ) THEN
            RAISE EXCEPTION 'El estudiante no tiene la autorización de participación otorgada'
                USING ERRCODE = '23TP1';
        END IF;

        SELECT c.nombre, c.activa INTO v_competencia, v_competencia_activa
        FROM competencias c WHERE c.id = NEW.competencia_id;
        IF NOT v_competencia_activa THEN
            RAISE EXCEPTION 'La competencia «%» está inactiva y no admite nuevas participaciones', v_competencia
                USING ERRCODE = '23TP1';
        END IF;
        IF NOT v_edicion_activa THEN
            RAISE EXCEPTION 'La edición «%» está inactiva y no admite nuevas participaciones', v_edicion
                USING ERRCODE = '23TP1';
        END IF;

        SELECT c.nombre, c.activa INTO v_categoria, v_categoria_activa
        FROM categorias_competencia c WHERE c.id = NEW.categoria_id;
        IF NOT v_categoria_activa THEN
            RAISE EXCEPTION 'La categoría «%» está inactiva y no admite nuevas participaciones', v_categoria
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    IF (NEW.puesto IS NOT NULL OR NEW.reconocimiento IS NOT NULL)
       AND (TG_OP = 'INSERT' OR (NEW.puesto, NEW.reconocimiento) IS DISTINCT FROM (OLD.puesto, OLD.reconocimiento))
       AND v_inicio_edicion > current_date THEN
        RAISE EXCEPTION 'Los resultados (puesto o reconocimiento) solo se registran desde la fecha de inicio de la edición, el %',
            to_char(v_inicio_edicion, 'DD/MM/YYYY')
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.equipo_nombre IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.equipo_nombre IS DISTINCT FROM OLD.equipo_nombre) THEN
        PERFORM pg_advisory_xact_lock(hashtextextended(
            NEW.edicion_id || ':' || NEW.categoria_id || ':' || lower(NEW.equipo_nombre), 0));
        IF EXISTS (
            SELECT 1 FROM participaciones_competencia p
            WHERE p.edicion_id = NEW.edicion_id
              AND p.categoria_id = NEW.categoria_id
              AND lower(p.equipo_nombre) = lower(NEW.equipo_nombre)
              AND p.club_id <> NEW.club_id
        ) THEN
            RAISE EXCEPTION 'El equipo «%» ya está registrado en esta edición y categoría por otro club', NEW.equipo_nombre
                USING ERRCODE = '23TP1';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_participaciones_competencia_validar
    BEFORE INSERT OR UPDATE OR DELETE ON participaciones_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_validar_participacion_competencia();

CREATE FUNCTION fn_validar_edicion_competencia() RETURNS trigger AS $$
BEGIN
    IF NEW.competencia_id <> OLD.competencia_id THEN
        RAISE EXCEPTION 'Una edición no se puede trasladar a otra competencia'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.fecha_inicio IS DISTINCT FROM OLD.fecha_inicio AND NEW.fecha_inicio > current_date AND EXISTS (
        SELECT 1 FROM participaciones_competencia p
        WHERE p.edicion_id = NEW.id
          AND (p.puesto IS NOT NULL OR p.reconocimiento IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'La edición «%» ya tiene resultados registrados; su fecha de inicio no puede quedar en el futuro', OLD.nombre
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ediciones_competencia_validar
    BEFORE UPDATE ON ediciones_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_validar_edicion_competencia();

CREATE FUNCTION fn_validar_categoria_competencia() RETURNS trigger AS $$
BEGIN
    IF NEW.competencia_id <> OLD.competencia_id THEN
        RAISE EXCEPTION 'Una categoría no se puede trasladar a otra competencia'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.nivel <> OLD.nivel AND EXISTS (
        SELECT 1 FROM participaciones_competencia p WHERE p.categoria_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'La categoría «%» ya tiene participaciones registradas y su nivel no se puede cambiar', OLD.nombre
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categorias_competencia_validar
    BEFORE UPDATE ON categorias_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_validar_categoria_competencia();

CREATE FUNCTION fn_impedir_borrado_catalogo() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'El catálogo de competencias forma parte del historial y no se elimina; desactive el registro en su lugar'
        USING ERRCODE = '23TP1';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_competencias_sin_borrado
    BEFORE DELETE ON competencias
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_catalogo();

CREATE TRIGGER trg_ediciones_sin_borrado
    BEFORE DELETE ON ediciones_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_catalogo();

CREATE TRIGGER trg_categorias_sin_borrado
    BEFORE DELETE ON categorias_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_catalogo();

CREATE INDEX ix_part_inscripcion ON participaciones_competencia (inscripcion_id);
CREATE INDEX ix_part_institucion ON participaciones_competencia (institucion_id);
CREATE INDEX ix_part_club ON participaciones_competencia (club_id);
CREATE INDEX ix_part_equipo ON participaciones_competencia (edicion_id, categoria_id, lower(equipo_nombre))
    WHERE equipo_nombre IS NOT NULL;
CREATE INDEX ix_ediciones_competencia ON ediciones_competencia (competencia_id);
CREATE INDEX ix_categorias_competencia ON categorias_competencia (competencia_id, nivel);
