const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const { authenticateToken, checkRole } = require("../middleware/auth");
const User = require("../models/User");
const mongoose = require("mongoose");

/**
 * @swagger
 * tags:
 *   name: PROJECT
 *   description: Quản lý dự án
 */

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Tạo dự án mới
 *     tags: [PROJECT]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Dự án đã được tạo
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không được phép, yêu cầu đăng nhập
 */
router.post("/", authenticateToken, async (req, res) => {
	try {
		// Kiểm tra xem người dùng đã đăng nhập chưa
		if (!req.user || !req.user.userId) {
			return res
				.status(401)
				.json({ message: "Bạn cần đăng nhập để tạo dự án" });
		}
		if (req.body.startDate && req.body.endDate) {
			const startDate = new Date(req.body.startDate);
			const endDate = new Date(req.body.endDate);
			if (endDate < startDate) {
				return res.status(400).json({
					message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
				});
			}
		}
		const existingProject = await Project.findOne({
			name: { $regex: `^${req.body.name}$`, $options: "i" },
			owner: req.user.userId,
		});
		if (existingProject) {
			return res.status(400).json({ message: "Đã tồn tại dự án với tên này" });
		}
		const project = new Project({
			...req.body,
			owner: req.user.userId,
		});
		await project.save();
		res.status(201).json(project);
	} catch (error) {
		console.error("Lỗi khi tạo dự án:", error);
		res.status(400).json({ message: error.message });
	}
});

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Lấy danh sách tất cả dự án
 *     tags: [PROJECT]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách dự án
 */
router.get("/", authenticateToken, async (req, res) => {
	try {
		// Kiểm tra xem người dùng đã đăng nhập chưa
		if (!req.user || !req.user.userId) {
			return res
				.status(401)
				.json({ message: "Bạn cần đăng nhập để xem danh sách dự án" });
		}
		const projects = await Project.find({ owner: req.user.userId });
		res.json(projects);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Lấy thông tin một dự án cụ thể
 *     tags: [PROJECT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin dự án
 *       404:
 *         description: Không tìm thấy dự án
 */
router.get("/:id", authenticateToken, async (req, res) => {
	try {
		// Kiểm tra xem người dùng đã đăng nhập chưa
		if (!req.user || !req.user.userId) {
			return res
				.status(401)
				.json({ message: "Bạn cần đăng nhập để xem thông tin dự án" });
		}
		const project = await Project.findOne({
			_id: req.params.id,
			$or: [{ owner: req.user.userId }, { members: req.user.userId }],
		})
			.populate("owner", "username email")
			.populate("members", "username email");
		if (!project) {
			return res.status(404).json({
				message: "Không tìm thấy dự án hoặc bạn không có quyền truy cập",
			});
		}
		res.json(project);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Cập nhật thông tin dự án
 *     tags: [PROJECT]
 *     security:
 *       - bearerAuth: []
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *               addMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *               removeMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Dự án đã được cập nhật
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không được phép
 *       404:
 *         description: Không tìm thấy dự án
 */
router.put("/:id", authenticateToken, async (req, res) => {
	try {
		// Kiểm tra xem người dùng đã đăng nhập chưa
		if (!req.user || !req.user.userId) {
			return res
				.status(401)
				.json({ message: "Bạn cần đăng nhập để cập nhật dự án" });
		}

		const { addMembers, removeMembers, ...updateData } = req.body;

		// Tìm dự án và kiểm tra quyền sở hữu
		const project = await Project.findOne({
			_id: req.params.id,
			owner: req.user.userId,
		});

		if (!project) {
			return res.status(404).json({
				message: "Không tìm thấy dự án hoặc bạn không có quyền chỉnh sửa",
			});
		}

		// Cập nhật thông tin dự án
		Object.assign(project, updateData);

		// Xử lý thêm thành viên
		if (addMembers && Array.isArray(addMembers)) {
			for (const memberId of addMembers) {
				if (
					mongoose.Types.ObjectId.isValid(memberId) &&
					!project.members.includes(memberId)
				) {
					const userExists = await User.findById(memberId);
					if (userExists) {
						project.members.push(memberId);
					} else {
						console.warn(
							`Người dùng với ID ${memberId} không tồn tại và sẽ bị bỏ qua.`
						);
					}
				} else {
					console.warn(
						`ID không hợp lệ hoặc đã tồn tại trong dự án: ${memberId}`
					);
				}
			}
		}

		// Xử lý xóa thành viên
		if (removeMembers && Array.isArray(removeMembers)) {
			project.members = project.members.filter(
				(memberId) =>
					!removeMembers.includes(memberId.toString()) &&
					mongoose.Types.ObjectId.isValid(memberId)
			);
		}

		// Lưu các thay đổi
		await project.save();

		// Populate thông tin thành viên trước khi trả về
		await project.populate("members", "username email");

		res.json({ message: "Dự án đã được cập nhật thành công", project });
	} catch (error) {
		console.error("Lỗi khi cập nhật dự án:", error);
		res.status(400).json({ message: error.message });
	}
});

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Xóa dự án
 *     tags: [PROJECT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dự án đã được xóa
 *       404:
 *         description: Không tìm thấy dự án
 */
router.delete("/:id", authenticateToken, async (req, res) => {
	try {
		// Kiểm tra xem người dùng đã đăng nhập chưa
		if (!req.user || !req.user.userId) {
			return res
				.status(401)
				.json({ message: "Bạn cần đăng nhập để xóa dự án" });
		}
		const project = await Project.findOneAndDelete({
			_id: req.params.id,
			owner: req.user.userId,
		});
		if (!project) {
			return res.status(404).json({ message: "Không tìm thấy dự án" });
		}
		res.json({ message: "Dự án đã được xóa" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Thêm route mới sau các route hiện có

/**
 * @swagger
 * /api/projects/{id}/members:
 *   post:
 *     summary: Thêm thành viên vào dự án
 *     tags: [PROJECT]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thành viên đã được thêm vào dự án
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không được phép
 *       404:
 *         description: Không tìm thấy dự án hoặc người dùng
 */
router.post("/:id/members", authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;
		const { userId } = req.body;

		// Kiểm tra xem người dùng đã đăng nhập chưa
		if (!req.user || !req.user.userId) {
			return res
				.status(401)
				.json({ message: "Bạn cần đăng nhập để thêm thành viên vào dự án" });
		}

		// Kiểm tra xem dự án có tồn tại không và người dùng hiện tại có phải là chủ sở hữu không
		const project = await Project.findOne({ _id: id, owner: req.user.userId });
		if (!project) {
			return res.status(404).json({
				message: "Không tìm thấy dự án hoặc bạn không có quyền thêm thành viên",
			});
		}

		// Kiểm tra xem người dùng cần thêm có tồn tại không
		const userToAdd = await User.findById(userId);
		if (!userToAdd) {
			return res
				.status(404)
				.json({ message: "Không tìm thấy người dùng cần thêm" });
		}

		// Kiểm tra xem người dùng đã là thành viên của dự án chưa
		if (project.members.includes(userId)) {
			return res
				.status(400)
				.json({ message: "Người dùng đã là thành viên của dự án" });
		}

		// Thêm người dùng vào danh sách thành viên của dự án
		project.members.push(userId);
		await project.save();

		res.json({ message: "Đã thêm thành viên vào dự án thành công" });
	} catch (error) {
		console.error("Lỗi khi thêm thành viên vào dự án:", error);
		res
			.status(500)
			.json({ message: "Lỗi server khi thêm thành viên vào dự án" });
	}
});

module.exports = router;
