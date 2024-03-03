const mongoose = require('mongoose');

const connect = mongoose.connect("mongodb+srv://kp648027:kishan@cluster0.ihvropz.mongodb.net/lms?retryWrites=true&w=majority&appName=Cluster0");

connect.then(() => {
    console.log("Database connected successfully");
})
    .catch((error) => {
        console.log("Error while connecting to database");
        console.log(error)
    })
module.exports = connect