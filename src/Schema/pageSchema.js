const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    chapterID: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    });

module.exports = pageSchema;