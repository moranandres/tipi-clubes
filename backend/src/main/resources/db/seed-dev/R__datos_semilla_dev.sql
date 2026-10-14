-- =====================================================================
-- DATOS PROVISIONALES DE DESARROLLO (solo perfil "dev")
-- Nombres y autoridades: documento "Instituciones Beneficiarias - TIPI 3.0".
-- Los códigos AMIE 09H999xx son INVENTADOS; se reemplazan por los reales
-- desde la API (PUT /api/instituciones/{id}).
-- Provincia y cantón (Guayas, Guayaquil) y circuito (Cangrejos) se asumieron
-- a partir del encabezado "Zona 8 - Cangrejos"; corrígelos si no son exactos.
-- Estado PENDIENTE porque aún no hay fecha real de adhesión.
-- =====================================================================
INSERT INTO instituciones
    (codigo_amie, nombre, zona, circuito, provincia, canton, autoridad_nombre, estado_adhesion)
SELECT v.codigo_amie, v.nombre, v.zona, v.circuito, v.provincia, v.canton,
       v.autoridad_nombre, v.estado_adhesion
FROM (VALUES
  ('09H99901', 'Unidad Educativa Fiscal "Eloy Alfaro"',           'Zona 8', 'Cangrejos', 'Guayas', 'Guayaquil', 'Msc. Patricia Isabel Andrade Pluas',  'PENDIENTE'),
  ('09H99902', 'Unidad Educativa Fiscal "José Vicente Trujillo"', 'Zona 8', 'Cangrejos', 'Guayas', 'Guayaquil', 'Lic. Gloria Chávez Quiñonez',        'PENDIENTE'),
  ('09H99903', 'Unidad Educativa Fiscal "Juan Modesto Carbo Noboa"','Zona 8','Cangrejos', 'Guayas', 'Guayaquil', 'PhD. Beatriz Lourdes Alvarado León', 'PENDIENTE'),
  ('09H99904', 'Unidad Educativa Fiscal "Leonidas Ortega Moreira"','Zona 8', 'Cangrejos', 'Guayas', 'Guayaquil', 'Msc. Kelvis Mejia Valverde',        'PENDIENTE'),
  ('09H99905', 'Unidad Educativa Fiscal "Provincia de Cotopaxi"', 'Zona 8', 'Cangrejos', 'Guayas', 'Guayaquil', 'Msc. María Verónica Nan Tomalá',     'PENDIENTE'),
  ('09H99906', 'Unidad Educativa Fiscal "Provincia de Loja"',     'Zona 8', 'Cangrejos', 'Guayas', 'Guayaquil', 'Msc. Karina Alexandra Gamboa Salvador','PENDIENTE'),
  ('09H99907', 'Unidad Educativa Fiscal "Agustín Vera Loor"',     'Zona 8', 'Cangrejos', 'Guayas', 'Guayaquil', 'Msc. Helem Cáceres Ortiz',          'PENDIENTE')
) AS v(codigo_amie, nombre, zona, circuito, provincia, canton, autoridad_nombre, estado_adhesion)
WHERE NOT EXISTS (SELECT 1 FROM instituciones i WHERE i.nombre = v.nombre);