const mongoose = require('mongoose');
const pageSchema = require('../Schema/pageSchema');


const page = new mongoose.model("pages", pageSchema);

module.exports = page;