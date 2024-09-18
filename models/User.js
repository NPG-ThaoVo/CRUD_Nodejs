const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	email: {
		type: String,
		required: true,
		unique: true,
		match: [
			/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
			"Vui lòng nhập email hợp lệ",
		],
	},
	password: { type: String, required: true },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Thêm index cho email để tăng tốc độ truy vấn và đảm bảo tính duy nhất
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
