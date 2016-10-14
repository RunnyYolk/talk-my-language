"use strict";

var bodyParser     = require("body-parser"),
    $              = require('jquery'),
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
    flash          = require('connect-flash'),
    Promise        = require("bluebird"),
    User           = require('./models/user'),
    Conversation   = require('./models/conversation'),
    Message        = require('./models/message'),
    passportLocalMongoose = require('passport-local-mongoose'),
    methodOverride = require("method-override"),
    app            = express(),
    http           = require('http'),
    server         = http.createServer(app),
    io             = require('socket.io').listen(server);

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
// mongoose.connect("mongodb://nick:1234@ds053176.mlab.com:53176/talkmylanguage");
mongoose.Promise = Promise;


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static('semantic'));
app.use(methodOverride('_method'));
app.use(flash());
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

app.use(function(req, res, next){          //Pass these to every route
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
})

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  req.flash("error", "Please Log In or Sign Up");
  res.redirect('/');
}


// Middleware to check ownership of a conversation

function checkConversationOwership (req, res, next) {
    if(req.isAuthenticated()){
            Conversation.findById(req.params._id, function(err, foundConversation){
                if(err){
                    res.redirect("back");
                } else {
                    // does user own the conversation?
                    if(foundConversation.participants.user1.id == req.user._id || foundConversation.participants.user2.id == req.user._id) {
                        next();
                    } else {
                        req.flash("error", "You are not a member of this conversation");
                        res.redirect("back");
                    }
                }
            });
    } else {
        req.flash("error", "You need to be logged in to do that")
        res.redirect("back");
    }
}

var connections = [];
var users = [];

function saveMessage(message, thread){
  Message.create(message, function(err, newMessage){
    if(err){
      console.log("error creating message " + err);
    } else {
      console.log('newMessage')
      console.log(newMessage)
      Conversation.findById(thread).exec(function(err, conv){
        if(err){
          console.log('Error fetching conversation ' + err);
        } else {
          conv.updated = Date.now();
          conv.messages.push(newMessage);
          conv.save();
        }
      });
    }
  });
}

io.on('connection', function(socket){
  socket.on('room', function(room){
    socket.join(room);
    console.log("someone's joinged room " + room);
  })
  connections.push(socket);
  console.log('Connections: %s sockets connected', connections.length);

  //Disconnect
  socket.on('disconnect', function(data){
    connections.splice(connections.indexOf(socket), 1)
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  // New message
  socket.on('new message', function(newMsg, thread){
    saveMessage(newMsg, thread);
    console.log(newMsg);
    console.log('thread');
    console.log(thread);
    io.to(thread).emit('message', {msg: newMsg.messageContent, senderId: newMsg.sender.id});
    noMsgsSent++;
    console.log(noMsgsSent)
  });
});

// ROUTES

// Landing Page
app.get('/', function(req, res){
  res.render('index');
});

//Sign up page
app.get('/signup', function(req, res){
  res.render('register');
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
      res.render("edit", {user_id: req.params._id, user: foundUser});
    }
  });
});

// PUT edits
app.put('/users/:_id', function(req, res){
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

// Handle login logic
// app.post('/login', passport.authenticate('local',
//   {
//     successRedirect: '/matches',
//     failureRedirect: '/',
//     failureFlash: true
//   }, function(req, res){
//     User.findByIdAndUpdate(req.user._id, {lastLogin: Date.now()}, function(err, updatedUser){
//       if(err){
//         console.log('error finding / updating user')
//         console.log(err)
//       } else {
//         console.log(updatedUser)
//         console.log('updatedUser')
//       }
//     });
//     console.log("User logged in!")
//   })
// );

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      req.flash("error", "Invalid email address or password");
      res.redirect('/'); return}

    req.logIn(user, function(err) {
      User.findByIdAndUpdate(req.user._id, {lastLogin: Date.now()}, function(err, updatedUser){
        if(err){
          console.log('error finding / updating user')
          console.log(err)
        } else {
          console.log(updatedUser)
          console.log('updatedUser')
        }
      });
      console.log("login")
      if (err) { return next(err); }
      return res.redirect('/matches');
    });
  })(req, res, next);
});


