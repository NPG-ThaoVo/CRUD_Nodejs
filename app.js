const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const connectDB = require("./config/database");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");

const app = express();
// const cors = require("cors");
// app.use(cors());
// Kết nối database
connectDB();

app.use(express.json());

const cors = require("cors");
const corsOptions = {
	origin: "*",
	credentials: true, //access-control-allow-credentials:true
	optionSuccessStatus: 200,
};
app.use(cors());

// Swagger configuration
const swaggerOptions = require("./swagger");

const specs = swaggerJsdoc(swaggerOptions);

app.use(
	"/api-docs",
	swaggerUi.serve,
	swaggerUi.setup(specs, {
		swaggerOptions: {
			persistAuthorization: true,
		},
	})
);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server đang chạy trên cổng ${PORT}`);
});
require("dotenv").config({ path: "./.env" });
