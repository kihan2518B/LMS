const express = require('express');
const router = express.Router();
const ConnectEnsureLogin = require("connect-ensure-login");
const page = require('../../models/page');
const course = require('../../models/course');
const chapter = require('../../models/chapter');


//Showing Pages
router.get("/chapter/:id", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentChapter = await chapter.findById(request.params.id);
    const user = request.user;
    const currentCourse = await course.find({ _id: currentChapter.courseID })
    // console.log("course", currentCourse);
    const PagesofChapter = await page.find({ chapterID: currentChapter.id });

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
router.get("/chapter/:id/page", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentpage = await page.findById(request.params.id);
    const user = request.user;
    // console.log(currentpage.chapterID)
    const currentChapter = await chapter.findOne({ _id: currentpage.chapterID, });
    // console.log("Chapter", currentChapter);
    const currentCourse = await course.findOne({ _id: currentChapter.courseID })
    // console.log("course", currentCourse);

    // const pageCompletedStatus = await enrollment.findOne({
    //     where: {
    //         userID: user.id,
    //         courseID: currentCourse.id,
    //         chapterID: currentChapter.id,
    //         pageID: currentpage.id,
    //         completed: true,
    //     }
    // });

    // const enrollmentStatus = await enrollment.findOne({
    //     where: {
    //         userID: user.id,
    //         courseID: currentCourse.id,
    //     }
    // });
    // console.log(currentpage.content);
    // console.log("pageCompletedStatus", pageCompletedStatus)
    response.render("pagecontent", {
        title: `${currentpage.title}`,
        currentpage,
        currentCourse,
        currentChapter,
        user,
        // pageCompletedStatus,
        // enrollmentStatus,
        csrfToken: request.csrfToken(),
    })
})

// marking pages as completed
router.post("/chapter/:id/markAsCompleted", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    try {
        const currentpage = await page.findById(request.params.id);
        const currentChapter = await chapter.find({
            where: {
                id: currentpage.chapterID,
            },
            order: [["id", "ASC"]],
        });
        const currentCourse = await course.find({
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

//page to create pages
router.get("/chapter/:id/createpage", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentChapter = await chapter.findById(request.params.id);
    const currentCourse = await course.find({
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
router.post("/chapter/:id/createpage", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const chapterTobeEdited = await chapter.findById(request.params.id);
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
router.delete("/pages/:id/delete", ConnectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const currentpage = await page.findById(request.params.id);
    try {
        // const deleteEnrolledpage = await enrollment.destroy({
        //     where: { pageID: currentpage.id }
        // });
        const deletedpage = await page.deleteOne({ _id: currentpage.id });
        // console.log("deleted", deletedpage);
        // console.log("deleted", deleteEnrolledpage);
        response.send(deletedpage ? true : false);
    } catch (error) {
        console.log("Error While Deleting", error);
        return response.status(422).json(error);
    }
});

module.exports = router;