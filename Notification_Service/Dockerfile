# Build stage
FROM maven:3.9.6-eclipse-temurin-21 AS builder

WORKDIR /build

# Copy pom
COPY pom.xml .

# Copy source
COPY src ./src

# Build jar
RUN mvn -B clean package -DskipTests -Dmaven.wagon.http.retryHandler.count=5

# Runtime stage
FROM gcr.io/distroless/java21-debian12:nonroot

WORKDIR /app

# Copy file jar
COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","/app/app.jar"]