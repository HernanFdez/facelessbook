const express = require("express")
const session = require("express-session")
const mongostore = require("connect-mongo")
const flash = require("connect-flash")
const markdown = require("marked")
const sanitizeHTML = require("sanitize-html")
const csrf = require("csurf")

const app = express()
const router = require("./router")

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use("/api", require("./router-api"))

let sessionOptions = session({
  secret: "JavaScript is nice",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
  store: mongostore.create({ client: require("./db") })
})

app.use(sessionOptions)
app.use(flash())

app.use(function (req, res, next) {
  // make our markdown function available from within ejs templates
  res.locals.filterUserHTML = function (content) {
    return sanitizeHTML(markdown.parse(content), { allowedTags: ["p", "br", "ul", "ol", "li", "strong", "bold", "i", "em", "h1", "h2", "h3", "h4", "h5", "h6"], allowedAttributes: [] })
  }

  // make current user id availbale on the request object
  if (req.session.user) {
    req.visitorId = req.session.user._id
  } else {
    req.visitorId = 0
  }

  // make user session data available from within view templates
  res.locals.user = req.session.user
  res.locals.reqPath = ""

  // make all error and success flash messages avilable from all templates
  res.locals.appName = "Facelessbook"
  res.locals.errors = req.flash("errors")
  res.locals.success = req.flash("success")

  next()
})

app.use(express.static("public"))
app.set("views", "views")
app.set("view engine", "ejs")
app.use(csrf())
app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken()
  next()
})
app.use("/", router)

app.use(function (err, req, res, next) {
  if (err) {
    if (err.code == "EBADCSRFTOKEN") {
      req.flash("errors", "cross site request forgery detected")
      req.session.save(() => res.redirect("/"))
    } else {
      res.render("404")
    }
  }
})

const server = require("http").createServer(app)
const io = require("socket.io")(server)

io.use(function (socket, next) {
  sessionOptions(socket.request, socket.request.res, next)
})

io.on("connection", function (socket) {
  if (socket.request.session.user) {
    let user = socket.request.session.user
    socket.username = user.username

    socket.emit("welcome", { username: user.username, avatar: user.avatar })

    socket.on("chatMessageFromBrowser", async function (data) {
      let to = data.to
      if (to == "all") {
        socket.broadcast.emit("chatMessageFromServer", { message: sanitizeHTML(data.message, { allowedTags: [], allowedAttributes: [] }), username: user.username, avatar: user.avatar })
      } else {
        if (typeof to == "string") to = [to]
        // console.log(to)
        let allSockets = await io.fetchSockets()
        let toSockets = allSockets.filter(s => {
          if (s.username == socket.username) {
            return false
          }
          let included = false
          to.forEach(toUsername => {
            if (toUsername == s.username) {
              included = true
            }
          })
          return included
        })
        toSockets.forEach(s => s.emit("chatMessageFromServer", { message: sanitizeHTML(data.message, { allowedTags: [], allowedAttributes: [] }), username: user.username, avatar: user.avatar }))
      }
    })
  }
})

module.exports = server
