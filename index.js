const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const {
  userRouters,
  restaurantRouters,
  discountRouters,
  taxRouters,
  customizationOptionRoute,
  categoryRoute,
  itemRoute,
  menuRoute,
} = require("./routes");
dotenv.config();

const app = express();

app.use(express.json());

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, resp) => {
  const htmlContent = "<h1>Hello, Server is Running 😁</h1>";
  resp.send(htmlContent);
});

//user
app.use("/api/v1/user", userRouters);

//restaurant
app.use("/api/v1/restaurant", restaurantRouters);
app.use("/api/v1/discount", discountRouters);
app.use("/api/v1/tax", taxRouters);

//menu
app.use("/api/v1/customizationOption", customizationOptionRoute);
app.use("/api/v1/category", categoryRoute);
app.use("/api/v1/item", itemRoute);
app.use("/api/v1/menu", menuRoute);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`server is running on PORT http://localhost:${PORT}`);
});
