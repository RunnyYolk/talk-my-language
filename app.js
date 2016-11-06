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
    io             = require('socket.io').listen(server),
    session        = require('express-session'),
    MemoryStore    = require('session-memory-store')(session);

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
  store: new MemoryStore(),
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
      Conversation.findById(thread).exec(function(err, conv){
        if(err){
          console.log('Error fetching conversation - app.js 132 ' + err);
        } else {
          conv.updated = Date.now();
          conv.messages.push(newMessage);
          conv.save();
          console.log("convo saved line 138. Check new message pushed, new message for user and Date.now = " + Date.now());
          console.log(conv)
          User.findByIdAndUpdate(message.recipient.id, {
            $addToSet: {updatedConversations: conv.id}
          }, function(err, updatedRecipient){
            if(err){
              console.log('Error updating recipients number of new messages ' + err)
            } else {
              console.log('updatedRecipient')
              console.log(updatedRecipient)
            }
          });
        }
      });
    }
  });
}

io.on('connection', function(socket){
  socket.on('room', function(room){
    socket.join(room);
    console.log("someone's joined room " + room);
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
    io.to(thread).emit('message', {msg: newMsg.messageContent, senderId: newMsg.sender.id});
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
    console.log("=================================req=========================")
    console.log("=================================req=========================")
    console.log(req)
    console.log("=================================req=========================")
    console.log("=================================req=========================")
    req.files.forEach(function(file, i){
      photos.push(req.files[i].path.replace('public/', '/'));
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
    console.log('newUser')
    console.log(newUser)
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
      req.flash('error', "There was an error loading your profile.")
      res.redirect("back");
    } else {
      res.render("edit", {user_id: req.params._id, user: foundUser});
    }
  });
});

// PUT edits
app.put('/users/:_id', function(req, res){
  upload(req, res, function (err){
    if (err) {
      console.log('error');
      console.log(err)
      return;
    }
    var spokenLangs = req.body.spokenlanguages.split(',');
    var learnLangs = req.body.learninglanguages.split(',');
    var comms = req.body.commethod.split(',');
    var photos = []
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
    console.log(req)
    req.files.forEach(function(file, i){
      photos.push(req.files[i].path.replace('public/', '/'));
    });
    var updatedUser =
      {
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
      }

    User.findByIdAndUpdate(req.params._id, updatedUser, function(err, user){
      if(err){
        console.log('error updating user');
        console.log(err);
      } else {
        res.redirect('/matches');
      }
    });
  });
});

app.post('/users/block', function(req,res){
  var newBlockedUser = req.body.blockedUserId;
  User.findByIdAndUpdate(
    req.body.blockingUser,
    {$push: {"blockedUsers": newBlockedUser}},
    {upsert: true},
    function(err, blockedUser) {
      if(err){
        console.log("Error blocking user " + err);
      } else {
        req.flash("success", "You Blocked" + req.body.blockedUserUsername);
        res.redirect("/matches");
      }
    }
  );
});

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

// Delete User

app.get('/deleteUser', function(req, res){
  User.remove({_id: req.user._id}, function(err){
    if(err){
      console.log('Something went wrong');
      console.log(err)
      req.flash('error', 'There was an error deleting your account. Please contact WordUP to have your account deleted.')
      res.redirect('/matches');
    } else {
      req.flash('success', 'Profile deleted. Bye... :(')
      res.redirect('/')
    }
  })
})

//Matched and Profiles

// Get Matches
app.get('/matches', isLoggedIn, function(req, res){
  req.session.loadedProfiles = [];
  if(req.user.blockedUsers){
    req.session.query = {$and:
      [
        {learningLanguages: {$in: req.user.spokenLanguages}},
        {_id: {$nin: req.user.blockedUsers.split(",")}}
      ]
      }
  } else {
    req.session.query = {learningLanguages: {$in: req.user.spokenLanguages}}
  }
  var q = User.find(req.session.query).sort({"lastLogin":-1}).limit(6)
  q.exec(function(err, foundUsers){
    if(err){
      console.log("error getting matches from database");
      console.log(err);
    } else {
      foundUsers.forEach(function(user){
        req.session.loadedProfiles.push(user._id);
      });
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
        });
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
              messages : [], // The message _id is pushed in later.
            }
            Conversation.create(conv, function(err, newConvo){
              if(err){
                console.log('Error creating new convo ' + err);
              } else {
                newConvo.messages.push(newMessage);
                newConvo.save();
                User.findByIdAndUpdate(req.body.recipientId, {
                  $addToSet: {updatedConversations: newConvo.id}
                }, function(err, updatedRecipient){
                  if(err){
                    console.log("Error updating recipient's number of new messages " + err)
                  }
                });
              }
            });
          } else {
            convo.messages.push(newMessage);
            convo.save();
            console.log("New conversation started. Check message pushed and new message for user")
            console.log(convo)
            User.findByIdAndUpdate(req.body.recipientId, {
              $addToSet: {updatedConversations: convo.id}
            }, function(err, updatedRecipient){
              if(err){
                console.log('Error updating recipients number of new messages ' + err)
              } else {
                console.log('updatedRecipient')
                console.log(updatedRecipient)
              }
            });
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
        if(err){
          console.log('Error fetching conversation ' + err);
        } else {
          conv.updated = Date.now();
          conv.messages.push(newMessage);
          conv.save();
          console.log("Message sent form existing thread line 548. Check newMessageForUer, message pushed and Date.now = " + Date.now());
          console.log(convo)
          User.findByIdAndUpdate(req.body.recipientId, {
            $addToSet: {updatedConversations: conv.id}
          }, function(err, updatedRecipient){
            if(err){
              console.log('Error updating recipients number of new messages ' + err)
            } else {
              console.log('updatedRecipient')
              console.log(updatedRecipient)
            }
          });
        }
      });
      res.redirect('back');
    }
  });
});

