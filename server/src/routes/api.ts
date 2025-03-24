import express from "express";

const router = express.Router();

// GET /api/data
router.get("/data", (req, res) => {
  res.json({
    message: "API 데이터 응답 성공",
    data: [
      { id: 1, name: "항목 1" },
      { id: 2, name: "항목 2" },
      { id: 3, name: "항목 3" },
    ],
  });
});

export default router;
