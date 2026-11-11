# TIPI 3.0 · Diagnóstico inicial (PASO 1)

Auditoría hecha el 11/11/2026 sobre el equipo de Andrés: backend Spring Boot en `http://localhost:8080`, frontend estático servido en `http://localhost:5500`, recorrido con el navegador integrado (sesión de administrador) a 1024×768 y 375×812, más revisión de código y el detector mecánico de impeccable.

## Puntuación de salud (impeccable audit)

| # | Dimensión | Puntaje | Hallazgo clave |
|---|-----------|---------|----------------|
| 1 | Accesibilidad | 3 | Azul primario `#0d6efd` sobre `#f8f9fa` da 4.3:1 (mínimo 4.5:1) en enlaces del menú, pestañas y filtros |
| 2 | Rendimiento | 3 | Carga rápida (172 ms), pero el panel hace 6 llamadas y los selectores descargan el registro completo de cada club, página por página |
| 3 | Temas y tokens | 2 | Paleta y tipografía por defecto de Bootstrap, sin tokens propios ni modo oscuro |
| 4 | Responsive | 2 | En móvil los filtros ocupan más de una pantalla antes de los datos y la tabla mide 700 px en 375 px |
| 5 | Integridad de implementación | 2 | Aspecto de plantilla genérica, 3 bordes laterales de acento, filas de 149 px, no existe página pública |
| **Total** | | **12/20** | **Aceptable: requiere trabajo significativo** |

### Veredicto de integridad
No pasa como sistema propio del producto. El código es ordenado y accesible (CSP, enlace de salto, `aria-label` en cada acción, `textContent` en lugar de `innerHTML`, `table-responsive` en las 21 tablas), pero la interfaz es la plantilla de Bootstrap sin identidad y sin una decisión de densidad para tareas operativas.

## Lo que encontré en el backend

- **Ya es una API REST pura.** 30 clases `@RestController`, 148 endpoints bajo `/api`, DTOs como `record` (`ClubResponse`, `ActividadResponse`, `EvidenciaResponse`…), paginación uniforme `PaginaResponse<T>(contenido, pagina, tamano, totalElementos, totalPaginas)`, JWT sin estado, errores con `ProblemDetail` en `GlobalExceptionHandler` y CORS para `:5500`. No hay vistas del servidor (no es un monolito MVC).
- **Reparto de endpoints:** 66 GET, 33 POST, 24 PUT, 20 PATCH, 5 DELETE. 20 altas responden 201 con `@ResponseStatus`; ninguna respuesta incluye la cabecera `Location`.
- **Seguridad:** 127 anotaciones `@PreAuthorize` cubren todos los controladores salvo los públicos (login, recuperación de contraseña y verificación de certificados); el alcance por institución se aplica además en los servicios.
- **Datos reales (sesión admin):** 7 instituciones, 54 clubes (46 activos), 47 docentes activos, 120 usuarios activos, período activo 2026-2027.
- **Falta:** documentación OpenAPI, pruebas automáticas, un endpoint de resumen para el panel y uno público de cifras agregadas para la landing.

## Matriz de mejoras

### A. API (PASO 2)

