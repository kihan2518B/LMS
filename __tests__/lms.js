const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function extractCsrfToken(res) {
    var $ = cheerio.load(res.text);
    return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
    let res = await agent.get("/login");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/session").send({
        email: username,
        password: password,
        _csrf: csrfToken,
    });
};

describe("LMS test suite", () => {
    beforeAll(async () => {
        await db.sequelize.sync({ force: true });
        server = app.listen(4000, () => { });
        agent = request.agent(server);
    });

    afterAll(async () => {
        try {
            await db.sequelize.close();
            await server.close();
        } catch (error) {
            console.log(error);
        }
    });

    //test for user cannot access teacher-dashboard without authentication
    test("checking if user cannot access Educator-dashboard without authentication", async () => {
        // Send a GET request to the dashboard route without authentication
        let response = await agent.get("/Educator-Dashboard");
        expect(response.status).toBe(302);

        response = await request(app).get("/Educator-Dashboard");
        expect(response.status).toBe(302);
    });

    //test for signup
    test("Sign up a new user", async () => {
        const res = await agent.get("/signup");
        const csrfToken = extractCsrfToken(res);

        const newUser1 = {
            fullName: "Test",
            email: "testuser2@example.com",
            password: "password123",
            role: "Educator",
            _csrf: csrfToken,
        };
        const signupRes1 = await agent.post("/users").send(newUser1);
        expect(signupRes1.statusCode).toBe(302);
    });

    //for signout
    test("Sign out the user", async () => {
        res = await agent.get("/signout");
        expect(res.statusCode).toBe(302);

        res = await agent.get("/Educator-Dashboard");
        expect(res.statusCode).toBe(302);

        res = await agent.get("/Student-Dashboard");
        expect(res.statusCode).toBe(302);
    });

    test("View courses created by a teacher", async () => {
        const agent = request.agent(server);
        await login(agent, "testuser2@example.com", "password123");
        const teaMyCoursesRes = await agent.get("/TEAmyCourse");
        expect(teaMyCoursesRes.statusCode).toBe(200);
    });

    test("Create a new course", async () => {
        await login(agent, "testuser2@example.com", "password123");

        const csrfToken = extractCsrfToken(await agent.get("/Createcourse"));
        const newCourse = {
            title: "New Course",
            _csrf: csrfToken,
        };
        const createCourseRes = await agent.post("/createCourse").send(newCourse);
        expect(createCourseRes.statusCode).toBe(302);
    });


    test("Create a new chapter", async () => {
        await login(agent, "testuser2@example.com", "password123");

        let csrfToken = extractCsrfToken(await agent.get("/createcourse"));

        //create test course
        const createdCourse = {
            courseName: "Test Course",
            courseDescription: "Description for the new course.",
            _csrf: csrfToken,
        };

        await agent.post("/Createcourse").send(createdCourse);

        //create test chapter
        csrfToken = extractCsrfToken(
            await agent.get(`/course/${1}/createchapter`),
        );
        // console.log("csrfToken", csrfToken);
        const newChapter = {
            name: "Test Chapter",
            discription: "Description for the new chapter.",
            _csrf: csrfToken,
        };
        const createChapterRes = await agent
            .post(`/course/${1}/createchapter`)
            .send(newChapter);

        expect(createChapterRes.statusCode).toBe(302);
    });

    test("View enrolled courses for a student", async () => {
        await login(agent, "student@example.com", "password123");

        const stuMyCoursesRes = await agent.get("/Student/enrolled-courses");
        expect(stuMyCoursesRes.statusCode).toBe(200);
    });

    // test for change password
    test("Change Password", async () => {
        const changepasswordResponse = await agent.get("/changepassword");

        // Extract CSRF token from the response using Cheerio
        const csrfToken = extractCsrfToken(changepasswordResponse);
        // console.log("csrfToken", csrfToken);

        const newPassword = "newPass123";

        const changePasswordResponse = await agent.put("/changepassword").send({
            email: "testuser2@example.com",
            password: newPassword,
            _csrf: csrfToken,
        });
        expect(changePasswordResponse.statusCode).toBe(302);
        //login with new password
        await login(agent, "testuser2@example.com", newPassword);

        const loginResponse = await agent.get("/Educator-dashboard");
        expect(loginResponse.statusCode).toBe(200);
    });
})