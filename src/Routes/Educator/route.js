const express = require('express');
const router = express.Router();
const user = require('../../models/user');
const ConnectEnsureLogin = require("connect-ensure-login");

const course = require('../../models/course');

//home page for Educator
router.get("/Educator-Dashboard", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    const AllCourses = await course.find(); //all courses in DB

    let allcoursesWithEnrollment = [];

    for (let course of AllCourses) {
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

    // console.log("sortedAllCourses", sortedAllCourses)


    if (request.user.role == "Student") {
        response.redirect("/Student-Dashboard")
    } else {
        response.render("Educator-Dashboard", {
            title: `${CurrentUser.fullName}'s Teacher-Dashboard`,
            CurrentUser,
            sortedAllCourses,
            csrfToken: request.csrfToken(),
        });
    }
})

//Teachers Courses
router.get("/TEAmyCourse", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    const LoggedInUserID = CurrentUser.id;
    const allCourses = await course.find(LoggedInUserID);

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

    response.render("TEAmycourse", {
        title: `${CurrentUser.fullName} Courses`,
        sortedAllCourses,
        CurrentUser,
        csrfToken: request.csrfToken(),
    })
});

router.get("/report", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
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

    response.render("report", {
        title: `${CurrentUser.fullName} Courses report`,
        sortedAllCourses,
        csrfToken: request.csrfToken(),
    })
})

//page for creating course
router.get("/Createcourse", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    response.render("createcourse", {
        title: 'Create New Course',
        csrfToken: request.csrfToken(),
    })
})

//Create New course
router.post("/createCourse", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const CurrentUser = request.user;
    const coursetitle = request.body.title;
    if (!coursetitle) {
        request.flash("error", "Please Enter title of course");
        return response.redirect("/createcourse");
    }
    try {
        const newCourse = await course.create({
            title: request.body.title,
            userID: CurrentUser.id,
        });
        // console.log("course created succesfull");
        return response.redirect(`/course/${newCourse.id}/createchapter`);
    } catch (error) {
        console.log(error);
        return response.status(422).json(error)
    }
})

//page for viewing Chapters
router.get("/course/:id", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const courseTobeEdited = await course.finById(request.params.id);
    const user = request.user;
    const chapterofcourse = await chapter.find({
        where: {
            courseID: courseTobeEdited.id,
        },
        order: [["id", "ASC"]],
    });
    console.log("Chapters:", chapterofcourse)
    console.log("course:", courseTobeEdited.id)
    response.render("chapter", {
        title: `${courseTobeEdited.title}`,
        courseTobeEdited,
        chapterofcourse,
        user,
        csrfToken: request.csrfToken(),
    });
});

//delete a course
router.delete("/course/:id/delete", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentcourse = await course.findById(request.params.id);
    try {
        const deleteEnrolledcourse = await enrollment.remove({
            where: {
                courseID: currentcourse.id,
            }
        })
        const deletedcourse = await course.remove({
            where: {
                id: currentcourse.id,
            }
        });
        console.log("deleted", deletedcourse);
        response.send(deletedcourse ? true : false);
    } catch (error) {
        console.log("Error While Deleting", error);
        return response.status(422).json(error);
    }
});

//page to create chapters
router.get("/course/:id/createchapter", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const courseTobeEdited = await course.findById(request.params.id);
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
router.post("/course/:id/createchapter", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const courseTobeEdited = await course.findById(request.params.id);
    // console.log("course:", courseTobeEdited);
    const courseID = courseTobeEdited.id;
    // console.log("name", courseID)
    // console.log("name", request.body.name)
    // console.log("discription", request.body.discription);
    // console.log("title", courseTobeEdited.title);
    const chapterName = request.body.name;
    const chapterDiscription = request.body.discription;
    if (!chapterName || !chapterDiscription) {
        request.flash("error", "You must Enter Chapter Name and Discription");
        return response.redirect(`/course/${courseID}/createchapter`)
    }
    try {
        const newChapter = await chapter.create({
            name: request.body.name,
            discription: request.body.discription,
            courseID,
        })
        return response.redirect(`/chapter/${newChapter.id}/createpage`)
    } catch (error) {
        console.log(error);
        return response.status(422).json(error)
    }
});


module.exports = router;