| Before (Old Code/UI) | After (Proposed Improvement) | Technical & Design Reason |
|---|---|---|
| Controladores devuelven el DTO directamente; 20 altas usan `@ResponseStatus(CREATED)`, las demás respuestas van con 200 y ninguna envía `Location` | `ResponseEntity<DTO>` uniforme: `201 Created` + `Location` en altas, `204` en bajas, `200` en el resto | Contrato HTTP predecible para el cliente de Next.js y para las pruebas |
| Sin documentación del contrato de 148 endpoints | `springdoc-openapi` en `/v3/api-docs` y tipos TypeScript generados con `openapi-typescript` | El frontend nuevo consume tipos generados; un cambio de DTO rompe la compilación, no la pantalla |
| El panel arma 6 indicadores con 6 llamadas `?tamano=1` | `GET /api/panel/resumen` con los indicadores ya filtrados por rol e institución | 1 petición en vez de 6 y el alcance por rol se resuelve en el servidor |
| Los filtros cargan `/api/clubes?tamano=100` e `/api/instituciones?tamano=100` | Endpoints ligeros de opciones `{id, nombre}` con búsqueda (`?q=`) | El selector descarga los 18 campos de cada club en páginas de 100 cuando solo necesita el nombre: 23,8 kB frente a 2,9 kB |
| `API_BASE_URL` fijo y `connect-src http://localhost:8080` repetido en 30 HTML; CORS solo para `:5500` | Variable `NEXT_PUBLIC_API_URL` o `rewrites` de Next.js; orígenes CORS por entorno, incluido `:3000` | Despliegue sin editar archivos y sin errores de CORS |
| JWT en `sessionStorage`, visible para cualquier script | Cookie `httpOnly` + `SameSite=Lax` emitida por un route handler de Next.js (BFF) y protección de rutas con `middleware.ts` | Reduce la exposición del token ante XSS y permite renderizar en servidor según el rol |
| No existe una fuente pública de cifras | `GET /api/publico/estadisticas` solo con agregados (instituciones, clubes activos, sesiones ejecutadas, evidencias) | La landing muestra datos reales sin exponer información personal de estudiantes |

### B. Sistema interno, modo Operate (PASO 3)

| Before (Old Code/UI) | After (Proposed Improvement) | Technical & Design Reason |
|---|---|---|
| Actividades: tarjeta de 9 filtros sobre la tabla; la tabla empieza en y=610 de un alto de 768 px | Barra compacta: búsqueda + Club + Estado + "Más filtros", chips de filtros activos y estado en la URL | Los datos aparecen en la primera pantalla y un filtro se puede compartir con un enlace |
| Filas de 149 px porque club e institución se parten en una columna angosta | Filas de 44–52 px, institución como línea secundaria truncada con tooltip, fechas con `tabular-nums` y encabezado fijo | 10 filas pasan de 1 490 px a ~500 px; se escanea sin desplazarse |
| 4 botones de icono de 32×31 px por fila, con "Eliminar" siempre visible | Una acción principal visible y el resto en un menú "⋯"; eliminar y cancelar con confirmación | Menos ruido y menos clics accidentales en acciones destructivas |
| Evidencias abre vacío y obliga a elegir club → sesión antes de ver algo | Lista por defecto de sesiones ejecutadas recientes con conteo de evidencias y autorizaciones pendientes | El docente llega directo a lo que le falta registrar |
| Panel: 6 tarjetas de conteo con iconos grandes y sin acción | Panel por rol orientado a la tarea: sesiones sin ejecución (hoy 7), clubes en estado crítico (hoy 3), solicitudes pendientes, con enlaces a la lista ya filtrada | En modo Operate el panel responde "qué hago ahora" |
| Barra superior azul sólida y menú de 252 px (25 % del ancho a 1024 px) con más de 20 opciones | Menú lateral de 232 px plegable a iconos, superficie neutra y color de marca solo en el estado activo y la acción principal | Más ancho para las tablas y una jerarquía visual que no compite con los datos |
| Insignias de estado con colores por defecto, distintos entre módulos | Un solo componente `EstadoChip` (punto + texto) para Planificada, Ejecutada, Reprogramada y Cancelada en todos los módulos | Consistencia: el mismo estado se ve igual en actividades, seguimiento y evidencias |
| Alertas con borde lateral grueso (`styles.css:137`, `:261` y una más) | Superficie tintada completa o icono inicial con chip de estado | El detector lo marca como patrón genérico y no aporta jerarquía |
| Móvil: la cuenta de usuario baja a una segunda línea, la tabla de 700 px se desplaza en horizontal y los filtros ocupan más de una pantalla | Lista de tarjetas por fila en `< 768 px`, filtros en una hoja inferior y barra superior de una línea | Los docentes registran asistencia desde el teléfono, en el aula |
| Seguimiento: semáforo con texto y umbrales visibles | Mantenerlo y reutilizar sus colores como tokens de estado del sistema | Es la pantalla más clara del sistema actual: sirve de referencia |

