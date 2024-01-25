const express = require("express");
const app = express();
const { course, chapter, user, page, enrollment } = require("./models");
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
const { create } = require("domain");

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

//page for creating course
app.get("/Createcourse", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    response.render("createcourse", {
        title: 'Create New Course',
        csrfToken: request.csrfToken(),
    })
})

//Teachers Courses
app.get("/TEAmyCourse", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    const LoggedInUser = CurrentUser.id;
    const allCourses = await course.getCourse(LoggedInUser);
    response.render("TEAmycourse", {
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
            userID: CurrentUser.id,
        });
        console.log("course created succesfull")
        return response.redirect(`/Educator-Dashboard`);
    } catch (error) {
        console.log(error);
        return response.status(422).json(error)
    }
})

//page for viewing Chapters
app.get("/course/:id", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const courseTobeEdited = await course.findByPk(request.params.id);
    const user = request.user;
    const chapterofcourse = await chapter.findAll({
        where: {
            courseID: courseTobeEdited.id,
        },
        order: [["id", "ASC"]],
    });
    // console.log("Chapters:", chapterofcourse[0].id)
    // console.log("course:", courseTobeEdited.id)
    response.render("chapter", {
        title: `${courseTobeEdited.title}`,
        courseTobeEdited,
        chapterofcourse,
        user,
        csrfToken: request.csrfToken(),
    });
})

//page to create chapters
app.get("/course/:id/createchapter", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const courseTobeEdited = await course.findByPk(request.params.id);
    const courseID = request.params.id;
    const chapterofcourse = await chapter.findAll({
        where: {
            courseID: courseTobeEdited.id,
        },
        order: [["id", "ASC"]],
    });
    // console.log("Chapters:", chapterofcourse)
    // console.log("course:", courseTobeEdited)
    response.render("createchapter", {
        title: `Create Chapter for ${courseTobeEdited.title}`,
        courseID,
        chapterofcourse,
        courseTobeEdited,
        csrfToken: request.csrfToken(),
    })
})

//creating new chapter
app.post("/course/:id/createchapter", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const courseTobeEdited = await course.findByPk(request.params.id);
    // console.log("course:", courseTobeEdited);
    const courseID = courseTobeEdited.id;
    // console.log("name", courseID)
    // console.log("name", request.body.name)
    // console.log("discription", request.body.discription);
    // console.log("title", courseTobeEdited.title);
    try {
        await chapter.createchapter({
            name: request.body.name,
            discription: request.body.discription,
            courseID,
        })
        response.redirect(`/course/${courseID}`)
    } catch (error) {
        console.log(error);
        return response.status(422).json(error)
    }
});

//Showing Pages
app.get("/chapter/:id", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentChapter = await chapter.findByPk(request.params.id);
    const user = request.user;
    const currentCourse = await course.findAll({
        where: {
            id: currentChapter.courseID,
        }
    })
    // console.log("course", currentCourse);
    const PagesofChapter = await page.findAll({
        where: {
            chapterID: currentChapter.id,
        },
        order: [["id", "ASC"]],
    });

    response.render("pages", {
        title: `${currentChapter.name}`,
        currentChapter,
        currentCourse,
        user,
        PagesofChapter,
        csrfToken: request.csrfToken(),
    })
});

//page to show content of page
app.get("/chapter/:id/page", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentpage = await page.findByPk(request.params.id);

    const user = request.user;
    const currentChapter = await chapter.findAll({
        where: {
            id: currentpage.chapterID,
        },
        order: [["id", "ASC"]],
    });
    const currentCourse = await course.findAll({
        where: {
            id: currentChapter[0].courseID,
        },
        order: [["id", "ASC"]],
    })
    const pageCompletedStatus = await enrollment.findOne({
        where: {
            pageID: currentpage.id,
            userID: user.id,
        }
    });
    // console.log("pageCompletedStatus", pageCompletedStatus)
    response.render("pagecontent", {
        title: `${currentpage.title}`,
        currentpage,
        currentCourse,
        currentChapter,
        user,
        pageCompletedStatus,
        csrfToken: request.csrfToken(),
    })
})

// making pages as completed
app.post("/chapter/:id/markAsCompleted", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    try {
        const currentpage = await page.findByPk(request.params.id);
        const currentChapter = await chapter.findAll({
            where: {
                id: currentpage.chapterID,
            },
            order: [["id", "ASC"]],
        });
        const currentCourse = await course.findAll({
            where: {
                id: currentChapter[0].courseID,
            },
            order: [["id", "ASC"]],
        })

        const userID = request.user.id;
        const courseID = currentCourse[0].id;
        const chapterID = currentChapter[0].id;
        const pageID = currentpage.id;

        // console.log(userID);
        // console.log(courseID);
        // console.log(chapterID);
        // console.log(pageID);
        await enrollment.create({
            userID: userID,
            courseID: courseID,
            chapterID: chapterID,
            pageID: pageID,
            completed: true,
        });

        response.redirect(`/chapter/${pageID}/page`)
    } catch (error) {
        console.error("Error marking page as complete", error);
        response
            .status(500)
            .send("An error occurred while marking the page as complete");
    }
})

