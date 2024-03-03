const express = require('express');
const router = express.Router();
const user = require('../../models/user');
const ConnectEnsureLogin = require("connect-ensure-login");

const chapter = require('../../models/chapter')
const course = require('../../models/course');

//home page for Educator
router.get("/Educator-Dashboard", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const CurrentUser = req.user;
    const AllCourses = await course.find(); //all courses in DB

    let allcoursesWithEnrollment = [];

    for (let course of AllCourses) {
        // const enrollmentCount = await enrollment.count({
        //     where: { courseID: course.id },
        //     distinct: true,
        //     col: "userID",
        // });

        const teacherOfCourse = await user.findById(course.userID);

        allcoursesWithEnrollment.push({
            id: course.id,
            teacherOfCourseFname: teacherOfCourse.fullName,
            courseTitle: course.title,
            // enrollmentCount: enrollmentCount,
        })
    }

    // const sortedAllCourses = allcoursesWithEnrollment.sort(
    //     (a, b) => b.enrollmentCount - a.enrollmentCount,
    // )

    //for Short time upto when enrollment model is not created 
    const sortedAllCourses = allcoursesWithEnrollment;


    // console.log("sortedAllCourses", sortedAllCourses)


    if (req.user.role == "Student") {
        res.redirect("/Student-Dashboard")
    } else {
        res.render("Educator-Dashboard", {
            title: `${CurrentUser.fullName}'s Teacher-Dashboard`,
            CurrentUser,
            sortedAllCourses,
            csrfToken: req.csrfToken(),
        });
    }
})

//Teachers Courses
router.get("/TEAmyCourse", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const CurrentUser = req.user;
    const LoggedInUserID = CurrentUser.id;
    const allCourses = await course.find({ userID: LoggedInUserID });
    console.log(allCourses);

    let allcoursesWithEnrollment = [];

    for (let course of allCourses) {
        // const enrollmentCount = await enrollment.count({
        //     where: { courseID: course.id },
        //     distinct: true,
        //     col: "userID",
        // });

        const teacherOfCourse = await user.findById(course.userID);

        allcoursesWithEnrollment.push({
            id: course.id,
            teacherOfCourseFname: teacherOfCourse.fullName,
            courseTitle: course.title,
            // enrollmentCount: enrollmentCount,
        })
    }

    // const sortedAllCourses = allcoursesWithEnrollment.sort(
    //     (a, b) => b.enrollmentCount - a.enrollmentCount,
    // )

    //for Short time upto when enrollment model is not created 
    const sortedAllCourses = allcoursesWithEnrollment;

    res.render("TEAmycourse", {
        title: `${CurrentUser.fullName} Courses`,
        sortedAllCourses,
        CurrentUser,
        csrfToken: req.csrfToken(),
    })
});

router.get("/report", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const CurrentUser = req.user;
    const LoggedInUser = CurrentUser.id;
    const allCourses = await course.find(LoggedInUser);

    let allcoursesWithEnrollment = [];

    for (let course of allCourses) {
        const enrollmentCount = await enrollment.count({
            where: { courseID: course.id },
            distinct: true,
            col: "userID",
        });

        const teacherOfCourse = await user.findById(course.userID);

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

    res.render("report", {
        title: `${CurrentUser.fullName} Courses report`,
        // sortedAllCourses,
        csrfToken: req.csrfToken(),
    })
})

//page for creating course
router.get("/Createcourse", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    res.render("createcourse", {
        title: 'Create New Course',
        csrfToken: req.csrfToken(),
    })
})

//Create New course
router.post("/createCourse", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const CurrentUser = req.user;
    const coursetitle = req.body.title;
    if (!coursetitle) {
        req.flash("error", "Please Enter title of course");
        return res.redirect("/createcourse");
    }
    try {
        const newCourse = await course.create({
            title: req.body.title,
            userID: CurrentUser.id,
        });
        // console.log("course created succesfull");
        return res.redirect(`/course/${newCourse.id}/createchapter`);
    } catch (error) {
        console.log(error);
        return res.status(422).json(error)
    }
})

//page for viewing Chapters
router.get("/course/:id", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const courseTobeEdited = await course.findById(req.params.id);
    const user = req.user;
    const chapterofcourse = await chapter.find({ courseID: courseTobeEdited.id });
    // console.log("Chapters:", chapterofcourse)
    // console.log("course:", courseTobeEdited.id)
    res.render("chapter", {
        title: `${courseTobeEdited.title}`,
        courseTobeEdited,
        chapterofcourse,
        user,
        csrfToken: req.csrfToken(),
    });
});

//delete a course
router.delete("/course/:id/delete", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const currentcourse = await course.findById(req.params.id);
    try {
        // const deleteEnrolledcourse = await enrollment.remove({
        //     where: {
        //         courseID: currentcourse.id,
        //     }
        // })
        const deletedcourse = await course.deleteOne({ _id: currentcourse.id });
        console.log("deleted", deletedcourse);
        res.send(deletedcourse ? true : false);
    } catch (error) {
        console.log("Error While Deleting", error);
        return res.status(422).json(error);
    }
});

//page to create chapters
router.get("/course/:id/createchapter", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const courseTobeEdited = await course.findById(req.params.id);
    const courseID = req.params.id;
    const chapterofcourse = await chapter.find({ courseID: courseTobeEdited.id });
    // console.log("Chapters:", chapterofcourse)
    // console.log("course:", courseTobeEdited)
    res.render("createchapter", {
        title: `Create Chapter for ${courseTobeEdited.title}`,
        courseID,
        chapterofcourse,
        courseTobeEdited,
        csrfToken: req.csrfToken(),
    })
})

//creating new chapter
router.post("/course/:id/createchapter", ConnectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const courseTobeEdited = await course.findById(req.params.id);
    // console.log("course:", courseTobeEdited);
    const courseID = courseTobeEdited.id;
    console.log("courseID", courseID)
    // console.log("name", req.body.name)
    // console.log("discription", req.body.discription);
    // console.log("title", courseTobeEdited.title);
    const chapterName = req.body.name;
    const chapterDiscription = req.body.discription;
    if (!chapterName || !chapterDiscription) {
        req.flash("error", "You must Enter Chapter Name and Discription");
        return res.redirect(`/course/${courseID}/createchapter`)
    }
    try {
        const newChapter = await chapter.create({
            name: req.body.name,
            discription: req.body.discription,
            courseID: courseID,
        });
        console.log(newChapter)
        return res.redirect(`/chapter/${newChapter.id}/createpage`)
    } catch (error) {
        console.log(error);
        return res.status(422).json(error)
    }
});


module.exports = router;