// middleware/auth.js
const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting 'Bearer TOKEN'

  if (!token) {
    return res.status(401).json({ error: 'Access token is missing or invalid.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user; // Attach user information to the request object
    next();
  });
};

