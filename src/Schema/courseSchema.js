const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    userID: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    }
});

module.exports = courseSchema;