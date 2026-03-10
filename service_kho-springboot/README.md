# Service Kho Spring Boot

This project is a Spring Boot application that manages warehouse operations. It provides a RESTful API for performing CRUD operations on warehouse entities.

## Project Structure

```
service_kho-springboot
├── src
│   ├── main
│   │   ├── java
│   │   │   └── com
│   │   │       └── example
│   │   │           └── servicekho
│   │   │               ├── ServiceKhoApplication.java
│   │   │               ├── controller
│   │   │               │   └── WarehouseController.java
│   │   │               ├── service
│   │   │               │   └── WarehouseService.java
│   │   │               ├── repository
│   │   │               │   └── WarehouseRepository.java
│   │   │               ├── model
│   │   │               │   └── Warehouse.java
│   │   │               └── dto
│   │   │                   └── WarehouseDto.java
│   │   └── resources
│   │       ├── application.yml
│   │       └── data.sql
│   └── test
│       └── java
│           └── com
│               └── example
│                   └── servicekho
│                       └── ServiceKhoApplicationTests.java
├── pom.xml
├── .gitignore
└── README.md
```

## Features

- **Warehouse Management**: Create, read, update, and delete warehouse records.
- **RESTful API**: Interact with the application using standard HTTP methods.
- **Database Initialization**: Sample data is loaded into the database on startup.

## Getting Started

### Prerequisites

- Java 11 or higher
- Maven

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd service_kho-springboot
   ```
3. Build the project:
   ```
   mvn clean install
   ```

### Running the Application

To run the application, use the following command:
```
mvn spring-boot:run
```

The application will start on the default port 8080. You can access the API at `http://localhost:8080`.

## API Endpoints

- `GET /warehouses`: Retrieve all warehouses.
- `GET /warehouses/{id}`: Retrieve a warehouse by ID.
- `POST /warehouses`: Create a new warehouse.
- `PUT /warehouses/{id}`: Update an existing warehouse.
- `DELETE /warehouses/{id}`: Delete a warehouse.

## License

This project is licensed under the MIT License. See the LICENSE file for details.