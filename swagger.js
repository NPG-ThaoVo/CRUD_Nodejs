const swaggerOptions = {
	// ... các cấu hình khác ...
	securityDefinitions: {
		bearerAuth: {
			type: "apiKey",
			name: "Authorization",
			scheme: "bearer",
			in: "header",
		},
	},
	security: [
		{
			bearerAuth: [],
		},
	],
	swaggerOptions: {
		authAction: {
			bearerAuth: {
				name: "bearerAuth",
				schema: {
					type: "apiKey",
					in: "header",
					name: "Authorization",
					description: "Nhập token JWT của bạn",
				},
				value: "Bearer <JWT_TOKEN>",
			},
		},
	},
	swaggerDefinition: {
		// Thay đổi từ 'definition' thành 'swaggerDefinition'
		openapi: "3.0.0",
		info: {
			title: "API của bạn",
			version: "1.0.0",
			description: "Mô tả API của bạn",
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		},
		security: [
			{
				bearerAuth: [],
			},
		],
	},
	apis: ["./routes/*.js"], // đường dẫn tới các file chứa routes của bạn
};

module.exports = swaggerOptions;
