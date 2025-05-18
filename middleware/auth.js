const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Make sure this path is correct

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔽 Use decoded.id or decoded._id based on how your token was signed
    const user = await User.findById(decoded.id || decoded._id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
