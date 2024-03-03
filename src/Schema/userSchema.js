const mongoose = require('mongoose');
const connect = require("../config/db.config")
const userSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true,
    }
},
    {
        timestamps: true
    });

module.exports = userSchema;