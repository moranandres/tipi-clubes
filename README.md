# TIPI 3.0 · Sistema de gestión de clubes de robótica y programación

Sistema web multiinstitucional para administrar, monitorear y evaluar los clubes de robótica y programación de las instituciones educativas fiscales de la Zona 8 adheridas al proyecto de vinculación TIPI 3.0.

## Estructura del repositorio

| Carpeta | Contenido |
| --- | --- |
| `backend/` | API REST con Java 17, Spring Boot 4, Spring Security (JWT), Flyway y PostgreSQL. |
| `web/` | Frontend oficial con Next.js 16 (App Router, Cache Components) y Tailwind CSS 4. Es el único frontend del sistema. |
| `herramientas/tipos-api/` | Descarga el documento OpenAPI del backend y genera `web/src/lib/api/tipos-api.d.ts`. |
| `docs/` | Diagnóstico inicial, modelo entidad-relación y scripts SQL de pruebas. |

El antiguo frontend estático (`frontend/`, HTML + Bootstrap servido en el puerto 5500) se retiró en el Paso 4. Sus flujos de contraseña (cambio obligatorio de la clave temporal, recuperación y restablecimiento) viven ahora en `web/` en `/cambiar-clave`, `/recuperar` y `/restablecer`. Los enlaces antiguos `verificar-certificado.html` y `restablecer.html` redirigen a `/verificar` y `/restablecer`.

## Desarrollo local

Requisitos: JDK 17 o superior, Node.js 20.9 o superior y PostgreSQL 15 o superior.

1. Crear la base de datos local `tipi_clubes` en PostgreSQL.
2. Backend (perfil `dev` por defecto, aplica las migraciones y los datos semilla de desarrollo):

   ```powershell
   cd backend
   ./mvnw spring-boot:run
   ```

   La API queda en `http://localhost:8080` y la documentación en `http://localhost:8080/swagger-ui.html`. Los valores locales se pueden ajustar copiando `backend/.env.example` a `backend/.env`.

3. Frontend:

   ```powershell
   cd web
   npm install
   npm run dev
   ```

   El portal queda en `http://localhost:3000`. Si el backend corre en otra dirección, crear `web/.env.local` a partir de `web/.env.example`.

4. Tras cambiar DTOs del backend, regenerar los tipos con `npm run api:tipos` desde `web/` (con el backend levantado).

### Verificaciones

```powershell
cd backend
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/tipi_clubes_pruebas"; ./mvnw test
./mvnw -DskipTests package
```

`TipiBackendApplicationTests` levanta el contexto completo y aplica Flyway sobre la base indicada: apuntar siempre a una base de pruebas, nunca a la real.

```powershell
cd web
npx next typegen
npm run lint
npm run tipos
npm run build
```

## Despliegue en producción

El despliegue recomendado usa `docker-compose.prod.yml`, que levanta tres servicios con volúmenes persistentes:

| Servicio | Imagen | Detalle |
| --- | --- | --- |
| `db` | `postgres:16-alpine` | Datos en el volumen `tipi_db`. No publica puertos. |
| `backend` | `backend/Dockerfile` | Perfil `prod`, Flyway valida y migra el esquema (`ddl-auto=validate`). Archivos subidos en el volumen `tipi_archivos`. Solo accesible dentro de la red de Docker. |
| `web` | `web/Dockerfile` | Servidor `standalone` de Next.js en el puerto 3000, publicado en `127.0.0.1` para el proxy inverso. |

Pasos:

1. Copiar `.env.example` a `.env` en la raíz y completar los valores (ver la tabla siguiente). Para generar el secreto JWT:

   ```powershell
   openssl rand -base64 48
   ```

2. Construir y levantar:

   ```powershell
   docker compose -f docker-compose.prod.yml --env-file .env up -d --build
   ```

3. Publicar `web` detrás de un proxy inverso con HTTPS (Nginx, Caddy o balanceador) que apunte a `127.0.0.1:3000` y reenvíe `Host`, `X-Forwarded-For` y `X-Forwarded-Proto`. El backend no necesita exponerse: `web` lo consume por la red interna (`http://backend:8080`).
4. En el primer arranque, si la base está vacía, se crea el usuario `admin` con `ADMIN_INITIAL_PASSWORD`; el sistema obliga a cambiarla en el primer acceso.
5. Respaldar periódicamente los volúmenes `tipi_db` (o un `pg_dump`) y `tipi_archivos`: este último guarda los PDF e imágenes de autorizaciones, evidencias y certificados, y en PostgreSQL solo quedan sus metadatos y rutas.

