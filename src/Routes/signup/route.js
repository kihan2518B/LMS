//Sign up Route
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const user = require('../../models/user');


//Signup
router.get("/signup", async (req, res) => {
    res.render("signup", {
        title: "SignUp",
        csrfToken: req.csrfToken(),
    });
})


//for signup
router.post("/users", async (req, res) => {
    const { fullName, email, password } = req.body;

    // Check if the password is empty
    if (!password || !fullName || !email) {
        // Flash an error message
        req.flash( //for flasing
            "error",
            "Password and fullname and Email are must required!",
        );
        // Redirect to the same page or a designated error page
        return res.redirect("/signup"); // You can customize the redirect URL
    }
    let saltRounds = 10;
    //Hashing The password
    const hashedPwd = await bcrypt.hash(req.body.password, saltRounds);
    // console.log(hashedPwd);
    //have to create User
    // console.log(req.body);
    try {
        const users = await user.create({
            role: req.body.role,
            fullName: req.body.fullName,
            email: req.body.email,
            password: hashedPwd,
        });
        req.login(users, (err) => {
            if (err) {
                console.log(err);
            }
            const role = req.body.role;
            if (role === "Educator") {
                res.redirect("/Educator-Dashboard");
            } else if (role === "Student") {
                res.redirect("/Student-Dashboard");
            }
        });
    } catch (error) {
        console.log(error);
    }
});

module.exports = router