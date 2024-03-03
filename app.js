const express = require("express");
const app = express();
const connect = require("./src/config/db.config");
// const { user, course, chapter, page, enrollment } = require("./src/models");
const user = require("./src/models/user");
const bodyParser = require("body-parser");
const path = require("path");
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const passport = require("passport");
const ConnectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const { json } = require("sequelize");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser("Shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"])); //THE TEXT SHOULD BE OF 32 CHARACTERS ONLY
app.use(express.static(path.join(__dirname, "public")));
// Set the views directory
app.set('views', path.join(__dirname, 'src', 'views'));
app.set("view engine", "ejs");
app.use(flash());

app.use(
    session({
        secret: "my-super-secret-key-21728172615261562",
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, //24hrs
        },
    }),
)

app.use(function (request, response, next) {
    response.locals.messages = request.flash();
    next();
});

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
            user.findOne({ email: email })
                .then(async function (user) {
                    if (!user) {
                        console.log("Not A user");
                        return done(null, false);
                    }
                    const result = await bcrypt.compare(password, user.password);
                    if (!result) {
                        return done(null, false, { message: "Invalid Password" })
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
    user.findOne({ _id: id }) //passing _id to findOne as an object
        .then((user) => {
            console.log(user)
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

//Signup Route
const signupRoutes = require('./src/Routes/signup/route.js');
app.use('/', signupRoutes);

//login page
const loginRoutes = require('./src/Routes/signin/route.js')
app.use('/', loginRoutes);

//Educator and creating course,chapters Routes
const educatorRoutes = require('./src/Routes/Educator/route.js');
app.use('/', educatorRoutes);



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
    const currentChapter = await chapter.findOne({
        where: {
            id: currentpage.chapterID,
        },
        order: [["id", "ASC"]],
    });
    // console.log("Chapter", currentChapter);
    const currentCourse = await course.findOne({
        where: {
            id: currentChapter.courseID,
        },
        order: [["id", "ASC"]],
    })
    // console.log("course", currentCourse);

    const pageCompletedStatus = await enrollment.findOne({
        where: {
            userID: user.id,
            courseID: currentCourse.id,
            chapterID: currentChapter.id,
            pageID: currentpage.id,
            completed: true,
        }
    });

    const enrollmentStatus = await enrollment.findOne({
        where: {
            userID: user.id,
            courseID: currentCourse.id,
        }
    });
    console.log(currentpage.content);
    // console.log("pageCompletedStatus", pageCompletedStatus)
    response.render("pagecontent", {
        title: `${currentpage.title}`,
        currentpage,
        currentCourse,
        currentChapter,
        user,
        pageCompletedStatus,
        enrollmentStatus,
        csrfToken: request.csrfToken(),
    })
})

// marking pages as completed
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
    const pageTitle = request.body.title;
    if (!pageTitle) {
        request.flash("error", "Please Enter Page Title ");
        return response.redirect(`/chapter/${chapterID}/createpage`);
    }
    try {
        await page.create({
            title: request.body.title,
            content: request.body.content,
            chapterID,
        })
        return response.redirect(`/chapter/${chapterID}`)
    } catch (error) {
        console.log(error);
        return response.status(422).json(error);
    }

});

//delete a page
app.delete("/pages/:id/delete", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentpage = await page.findByPk(request.params.id);
    try {
        const deleteEnrolledpage = await enrollment.destroy({
            where: { pageID: currentpage.id }
        });
        const deletedpage = await page.destroy({
            where: {
                id: currentpage.id,
            }
        });
        console.log("deleted", deletedpage);
        console.log("deleted", deleteEnrolledpage);
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

    let allcoursesWithEnrollment = [];
    //to count enrollment
    for (let course of AllCourses) {
        const enrollmentCount = await enrollment.count({
            where: { courseID: course.id },
            distinct: true,
            col: "userID",
        });

        const teacherOfCourse = await user.findByPk(course.userID);

        allcoursesWithEnrollment.push({
            id: course.id,
            teacherOfCourseFname: teacherOfCourse.fullName,
            courseTitle: course.title,
            enrollmentCount: enrollmentCount,
        })
    }

    const sortedAllCourses = allcoursesWithEnrollment.sort(
        (a, b) => b.enrollmentCount - a.enrollmentCount,
    )

    if (request.user.role == "Educator") {
        response.redirect("/Educator-Dashboard")
    } else {

        response.render("Student-Dashboard", {
            title: `${CurrentUser.fullName} student-Dashboard`,
            CurrentUser,
            sortedAllCourses,
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
    const allCourses = await course.findAll();

    try {
        const enrolledcourse = await enrollment.findAll({
            where: { userID: currentUserID },
        })
        // console.log("enrolledcourse", enrolledcourse);

        //to find number of completed pages
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
                    // console.log("completedPagescount", completedPagescount);
                    let progressReport = completedPagescount / totalPages * 100;
                    //pushing all data if course is not pre-existing
                    const teacherOfcourse = await user.findOne({
                        where: {
                            id: Course.userID,
                        }
                    });
                    console.log("teacherOfcourse", teacherOfcourse)
                    coursesWithPageInfo.push({
                        userID: teacherOfcourse.id,
                        courseID: Course.id,
                        courseName: Course.title,
                        completedPagescount: completedPagescount,
                        progressReport: progressReport,
                        totalPages: totalPages,
                    });
                }
            }
        }
        // console.log("coursesWithPageInfo", coursesWithPageInfo);
        //number of enrolled student
        let allcoursesWithEnrollment = [];

        for (let course of allCourses) {
            const enrollmentCount = await enrollment.count({
                where: { courseID: course.id },
                distinct: true,
                col: "userID",
            });

            const teacherOfCourse = await user.findByPk(course.userID);

            allcoursesWithEnrollment.push({
                id: course.id,
                teacherOfCourseFname: teacherOfCourse.fullName,
                courseTitle: course.title,
                enrollmentCount: enrollmentCount,
            })
        }

        const sortedAllCourses = allcoursesWithEnrollment.sort(
            (a, b) => b.enrollmentCount - a.enrollmentCount,
        )

        const existingusers = await user.findAll();
        // console.log("existingusers", existingusers)
        response.render("STUmycourse", {
            title: `${currentUser.fullName}'s enrolled courses`,
            courses: coursesWithPageInfo,
            users: existingusers,
            currentUser,
            sortedcourse: sortedAllCourses,
            csrfToken: request.csrfToken(),
        });
    } catch (error) {
        console.log(error);
        return response.status(402).json(error);
    }
})



module.exports = app;
