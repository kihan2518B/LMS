const mongoose = require('mongoose');
const chapterSchema = require('../Schema/chapterSchema');

const chapter = new mongoose.model('chapters', chapterSchema);

module.exports = chapter;