app.get('/logout', function(req, res){
    req.logout();
    res.redirect("/");
});

//Matched and Profiles

// Get Matches
app.get('/matches', isLoggedIn, function(req, res){
  req.session.loadedProfiles = [];
  req.session.query = {learningLanguages: {$in: req.user.spokenLanguages}}
  var q = User.find(req.session.query).sort({"lastLogin":-1}).limit(6)
  console.log('req.session.query')
  console.log(req.session.query)
  q.exec(function(err, foundUsers){
    if(err){
      console.log("error getting matches from database");
      console.log(err);
    } else {
      foundUsers.forEach(function(user){
        req.session.loadedProfiles.push(user._id);
      });
      console.log('req.session.loadedProfiles from first load')
      console.log(req.session.loadedProfiles)
      res.render('matches', {users:foundUsers});
    }
  });
});

// More matches request  / infinite scrolling
app.post('/matches', isLoggedIn, function(req, res){
  req.session.query = {$and:
    [
      {_id: {$nin: req.session.loadedProfiles}},
      req.session.query
    ]
    }
  var q = User.find(req.session.query).sort({"lastLogin":-1}).limit(3);
  q.exec(function(err, nextUsers){
    if(err){
      console.log('error getting next profiles');
      console.log(err);
    } else {
        nextUsers.forEach(function(user){
          req.session.loadedProfiles.push(user._id);
          console.log('user._id')
          console.log(user._id)
        });
        console.log('more matches req.session.loadedProfiles from infinite loading')
        console.log(req.session.loadedProfiles)
        res.send({nextUsers: nextUsers});
    }
  });
});

//========== Search for users ===========

// Show search page
app.get('/search', isLoggedIn, function(req, res){
  res.render('search');
});

// Fetch search results
app.post('/search', isLoggedIn, function(req,res){
  req.session.query = {};
  var loadedProfiles = [];
  req.session.query['$and']=[]; // filter the search by any criteria given by the user
  if((req.body.learninglanguages).length > 0){ // if the criteria has a value or values
    req.session.query["$and"].push({ learningLanguages: {$in: req.body.learninglanguages.split(",") }}); // add to the query object
  }
  if((req.body.spokenlanguages).length > 0){
    req.session.query["$and"].push({ spokenLanguages: {$in: req.body.spokenlanguages.split(",") }});
  }
  if((req.body.country).length > 0){
    req.session.query["$and"].push({ country: {$in: req.body.country.split(",") }});
  }
  if((req.body.commethod).length > 0){
    req.session.query["$and"].push({ comMethod: {$in: req.body.commethod.split(",") }});
  }
  var query = User.find(req.session.query).sort({"lastLogin":-1}).limit(6);
  query.exec(function(err, foundUsers){
    if(err){
      console.log("error getting matches from database");
      console.log(err);
    } else {
      foundUsers.forEach(function(user){
        loadedProfiles.push(user._id);
      });
      console.log('loadedProfiles')
      console.log(loadedProfiles)
      res.render('matches', {users:foundUsers});
    }
  });
})

//View a user's profile
app.get('/users/:_id/view', isLoggedIn, function(req, res){
  User.findById(req.params._id, function(err, foundUser){
    if(err){
      res.redirect("back");
    } else {
      res.render('view', {user: foundUser});
    }
  });
});

