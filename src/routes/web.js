import express from "express";
import homeController from "../controllers/HomeController";

let router = express.Router();

let initWebRoutes = (app) => {
    router.get("/", homeController.getHomePage);
    router.get("/webhook", homeController.getWebHook);
    router.post("/webhook", homeController.postWebHook);
    router.post('/setup-profile', homeController.setupProfile);
    return app.use("/", router);
};
module.exports = initWebRoutes;
