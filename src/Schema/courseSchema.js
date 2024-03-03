const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    });

module.exports = courseSchema;