### C. Identidad, landing y motion

| Before (Old Code/UI) | After (Proposed Improvement) | Technical & Design Reason |
|---|---|---|
| `index.html` redirige al login; la única página pública es la verificación de certificados | Landing en modo Persuade: hero, qué es TIPI 3.0, cómo funciona (institución → club → sesión → evidencia), cifras reales, verificación de certificados y acceso | El proyecto necesita explicarse a instituciones, docentes y evaluadores antes del login |
| Paleta Bootstrap, fuente `system-ui`, sin modo oscuro | Tokens propios en `@theme` de Tailwind (OKLCH): superficie, tinta, acento y estados; tipografía definida con la skill taste; modo oscuro | Identidad propia y contraste AA verificable en ambos temas |
| Login: tarjeta centrada genérica | Login con los mismos tokens que la landing y el contexto del proyecto a un lado | Continuidad entre la cara pública y el sistema |
| Sin sistema de motion: solo el fade de los modales de Bootstrap y nada para `prefers-reduced-motion` | Framer Motion con curvas `ease-out` (cero `ease-in`), duraciones menores a 300 ms, springs en menús, hojas y popovers, y entradas desde `scale(0.9)` + opacidad; versión reducida que conserva el cambio de estado | Respuesta inmediata y consistente; los resortes permiten interrumpir una animación sin saltos |
| — | Sin animación en tablas, filtros ni atajos de teclado del sistema interno | En pantallas que se usan cientos de veces al día la animación se vuelve fricción |

## Hallazgos por severidad

- **P1** Contraste 4.3:1 del azul primario sobre fondo claro (WCAG 1.4.3). Comando: `$impeccable colorize` al definir los tokens.
- **P1** Móvil de actividades y asistencia: filtros de más de una pantalla y tabla con desplazamiento horizontal. Comando: `$impeccable adapt`.
- **P1** Densidad de las tablas (149 px por fila) y filtros sobre el pliegue. Comando: `$impeccable layout`.
- **P2** Evidencias sin estado inicial útil. Comando: `$impeccable onboard`.
- **P2** Panel sin acciones. Comando: `$impeccable shape`.
- **P2** Bordes laterales de acento ×3. Comando: `$impeccable quieter`.
- **P2** Selectores que descargan registros completos, página por página. Comando: `$impeccable harden`.
- **P3** Botones de acción de 32×31 px (cumplen el mínimo AA de 24 px, no los 44 px recomendados). Comando: `$impeccable adapt`.

Falsos positivos descartados: las 2 imágenes "sin `src`" de `evidencias.html` son vistas previas que llena el JS.

## Lo que funciona y hay que conservar

- Accesibilidad de base: enlace de salto, `aria-label` descriptivos ("Eliminar: S13 Sesión a reprogramar"), `aria-live` en alertas y etiquetas en todos los campos.
- Seguridad del cliente: CSP estricta y construcción del DOM con `textContent`.
- Contrato de API limpio con DTOs y paginación uniforme: el PASO 2 es de ajuste, no de reescritura.
- Seguimiento con semáforo textual y umbrales explícitos.

## Pendiente de este diagnóstico

- Los usuarios de prueba de `docs/pruebas` (f10coord, f10resp1, f10doc1) no aceptaron la contraseña actual del admin, porque su hash se copió cuando el admin tenía otra contraseña. La vista por rol de docente y responsable quedó revisada solo en código.

## Acciones recomendadas

1. **[P1] `$impeccable shape`**: estructurar el sistema interno en modo Operate (panel, actividades, evidencias).
2. **[P1] `$impeccable layout`**: densidad de tablas y barra de filtros.
3. **[P1] `$impeccable adapt`**: tarjetas y hoja de filtros en móvil.
4. **[P1] `$impeccable colorize`**: tokens con contraste AA.
5. **[P2] `$impeccable onboard`**: estado inicial de evidencias.
6. **[P2] `$impeccable harden`**: selectores con búsqueda en el servidor.
7. **[P2] `$impeccable quieter`**: retirar los bordes laterales.
8. **`$impeccable polish`**: pasada final.