// view all conversations a user belongs to
app.get('/messages', isLoggedIn, function(req, res){
  var profilePics = {}; // empty object for other useres' profile pictures
  var ids = []; // empty array for other users' ids
  Conversation.find({
    $or : [
      {"participants.user1.id" : req.user._id},
      {"participants.user2.id" : req.user._id} // find all conversations which
    ]                                          // current user is a part of
  }, function(err, convos){                    // and keep them in 'convos'
    if(err){
      console.log('Error getting Convos ' + err)
    } else {
      convos.forEach(function(cnv, i){
        Message.findById(cnv.messages[cnv.messages.length -1], function(err, message){
          if(err){
            console.log('error getting message' + err)
          } else {
            cnv.lastMessage = message.messageContent
            if(cnv.lastMessage.length > 50){
              cnv.lastMessage = cnv.lastMessage.substring(0,49)+"...";
            }
            console.log('cnv.lastMessage');
            console.log(cnv.lastMessage);
          }
        })
        if(cnv.participants.user1.id == req.user._id){
          ids.push(cnv.participants.user2.id); // If current user is convo participant
        } else {                               // one, then push participant 2 into
          ids.push(cnv.participants.user1.id); // ids array, and vis versa
        }
        ids.forEach(function(id, i){
          User.findById(id, function(err, foundUser){
            if(err){
              console.log('err')
              console.log(err)
            } else if(foundUser){
              var k = id
              cnv.profilePic = foundUser.photos[0]
            }
            if(i == (ids.length - 1)){
              console.log('convos!!!!!!!')
              console.log(convos)
              res.render('messages', {convos: convos});
            }
          });
        });
      })
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
            User.findByIdAndUpdate(req.user.id, {
              $pull : { updatedConversations : req.params._id }
            }, function(err, updatedUser){
              if(err){
                console.log('error pulling convo from user')
                console.log(err)
              }
            });
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
server.listen(3000, process.env.IP, function(){
  console.log('Fire it UP!');
});
