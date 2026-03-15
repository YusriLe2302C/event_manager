const router = require('express').Router();
const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { rules, validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimiter.middleware');
const { loginAttemptGuard } = require('../middleware/loginProtection.middleware');

router.post('/register',         authLimiter, rules.register, validate, register);
router.post('/register/faculty', authLimiter, rules.register, validate, (req, res, next) => {
  req.body.role = 'faculty';
  register(req, res, next);
});
router.post('/login',    authLimiter, loginAttemptGuard, rules.login, validate, login);
router.post('/refresh',  refreshLimiter, refresh);
router.post('/logout',   verifyToken, logout);

module.exports = router;
