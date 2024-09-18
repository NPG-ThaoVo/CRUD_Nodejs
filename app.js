const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const connectDB = require("./config/database");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Kết nối database
connectDB();

app.use(express.json());

// Swagger configuration
const swaggerOptions = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "User Management API",
			version: "1.0.0",
		},
	},
	apis: ["./routes/*.js"], // Đường dẫn tới các file chứa routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server đang chạy trên cổng ${PORT}`);
});
