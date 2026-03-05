# Build stage
FROM maven:3.9.6-eclipse-temurin-21 AS builder

WORKDIR /build

# Copy pom
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source
COPY src ./src

# Build jar
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

# Tạo user không phải root
RUN addgroup --system spring && adduser --system spring --ingroup spring
USER spring

# Copy file jar
COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]