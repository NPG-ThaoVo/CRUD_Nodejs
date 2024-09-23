const jwt = require("jsonwebtoken");
const User = require("../models/User");

function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (token == null) {
		console.log("Token is null, sending 401");
		return res.sendStatus(401);
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
		if (err) {
			console.log("Token verification failed:", err);
			return res.sendStatus(403);
		}
		console.log("Token verified successfully, user:", user);
		req.user = user;
		next();
	});
}

module.exports = { authenticateToken };
