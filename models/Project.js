const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		startDate: {
			type: Date,
			default: Date.now,
		},
		endDate: Date,
		status: {
			type: String,
			enum: ["New", "Delete"],
			default: "New",
		},
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		members: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Project", projectSchema);
