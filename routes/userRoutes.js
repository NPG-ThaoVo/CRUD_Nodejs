const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách tất cả users
 *     tags: [USER]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/", async (req, res) => {
	const users = await User.find().select("-password");
	res.json(users);
});

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Tìm kiếm user theo username hoặc email
 *     tags: [USER]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (username hoặc email)
 *     responses:
 *       200:
 *         description: Danh sách user tìm thấy
 *       400:
 *         description: Thiếu từ khóa tìm kiếm
 */
router.get("/search", async (req, res) => {
	try {
		const { q } = req.query;

		if (!q) {
			return res
				.status(400)
				.json({ message: "Vui lòng cung cấp từ khóa tìm kiếm" });
		}

		const users = await User.find({
			$or: [
				{ username: { $regex: q, $options: "i" } },
				{ email: { $regex: q, $options: "i" } },
			],
		}).select("-password");

		res.json({
			message: `Tìm thấy ${users.length} user`,
			users: users,
		});
	} catch (error) {
		console.error("Lỗi khi tìm kiếm user:", error);
		res.status(500).json({ message: "Lỗi server khi tìm kiếm user" });
	}
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết của user theo ID
 *     tags: [USER]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của user
 *     responses:
 *       200:
 *         description: Thông tin chi tiết của user
 *       404:
 *         description: Không tìm thấy user
 */
router.get("/:id", async (req, res) => {
	try {
		const user = await User.findById(req.params.id).select("-password");
		if (!user) {
			return res.status(404).json({ message: "Không tìm thấy user" });
		}
		res.json(user);
	} catch (error) {
		console.error("Lỗi khi lấy thông tin user:", error);
		if (error.kind === "ObjectId") {
			return res.status(400).json({ message: "ID user không hợp lệ" });
		}
		res.status(500).json({ message: "Lỗi server khi lấy thông tin user" });
	}
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Tạo user mới
 *     tags: [USER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đã tạo
 *       400:
 *         description: Lỗi dữ liệu đầu vào
 *       409:
 *         description: Email đã tồn tại
 */
router.post("/", async (req, res) => {
	try {
		// Kiểm tra xem email đã tồn tại chưa
		const existingUser = await User.findOne({ email: req.body.email });
		if (existingUser) {
			return res.status(409).json({ message: "Email đã tồn tại" });
		}

		// Kiểm tra xem username đã tồn tại chưa
		const existingUsername = await User.findOne({
			username: req.body.username,
		});
		if (existingUsername) {
			return res.status(409).json({ message: "Username đã tồn tại" });
		}

		const newUser = new User(req.body);
		await newUser.save();
		res.status(201).json({ message: "User đã được tạo", userId: newUser._id });
	} catch (error) {
		if (error.name === "ValidationError") {
			return res.status(400).json({ message: error.message });
		}
		res.status(500).json({ message: "Lỗi server" });
	}
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Cập nhật thông tin user theo ID
 *     tags: [USER]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy user
 *       409:
 *         description: Email hoặc username đã tồn tại
 */
router.put("/:id", async (req, res) => {
	try {
		const { username, email } = req.body;
		const userId = req.params.id;

		// Kiểm tra xem user có tồn tại không
		const existingUser = await User.findById(userId);
		if (!existingUser) {
			return res.status(404).json({ message: "Không tìm thấy user" });
		}

		// Kiểm tra xem email mới có trùng với user khác không
		if (email && email !== existingUser.email) {
			const emailExists = await User.findOne({ email, _id: { $ne: userId } });
			if (emailExists) {
				return res.status(409).json({ message: "Email đã tồn tại" });
			}
		}

		// Kiểm tra xem username mới có trùng với user khác không
		if (username && username !== existingUser.username) {
			const usernameExists = await User.findOne({
				username,
				_id: { $ne: userId },
			});
			if (usernameExists) {
				return res.status(409).json({ message: "Username đã tồn tại" });
			}
		}

		// Cập nhật thông tin user
		const updatedUser = await User.findByIdAndUpdate(
			userId,
			{
				$set: {
					...(username && { username }),
					...(email && { email }),
					updatedAt: Date.now(),
				},
			},
			{ new: true, runValidators: true }
		).select("-password");

		if (!updatedUser) {
			return res.status(404).json({ message: "Không tìm thấy user" });
		}

		res.json({ message: "Cập nhật user thành công", user: updatedUser });
	} catch (error) {
		console.error("Lỗi khi cập nhật user:", error);
		if (error.name === "ValidationError") {
			return res.status(400).json({ message: error.message });
		}
		res.status(500).json({ message: "Lỗi server khi cập nhật user" });
	}
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Xóa user theo ID
 *     tags: [USER]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.delete("/:id", async (req, res) => {
	try {
		// Kiểm tra tính hợp lệ của ID
		if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
			return res.status(404).json({ message: "Không tìm thấy user" });
		}
		const deletedUser = await User.findByIdAndDelete(req.params.id);
		if (!deletedUser) {
			return res.status(404).json({ message: "Không tìm thấy user" });
		}
		return res.status(200).json({ message: "User đã được xóa thành công" });
	} catch (error) {
		console.error("Lỗi khi xóa user:", error);
		return res.status(500).json({ message: "Lỗi server khi xóa user" });
	}
});

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [USER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Lỗi dữ liệu đầu vào
 *       409:
 *         description: Email hoặc username đã tồn tại
 */
router.post("/register", async (req, res) => {
	try {
		const { username, email, password } = req.body;

		// Kiểm tra xem email hoặc username đã tồn tại chưa
		const existingUser = await User.findOne({ $or: [{ email }, { username }] });
		if (existingUser) {
			return res
				.status(409)
				.json({ message: "Email hoặc username đã tồn tại" });
		}

		// Mã hóa mật khẩu
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Tạo user mới
		const newUser = new User({
			username,
			email,
			password: hashedPassword,
		});

		await newUser.save();
		res.status(201).json({ message: "Đăng ký thành công" });
	} catch (error) {
		console.error("Lỗi khi đăng ký:", error);
		res.status(500).json({ message: "Lỗi server khi đăng ký" });
	}
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [USER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       400:
 *         description: Thông tin đăng nhập không hợp lệ
 *       401:
 *         description: Sai email hoặc mật khẩu
 */
router.post("/login", async (req, res) => {
	console.log("JWT_SECRET:", process.env.JWT_SECRET);
	try {
		const { email, password } = req.body;

		// Kiểm tra dữ liệu đầu vào
		if (!email || !password) {
			return res
				.status(400)
				.json({ message: "Vui lòng cung cấp email và mật khẩu" });
		}

		// Tìm user theo email
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
		}

		// Kiểm tra mật khẩu
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
		}

		// Kiểm tra JWT_SECRET
		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET không được định nghĩa");
			return res.status(500).json({ message: "Lỗi cấu hình server" });
		}

		// Tạo JWT token
		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});

		res.json({ message: "Đăng nhập thành công", token });
	} catch (error) {
		console.error("Lỗi khi đăng nhập:", error);
		res
			.status(500)
			.json({ message: "Lỗi server khi đăng nhập", error: error.message });
	}
});

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Đặt lại mật khẩu cho user
 *     tags: [USER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mật khẩu đã được đặt lại
 *       404:
 *         description: Không tìm thấy email
 */
router.post("/forgot-password", async (req, res) => {
	try {
		const { email } = req.body;
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "Không tìm thấy email" });
		}

		// Tạo mật khẩu mới ngẫu nhiên
		const newPassword = Math.random().toString(36).slice(-8);

		// Mã hóa mật khẩu mới
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);

		// Cập nhật mật khẩu mới cho user
		user.password = hashedPassword;
		await user.save();

		res.json({
			message: "Mật khẩu đã được đặt lại thành công",
			newPassword: newPassword,
		});
	} catch (error) {
		console.error("Lỗi khi đặt lại mật khẩu:", error);
		res.status(500).json({ message: "Lỗi server khi đặt lại mật khẩu" });
	}
});

module.exports = router;
