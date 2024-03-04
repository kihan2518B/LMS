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

const passport = require("passport");
const ConnectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");

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
            // console.log(user)
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

//Routes related to adding,deleting and marking page as complete
const pageRoutes = require('./src/Routes/Page/route.js');
app.use('/', pageRoutes);

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
