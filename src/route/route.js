const express = require("express");
const router = express.Router();
const controller = require("../controller/controller");

router.get("/auth/google", controller.generateAuthUrl);
router.get("/google/redirect", controller.handleGoogleRedirect);
router.get("/account/analytics", controller.getAnalytics);
router.get("/account/revoke", controller.revokeAccessAndDeleteUser);

module.exports = router;
