const express = require('express');
const router = express.Router();
const passport = require('passport');


// for login
router.get('/login', async (req, res) => {
    // console.log(req.user);
    res.render('login', {
        title: "Login",
        csrfToken: req.csrfToken(),
    })
})

router.post("/session",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        // console.log(req.user);
        if (req.user.role == "Educator") {
            res.redirect("/Educator-Dashboard");
        } else if (req.user.role == "Student") {
            res.redirect("/Student-Dashboard");
        } else {
            res.redirect("/");
        }
    },);

//change Password
router.get("/changepassword", async (req, res) => {

    res.render("changepassword", {
        title: "Change Your Password",
        csrfToken: req.csrfToken(),
    });
});
router.put("/changepassword", async (req, res) => {
    const userEmail = req.body.email;
    const newPassword = req.body.password;
    if (!userEmail || !newPassword) {
        req.flash("error", "Please Enter Both userEmail and Newpassword")
    }
    const hashedPwd = await bcrypt.hash(newPassword, saltRounds);
    const CurrentUser = await user.findOne({
        where: {
            email: userEmail
        }
    });
    try {
        const afterUpdate = await CurrentUser.update({ password: hashedPwd });
        return res.redirect('/login');
    } catch (error) {
        console.log(error);
        return res.status(422).json(error);
    }
})

//signout
router.get("/signout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

module.exports = router