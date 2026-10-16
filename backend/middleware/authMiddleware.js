const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Authentification requise' });

  jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }, (err, user) => {
    if (err || !user) return res.status(401).json({ message: 'Session invalide, veuillez vous reconnecter' });
    req.user = user;
    next();
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }, (err, user) => {
    if (!err && user) req.user = user;
    next();
  });
};

module.exports = { authenticateToken, requireRole, optionalAuth };

