const express = require("express");
const app = express();
const { course, chapter, user } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const passport = require("passport");
const ConnectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"])); //THE TEXT SHOULD BE OF 32 CHARACTERS ONLY
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(
    session({
        secret: "my-super-secret-key-21728172615261562",
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, //24hrs
        },
    }),
)

app.use(passport.initialize());
app.use(passport.session());

//define a local strategy
passport.use(
    new LocalStrategy(
        {
            usernameField: "email",
            passwordField: "password",
            role: "role",
        },
        (email, password, done) => {
            user.findOne({ where: { email: email } })
                .then(async function (user) {
                    if (!user) {
                        console.log("Not A user");
                        return done(null, false);
                    }
                    const result = await bcrypt.compare(password, user.password);
                    if (!result) {
                        return done(null, false)
                    }
                    if (user.role === "Educator") {
                        return done(null, user);
                    } else if (user.role === "Student") {
                        return done(null, user);
                    } else {
                        return done(null, false)
                    }
                })
                .catch((err) => {
                    return done(err);
                });
        },
    ),
);

passport.serializeUser((user, done) => {
    console.log("serializing user in session ", user.id);
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    user.findByPk(id)
        .then((user) => {
            done(null, user);
        })
        .catch((error) => {
            done(error, null);
        });
});
//Home Page
app.get("/", async (request, response) => {
    response.render("home", { title: 'MY school' });
});

//Signup
app.get("/signup", async (request, response) => {
    response.render("signup", {
        title: "SignUp",
        csrfToken: request.csrfToken(),
    });
})

app.post("/users", async (request, response) => {
    const { fullName, email, password } = request.body;

    // Check if the password is empty
    // if (!password || !firstName || !email) {
    //     // Flash an error message
    //     request.flash( //for flasing
    //         "error",
    //         "Password and firstname and Email are must required!",
    //     );
    //     // Redirect to the same page or a designated error page
    //     return response.redirect("/signup"); // You can customize the redirect URL
    // }
    //Hashing The password
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
    // console.log(hashedPwd);
    //have to create User
    console.log(request.body)
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

app.get("/login", (request, response) => {
    if (request.isAuthenticated()) {
        if (request.user.role == "Educator") {
            response.redirect("/Educator-Dashboard");
        } else if (request.user.role == "Student") {
            response.redirect("/Student-Dashboard");
        }
    } else {
        response.render("login", {
            title: "Login",
            csrfToken: request.csrfToken(),
        });
    }
});
app.post("/session",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (request, response) => {
        console.log(request.user);
        if (request.user.role == "Educator") {
            response.redirect("/Educator-Dashboard");
        } else if (request.user.role == "Student") {
            response.redirect("/Student-Dashboard");
        } else {
            response.redirect("/");
        }
    },);

//signout
app.get("/signout", (request, response, next) => {
    request.logout((err) => {
        if (err) {
            return next(err);
        }
        response.redirect("/");
    });
});


//home page for Educator
app.get("/Educator-Dashboard", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    const AllCourses = await course.findAll(); //all courses in DB
    if (request.user.role == "Student") {
        response.redirect("/Student-Dashboard")
    } else {
        response.render("Educator-Dashboard", {
            title: `${CurrentUser.fullName} Teacher-Dashboard`,
            CurrentUser,
            AllCourses,
            csrfToken: request.csrfToken(),
        });
    }
})

//home page for Students
app.get("/Student-Dashboard", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    if (request.user.role == "Educator") {
        response.redirect("/Educator-Dashboard")
    } else {
        response.render("student-Dashboard", { title: `${CurrentUser.fullName} student-Dashboard` });
    }
});

//page for creating course
app.get("/course", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    response.render("createcourse", {
        title: 'Create New Course',
        csrfToken: request.csrfToken(),
    })
})

//Teachers Courses
app.get("/myCourse", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    const LoggedInUser = CurrentUser.id;
    const allCourses = await course.getCourse(LoggedInUser);
    response.render("mycourse", {
        title: `${CurrentUser.fullName} Courses`,
        allCourses,
        CurrentUser,
        csrfToken: request.csrfToken(),
    })
})

//Create New course
app.post("/createCourse", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    try {
        await course.create({
            title: request.body.title,
            userID: request.user.id,
        });
        console.log("course created succesfull")
        return response.redirect(`/Educator-Dashboard`);
    } catch (error) {
        console.log(error);
        return response.status(422).json(error)
    }
})

//page for creating Chapters
app.get("/course/:id", async (request, response) => {
    response.render("chapter");
})

//creating new chapter
app.post("/chapter", async (request, response) => {
    console.log("name", request.body.name)
    console.log("discription", request.body.discription);
    console.log("title", request.course.title);
    try {
        await chapter.createchapter({
            name: request.body.name,
            discription: request.body.discription,
            id: request.course.id,
        })
        response.redirect("/chapter")
    } catch (error) {

    }
})
module.exports = app;
