// auth.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ message: "Invalid token format" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded; // contains { id }
    next();
  });
};
