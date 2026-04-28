const express = require('express');
const asyncHandler = require('../../middlewares/asyncHandler');
const { listSystemTexts } = require('./systemTexts.controller');

const router = express.Router();

router.get('/', asyncHandler(listSystemTexts));

module.exports = router;
