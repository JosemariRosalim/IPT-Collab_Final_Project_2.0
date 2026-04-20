const express = require("express");
const {
  getSalesReport,
  getMonthlySalesReport,
  getYearlySalesReport,
  getInventoryReport,
} = require("../../controllers/superadmin/report-controller");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { checkSuperAdmin } = require("../../middleware/superadmin-middleware");

const router = express.Router();

router.use(authMiddleware);
// router.use(checkSuperAdmin); // Temporarily disabled for testing

router.get("/sales", getSalesReport);
router.get("/sales/monthly", getMonthlySalesReport);
router.get("/sales/yearly", getYearlySalesReport);
router.get("/inventory", getInventoryReport);

module.exports = router;


