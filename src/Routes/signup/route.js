//Sign up Route
const express = require('express');
const router = express.Router();

//Signup
router.get("/signup", async (request, response) => {
    response.render("signup", {
        title: "SignUp",
        csrfToken: request.csrfToken(),
    });
})


//for signup
router.post("/users", async (request, response) => {
    const { fullName, email, password } = request.body;

    // Check if the password is empty
    if (!password || !fullName || !email) {
        // Flash an error message
        request.flash( //for flasing
            "error",
            "Password and fullname and Email are must required!",
        );
        // Redirect to the same page or a designated error page
        return response.redirect("/signup"); // You can customize the redirect URL
    }
    //Hashing The password
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
    // console.log(hashedPwd);
    //have to create User
    // console.log(request.body);
    try {
        const users = await user.create({
            role: request.body.role,
            fullName: request.body.fullName,
            email: request.body.email,
            password: hashedPwd,
        });
        request.login(users, (err) => {
            if (err) {
                console.log(err);
            }
            const role = request.body.role;
            if (role === "Educator") {
                response.redirect("/Educator-Dashboard");
            } else if (role === "Student") {
                response.redirect("/Student-Dashboard");
            }
        });
    } catch (error) {
        console.log(error);
    }
});