const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
    courseID: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    discription: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    });

module.exports = chapterSchema;