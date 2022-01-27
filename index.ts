import express from "express";

const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("test");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
