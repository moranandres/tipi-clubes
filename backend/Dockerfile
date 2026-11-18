FROM eclipse-temurin:17-jdk-jammy AS construccion
WORKDIR /fuente
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B -DskipTests package && cp target/tipi-backend-*.jar /fuente/aplicacion.jar

FROM eclipse-temurin:17-jre-jammy
RUN groupadd --system tipi && useradd --system --gid tipi --home-dir /app --shell /usr/sbin/nologin tipi \
    && mkdir -p /app /var/lib/tipi/archivos \
    && chown -R tipi:tipi /app /var/lib/tipi
WORKDIR /app
COPY --from=construccion --chown=tipi:tipi /fuente/aplicacion.jar /app/aplicacion.jar
USER tipi
ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080 \
    APP_STORAGE_DIR=/var/lib/tipi/archivos \
    TZ=America/Guayaquil \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom"
VOLUME ["/var/lib/tipi/archivos"]
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/aplicacion.jar"]