// Send a new message to another user
app.post('/messages', isLoggedIn, function(req, res){
  var message = { // Create an object with the message data
    sender : {
      "id" : req.body.senderId,
      "username" : req.body.senderName
    },
    recipient : {
      "id" : req.body.recipientId,
      "username" : req.body.recipientName
    },
    messageContent: req.body.msgCont,
    timeSent: Date.now()
  };
  Message.create(message, function(err, newMessage){ // Add the message to MongoDB
    if(err){
      console.log('Error Creating Message ' + err)
    } else {
      // Query DB for conversations with both sender and recipient at participants
      Conversation.findOne(
        {$and : [
        {$or : [
          {"participants.user1.id" : req.body.senderId},
          {"participants.user1.id" : req.body.recipientId}
        ]},
        {$or : [
          {"participants.user2.id" : req.body.senderId},
          {"participants.user2.id" : req.body.recipientId}
        ]},
      ]}, function(err, convo){
        if(err){
          console.log('Error finding convo ' + err);
        } else {
          if(convo == null){
            var conv = {
              participants : {
                user1 : {
                  id : req.body.senderId,
                  username : req.body.senderName
                },
                user2 : {
                  id : req.body.recipientId,
                  username : req.body.recipientName
                }
              },
              updated : Date.now(),
              messages : [] // The message _id is pushed in later.
            }
            Conversation.create(conv, function(err, newConvo){
              if(err){
                console.log('Error creating new convo ' + err);
              } else {
                newConvo.messages.push(newMessage);
                newConvo.save();
              }
            })
          } else {
            convo.messages.push(newMessage);
            convo.save();
          }
        }
      });
    }
  });
  req.flash("success", "You Send a Message!")
  res.redirect('/matches');
});

// Send a message from existing thread
app.post('/messages/:_id', isLoggedIn, function(req, res){
  console.log("=================================================")
  console.log('req.body');
  console.log(req.body);
  console.log("=================================================")
  var message = {
    sender : {
      "id" : req.body.senderId,
      "username" : req.body.senderName
    },
    recipient : {
      "id" : req.body.recipientId,
      "username" : req.body.recipientName
    },
    messageContent: req.body.newMessage,
    timeSent: Date.now()
  };
  Message.create(message, function(err, newMessage){
    if(err){
      console.log("error creating message " + err);
    } else {
      Conversation.findById(req.params._id).exec(function(err, conv){
        console.log('========================================================')
        console.log('message');
        console.log(message);
        if(err){
          console.log('Error fetching conversation ' + err);
        } else {
          console.log('========================================================')
          console.log('newMessage');
          console.log(newMessage);
          conv.updated = Date.now();
          conv.save();
          conv.messages.push(newMessage);
          conv.save();
        }
      });
      res.redirect('back');
    }
  });
});

// view all conversations a user belongs to
app.get('/messages', isLoggedIn, function(req, res){
  var profilePics = {};
  var ids = [];
  Conversation.find({
    $or : [
      {"participants.user1.id" : req.user._id},
      {"participants.user2.id" : req.user._id}
    ]
  }, function(err, convos){
    if(err){
      console.log('Error getting Convos ' + err)
    } else {
      convos.forEach(function(cnv, i){
        if(cnv.participants.user1.id == req.user._id){
          ids.push(cnv.participants.user2.id);
        } else {
          ids.push(cnv.participants.user1.id);
        }
      })
      ids.forEach(function(id, i){
        User.findById(id, function(err, foundUser){
          var k = id
          var v = foundUser.photos[0]
          profilePics[k] = v
          if(i == (ids.length - 1)){
            console.log(profilePics);
            res.render('messages', {convos: convos, profilePics: profilePics});
          }
        });
      });
    }
  }).sort({"updated":-1});
});

//View individual conversations
app.get('/messages/:_id', checkConversationOwership, function(req, res){
  var messages = [];
  var thread = req.params._id;
  Conversation.findById(req.params._id).exec(function(err, conv){
    if(err){
      console.log("Error finding conversation " + err);
    } else {
      conv.messages.forEach(function(messageId, i){
        Message.findById(messageId).exec(function(err, msg){
          if(err){
            console.log('error getting message' + err);
          } else {
            messages.push(msg);
          }
          if(conv.messages.length == messages.length) {
            // connectSocket(req.params._id)
            res.render('message_view', {thread: thread, messages: messages});
          }
        })
      })
    }
  })
})

// ======== For Heroku ========
// server.listen(process.env.PORT || 8080 , process.env.IP, function(){
// ======== For Local =========
server.listen(27017, process.env.IP, function(){
  console.log('Fire it UP!');
});
