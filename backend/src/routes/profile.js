const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateChangePassword, validateUpdateProfile } = require('../middleware/validator');
const upload = require('../middleware/upload').raw;

// Static routes must come before parameterized routes
router.get('/me', auth, profileController.getCurrentUser);
router.get('/:username', optionalAuth, profileController.getUserProfile);
router.put('/', auth, validateUpdateProfile, profileController.updateProfile);
router.put('/password', auth, validateChangePassword, profileController.changePassword);
router.post('/avatar', auth, upload.single('avatar'), profileController.uploadAvatar);
router.post('/background', auth, upload.single('background'), profileController.uploadBackground);
router.delete('/background', auth, profileController.deleteBackground);

module.exports = router;