El backend se niega a arrancar con el perfil `prod` si `JWT_SECRET` tiene menos de 64 caracteres o parece una clave de ejemplo, si falta `FRONTEND_BASE_URL` o si `CORS_ALLOWED_ORIGINS` está vacío o usa comodines.

### Variables de entorno del backend

| Variable | Obligatoria en prod | Valor por defecto (dev) | Descripción |
| --- | --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Sí (`prod`) | `dev` | `dev` carga datos semilla y Swagger; `prod` solo migraciones y validaciones estrictas. |
| `SERVER_PORT` | No | `8080` | Puerto HTTP del backend. |
| `SPRING_DATASOURCE_URL` | Sí | `jdbc:postgresql://localhost:5432/tipi_clubes` | URL JDBC de PostgreSQL. |
| `SPRING_DATASOURCE_USERNAME` | Sí | `postgres` | Usuario de la base. |
| `SPRING_DATASOURCE_PASSWORD` | Sí | Clave local de desarrollo | Contraseña de la base. |
| `DB_POOL_MAX` | No | `10` | Conexiones máximas del pool en producción. |
| `JWT_SECRET` | Sí | Clave de desarrollo | Secreto HMAC del JWT; en prod mínimo 64 caracteres aleatorios. |
| `JWT_EXPIRATION_MINUTES` | No | `30` | Vigencia de la sesión en minutos. |
| `TOKENS_LIMPIEZA_CRON` | No | `0 0 3 * * *` | Cron de limpieza de tokens revocados y de recuperación. |
| `FRONTEND_BASE_URL` | Sí | `http://localhost:3000` | URL pública de `web/`; arma los enlaces y QR de certificados (`/verificar`) y de recuperación (`/restablecer`). |
| `CORS_ALLOWED_ORIGINS` | Sí | `http://localhost:3000,http://127.0.0.1:3000` | Orígenes permitidos separados por comas, sin comodines. |
| `APP_STORAGE_DIR` | Sí | `./uploads` | Carpeta de archivos subidos; en prod debe ser un volumen persistente. Acepta también el nombre antiguo `STORAGE_DIR`. |
| `ADMIN_INITIAL_PASSWORD` | Solo con base vacía | `Cambiar#2026` | Clave temporal del usuario `admin` inicial. En prod no tiene valor por defecto. |
| `MAIL_HOST`, `MAIL_PORT` | Sí, para recuperar contraseñas | `localhost`, `1025` | Servidor SMTP. |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Según el SMTP | Vacíos | Credenciales SMTP. |
| `MAIL_SMTP_AUTH`, `MAIL_STARTTLS` | Según el SMTP | `false`, `false` | Autenticación y STARTTLS. |
| `MAIL_FROM` | No | `TIPI 3.0 <no-responder@tipi.local>` | Remitente de los correos. |
| `RECUPERACION_MINUTOS_VALIDEZ` | No | `30` | Vigencia del enlace de recuperación. |
| `OPENAPI_ENABLED` | No | `true` en dev, `false` en prod | Publica `/v3/api-docs` y Swagger UI. |
| `PUBLIC_STATS_CACHE_SECONDS` | No | `300` | Caché de las estadísticas públicas. |

### Variables de entorno de `web/`

| Variable | Obligatoria en prod | Valor por defecto | Descripción |
| --- | --- | --- | --- |
| `API_URL` | Sí | `http://localhost:8080` | URL del backend vista desde el servidor de Next.js (en Docker, `http://backend:8080`). Se lee al arrancar, no al compilar. `NEXT_PUBLIC_API_URL` se acepta como respaldo. |
| `SESION_COOKIE_SEGURA` | No | Automático | La cookie `tipi_sesion` es `httpOnly` y `SameSite=Lax`, y lleva `Secure` cuando `NODE_ENV=production`. `true` o `false` fuerzan el valor (por ejemplo `false` para probar el build en HTTP fuera de `localhost`). |
| `PORT`, `HOSTNAME` | No | `3000`, `0.0.0.0` | Dirección del servidor `standalone`. |

### Variables del `docker-compose.prod.yml`

Además de las anteriores, el archivo `.env` de la raíz define `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` (usadas por `db` y por el backend), `WEB_BIND` y `WEB_PORT` (dónde se publica `web`, por defecto `127.0.0.1:3000`) y `TIPI_VERSION` (etiqueta de las imágenes).
