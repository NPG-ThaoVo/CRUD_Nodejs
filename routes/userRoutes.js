const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require("mongoose");
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách tất cả users
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

module.exports = router;