//page to add pages
app.get("/chapter/:id/createpage", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentChapter = await chapter.findByPk(request.params.id);
    const currentCourse = await course.findAll({
        where: {
            id: currentChapter.courseID,
        }
    })
    response.render("createpage", {
        title: `${currentChapter.name}`,
        currentChapter,
        currentCourse,
        csrfToken: request.csrfToken(),
    })
});

//adding pages
app.post("/chapter/:id/createpage", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const chapterTobeEdited = await chapter.findByPk(request.params.id);
    const chapterID = chapterTobeEdited.id;
    // console.log("course:", chapterTobeEdited);
    // console.log("ChapterId", chapterID)
    // console.log("title", request.body.title)
    // console.log("Content", request.body.content);
    // console.log("title", chapterTobeEdited.name);
    try {
        await page.create({
            title: request.body.title,
            content: request.body.content,
            chapterID,
        })
        response.redirect(`/chapter/${chapterID}`)
    } catch (error) {
        console.log(error);
        return response.status(422).json(error);
    }

});

//delete a page
app.delete("/pages/:id/delete", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentpage = await page.findByPk(request.params.id);
    try {
        const deletedpage = await page.destroy({
            where: {
                id: currentpage.id,
            }
        });
        console.log("deleted", deletedpage);
        response.send(deletedpage ? true : false);
    } catch (error) {
        console.log("Error While Deleting", error);
        return response.status(422).json(error);
    }
});

//Dashboard for Students
app.get("/Student-Dashboard", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    const AllCourses = await course.findAll(); //all courses in DB

    if (request.user.role == "Educator") {
        response.redirect("/Educator-Dashboard")
    } else {

        for (let courseDetails of AllCourses) {
            let enrollStudentCount = await enrollment.findAll({
                where: {
                    courseID: courseDetails.id,
                }
            })
            // console.log("student count ", enrollStudentCount);

        }
        response.render("Student-Dashboard", {
            title: `${CurrentUser.fullName} student-Dashboard`,
            CurrentUser,
            AllCourses,
            csrfToken: request.csrfToken(),
        });

    }
});

// enrolling student
app.post("/enroll/:courseID", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const courseID = request.params.courseID;
    // console.log("CourseID", courseID);
    const currentUserID = request.query.currentUserID
    // console.log("currentUserID", currentUserID)

    //checking if user has already enrolled
    const existingEnrolledCourse = await enrollment.findOne({
        where: {
            userID: currentUserID,
            courseID,
        }
    });
    // console.log("existingEnrolledCourse", existingEnrolledCourse)

    if (existingEnrolledCourse) {
        return response
            .status(404)
            .json({ message: "You are already enrolled in this course" });
    }
    try {
        const enrollmentcheck = await enrollment.createenrollnment(courseID, currentUserID);
        // console.log("enrollmentcheck :", enrollmentcheck);
        response.redirect("/Student-Dashboard");
    } catch (error) {
        console.log(error);
    }
});

//Showing enrolled Courses to student
app.get("/Student/enrolled-courses", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentUser = request.user;
    const currentUserID = currentUser.id;

    try {
        const enrolledcourse = await enrollment.findAll({
            where: { userID: currentUserID },
        })
        // console.log("enrolledcourse", enrolledcourse);

        const coursesWithPageInfo = [];
        for (let STUenrolledcourse of enrolledcourse) {
            const Course = await course.findByPk(STUenrolledcourse.courseID, {
                include: [
                    {
                        model: chapter,
                        include: [page],
                    }
                ]
            })
            // console.log("Course:", Course);
            // Check if the course is retrieved
            if (Course) {
                // Check if the course is already in the array
                const existingCourse = coursesWithPageInfo.find(
                    (c) => c.courseID === Course.id,
                );
                if (!existingCourse) {
                    // Calculate the total number of pages for the course
                    const totalPages = Course.chapters.reduce(
                        (total, chapter) => total + chapter.pages.length,
                        0,);
                    //calculating completed pages count
                    const completedPagescount = await enrollment.count({
                        where: {
                            userID: currentUserID,
                            courseID: Course.id,
                            completed: true
                        }
                    })
                    console.log("completedPagescount", completedPagescount);
                    //pushing all data if course is not pre-existing
                    coursesWithPageInfo.push({
                        userID: currentUserID,
                        courseID: Course.id,
                        courseName: Course.title,
                        completedPagescount: completedPagescount,
                        totalPages: totalPages,
                    });
                }
            }
        }
        console.log("coursesWithPageInfo", coursesWithPageInfo);

        const existingusers = await user.findAll();
        // console.log("existingusers", existingusers)
        response.render("STUmycourse", {
            title: `${currentUser.fullName}'s enrolled courses`,
            courses: coursesWithPageInfo,
            users: existingusers,
            currentUser,
            csrfToken: request.csrfToken(),
        });
    } catch (error) {
        console.log(error);
        return response.status(402).json(error);
    }
})



module.exports = app;
