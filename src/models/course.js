const mongoose = require('mongoose');
const courseSchema = require('../Schema/courseSchema');

const course = new mongoose.model('courses', courseSchema);

module.exports = course;