const mongoose = require("mongoose");

const connectDB = async () => {
	try {
		await mongoose.connect(
			"mongodb+srv://hanthanhvan2:XdMhcne6bPsOG250@crud.qxj9b.mongodb.net",
			{
				useNewUrlParser: true,
				useUnifiedTopology: true,
			}
		);
		console.log("Đã kết nối với MongoDB");
	} catch (error) {
		console.error("Lỗi kết nối MongoDB:", error.message);
		process.exit(1);
	}
};

module.exports = connectDB;
