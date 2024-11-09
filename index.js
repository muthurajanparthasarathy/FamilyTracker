import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123$%^qweRTY",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 9;
let users = []

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries where user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}


async function getCurrentUser() {

  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return result.rows.find((user) => user.id == currentUserId)


}




app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

  if (users.length == 0) {
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,

    });
  }
  else {
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
    });
  }


});



app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.render("index.ejs", { error: "Country not found." });
    }

    const countryCode = result.rows[0].country_code;

    await db.query(
      "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
      [countryCode, currentUserId]
    );

    res.redirect("/");
  } catch (err) {
    res.render("index.ejs", { error: "An error occurred: " + err.message });
  }
});


app.post("/user", async (req, res) => {
  console.log(req.body)

  if (req.body.add == "new") {
    res.render("new.ejs")
  }
  else if (req.body.user) {
    currentUserId = parseInt(req.body.user);
    res.redirect("/")
  }

});



app.post("/new", async (req, res) => {
  console.log(req.body)
  const currentUser = await getCurrentUser();

  if (users.length == 0) {
    const result = await db.query(
      "INSERT INTO users (name,color) VALUES ($1,$2) RETURNING *",
      [req.body.name, req.body.color]
    );

    const userDetail = result.rows;
    console.log(userDetail)
    currentUserId = userDetail[0].id;
    res.redirect("/")


  }


  try {
    const result = await db.query(
      "SELECT * FROM users WHERE name = $1 OR color = $2",
      [req.body.name, req.body.color]
    );

    const data = result.rows;
    console.log(data.length)
    if (data.length == 0) {

      const result = await db.query(
        "INSERT INTO users (name,color) VALUES ($1,$2) RETURNING *",
        [req.body.name, req.body.color]
      );

      const userDetail = result.rows;
      console.log(userDetail)

      currentUserId = userDetail[0].id;
      res.redirect("/")
    }
    else {


      const countries = await checkVisisted();
      const currentUser = await getCurrentUser();

      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: currentUser.color,
        error: "Name or color already exists!"
      });
    }


  } catch (err) {
    res.render("index.ejs", { error: err });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
