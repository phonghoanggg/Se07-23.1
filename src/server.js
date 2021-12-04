import express from "express";
import bodyParser from "body-parser";
import viewEngine from "./config/viewEngine";
import webRoutes from "./routes/web";
require("dotenv").config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//cau hinh view
viewEngine(app);

//cau hinh routes
webRoutes(app);

let port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log("App is running at the port: " + port);
});
