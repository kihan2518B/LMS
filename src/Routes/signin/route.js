const express = require('express');
const router = express.Router()

// for login
router.post("/session",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (request, response) => {
        // console.log(request.user);
        if (request.user.role == "Educator") {
            response.redirect("/Educator-Dashboard");
        } else if (request.user.role == "Student") {
            response.redirect("/Student-Dashboard");
        } else {
            response.redirect("/");
        }
    },);

//change Password
router.get("/changepassword", async (request, response) => {

    response.render("changepassword", {
        title: "Change Your Password",
        csrfToken: request.csrfToken(),
    });
});
router.put("/changepassword", async (request, response) => {
    const userEmail = request.body.email;
    const newPassword = request.body.password;
    if (!userEmail || !newPassword) {
        request.flash("error", "Please Enter Both userEmail and Newpassword")
    }
    const hashedPwd = await bcrypt.hash(newPassword, saltRounds);
    const CurrentUser = await user.findOne({
        where: {
            email: userEmail
        }
    });
    try {
        const afterUpdate = await CurrentUser.update({ password: hashedPwd });
        return response.redirect('/login');
    } catch (error) {
        console.log(error);
        return response.status(422).json(error);
    }
})

//signout
router.get("/signout", (request, response, next) => {
    request.logout((err) => {
        if (err) {
            return next(err);
        }
        response.redirect("/");
    });
});