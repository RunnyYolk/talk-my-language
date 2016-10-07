"use strict";

var bodyParser     = require("body-parser"),
    $              = require('jQuery'),
    express        = require('express'),
    multer         = require('multer'),
    mongoose       = require('mongoose'),
    mime           = require('mime'),
    path           = require('path'),
    uid            = require('uid2'),
    passport       = require('passport'),
    LocalStrategy  = require('passport-local'),
    fs             = require('fs'),
    crypto         = require('crypto'),
    rimraf         = require('rimraf'),
    mkdirp         = require('mkdirp'),
    multiparty     = require('multiparty'),
    Promise        = require("bluebird"),
    User           = require('./models/user'),
    passportLocalMongoose = require('passport-local-mongoose'),
    methodOverride = require("method-override"),
    app = express();

var storage = multer.diskStorage({
  destination: function (req, file, cb){
    cb(null, './public/uploads')
  },
  filename: function (req, file, cb){
    crypto.pseudoRandomBytes(16, function (err, raw) {
      cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
    });
  }
});

var loadedProfiles = [];

var upload = multer({storage: storage}).any('photos');

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
}

//connect mongoDB
// ========== For Local =============
mongoose.connect("mongodb://localhost/tml");
// ========== For Heroku ============
// mongoose.connect("mongodb://nick:1234@ds019766.mlab.com:19766/akira");
// mongoose.Promise = Promise;


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static('semantic'));
app.use(methodOverride('_method'));
app.use('/images', express.static(__dirname + '/writable'));

// Passport Configuration
app.use(require('express-session')({
  secret: 'Runny Yolk is 100% awesome',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
}

// ROUTES

// Landing Page
app.get('/', function(req, res){
  res.render('index', {currentUser: req.user});
});

//Sign up page
app.get('/signup', function(req, res){
  res.render('register', {currentUser: req.user});
});

//New user creation
app.post('/signup', function(req, res){
  upload(req, res, function (err){
    if (err) {
      console.log('error');
      console.log(err)
      return;
    }
    //variables for new user
    var spokenLangs = req.body.spokenlanguages.split(',');
    var learnLangs = req.body.learninglanguages.split(',');
    var comms = req.body.commethod.split(',');
    var photos = []
    req.files.forEach(function(file, i){
      photos.push(req.files[i].path.replace('public/', '../'));
    });
    var newUser = new User(
      {
        username: req.body.username,
        firstName: req.body.fname,
        lastName: req.body.lname,
        age: req.body.age,
        gender: req.body.gender,
        spokenLanguages: spokenLangs,
        learningLanguages: learnLangs,
        info: req.body.info,
        country: req.body.country,
        city: req.body.city,
        comMethod: comms,
        photos: photos,
        lastLogin: Date.now()
      }
    );
    User.register(newUser, req.body.password, function(err, user){
      if(err){
        console.log('error registering user');
        console.log(err);
        return res.send('oops');
      }
      passport.authenticate('local')(req, res, function(){
        res.redirect('/matches');
      });
    });
  });
});

// User edit (edit profile)

// Show edit form

app.get('/users/:_id/edit', function(req, res){
  User.findById(req.params._id, function(err, foundUser){
    if(err){
      res.redirect("back");
    } else {
      console.log("============================================================")
      console.log("============================================================")
      console.log(foundUser)
      console.log(req.user);
      res.render("edit", {currentUser: req.user, user_id: req.params._id, user: foundUser});
    }
  });
});

// PUT edits
app.put('/users/:_id', function(req, res){
  console.log("============================================================")
  console.log("============================================================")
  console.log(req.body);
  console.log("============================================================")
  console.log("============================================================")
  // var spokenLangs = req.body.spokenlanguages.split(',');
  // var learnLangs = req.body.learninglanguages.split(',');
  // var comms = req.body.commethod.split(',');
  var photos = []
  req.files.forEach(function(file, i){
    photos.push(req.files[i].path.replace('public/', '../'));
  });
  var updatedUser = new User(
    {
      username: req.body.username,
      firstName: req.body.fname,
      lastName: req.body.lname,
      age: req.body.age,
      gender: req.body.gender,
      spokenLanguages: spokenLangs,
      learningLanguages: learnLangs,
      info: req.body.info,
      country: req.body.country,
      city: req.body.city,
      comMethod: comms,
      photos: photos,
      lastLogin: Date.now()
    }
  );
  User.findByIdAndUpdate(req.params._id, updatedUser, function(err, user){
    if(err){
      console.log('error updating user');
      console.log(err);
    } else {
      res.redirect('/matches');
    }
  });
});


//Login routes

// Show Login Form
app.get('/login', function(req, res){
  res.render('login', {currentUser: req.user});
});

// Handle login logic
app.post('/login', passport.authenticate('local',
  {
    successRedirect: '/matches',
    failureRedirect: '/login' //To do: Flash message 'error logging in'
  }), function(req, res){
});

app.get('/logout', function(req, res){
    req.logout();
    res.redirect("/");
});

//Matched and Profiles

//Matches Page
app.get('/matches', isLoggedIn, function(req, res){
  loadedProfiles = [];
  var q = User.find({learningLanguages: {$in: req.user.spokenLanguages}}).sort({"_id":-1}).limit(5)
  q.exec(function(err, foundUsers){
    if(err){
    } else {
      foundUsers.forEach(function(user){
        loadedProfiles.push(user._id)
      });
      console.log(req.user);
      res.render('matches', {users:foundUsers, currentUser: req.user});
    }
  });
});

// More matches request  / infinite scrolling
app.post('/matches', function(req, res){
  var q = User.find({$and: [{_id: {$nin: loadedProfiles}}, {learningLanguages: {$in: req.user.spokenLanguages}}]}).sort({"_id":-1}).limit(10);
  q.exec(function(err, nextUsers){
    if(err){
      console.log('error getting next profiles');
      console.log(err);
    } else {
        nextUsers.forEach(function(user){
          loadedProfiles.push(user._id);
        });
        res.send({nextUsers: nextUsers, currentUser: req.user});
    }
  });
});

app.get('/users/:_id/view', function(req, res){
  User.findById(req.params._id, function(err, foundUser){
    if(err){
      res.redirect("back");
    } else {
      res.render('view', {user: foundUser, currentUser: req.user});
    }
  });
});

// ======== For Heroku ========
// app.listen(process.env.PORT, process.env.IP, function(){
// ======== For Local =========
app.listen(27017, process.env.IP, function(){
  console.log('Fire it UP!');
});
