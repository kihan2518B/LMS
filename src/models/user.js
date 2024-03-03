const mongoose = require('mongoose');
const userSchema = require('../Schema/userSchema');


const user = new mongoose.model("users", userSchema);

module.exports = user