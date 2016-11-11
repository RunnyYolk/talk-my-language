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
    nodemailer     = require('nodemailer'),
    randomstring   = require('randomstring'),
    config         = require('./config'),
    MemoryStore    = require('session-memory-store')(session);

const saltRounds = 10;
const myPlaintextPassword = 'word up dogue';
const someOtherPlaintextPassword = 'well hello there';

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

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport(('SMTP',{
            host: config.email.host,
            port: config.email.port,
            auth: {
                user: config.email.username,
                pass: config.email.password
            },
        })
    );

var upload = multer({storage: storage}).any('photos');

//connect mongoDB
// ========== For Local =============
// mongoose.connect("mongodb://localhost/tml");
// ========== For Heroku ============
mongoose.connect("mongodb://" + config.db.username + ":" + config.db.password + "@ds149577.mlab.com:49577/wordup");
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
  if(req.user && !req.user.profileComplete) {
    req.flash('error', 'Please complete your profile')
  }
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next){
  if(!req.user.emailConfirmed){
    req.flash("error", "You need to confirm your email address before you can access the site");
    res.redirect('/confirmEmail');
    return;
  }
  if(req.isAuthenticated()){
    return next();
  }
  req.flash("error", "Please log in or sign up");
  res.redirect('/');
  return;
}

// Middleware to check ownership of a conversation

function checkConversationOwership (req, res, next) {
    if(req.isAuthenticated()){
            Conversation.findById(req.params._id, function(err, foundConversation){
                if(err){
                    req.flash('error', "We couldn't confirm who owns this conversation")
                    res.redirect("back");
                    return;
                } else {
                    // does user own the conversation?
                    if(foundConversation.participants.user1.id == req.user._id || foundConversation.participants.user2.id == req.user._id) {
                        next();
                    } else {
                        req.flash("error", "You are not a member of this conversation");
                        res.redirect("back");
                        return;
                    }
                }
            });
    } else {
        req.flash("error", "You need to be logged in to do that")
        res.redirect("back");
        return;
    }
}

function checkUserOwnership(req, res, next){
  if(req.isAuthenticated()){
    if(req.params._id == req.user._id) {
      next();
    } else {
      req.flash("error", "Stop messing with other people's accounts!");
      res.redirect('/matches');
      return;
    }
  } else {
    req.flash("error", "You need to be logged in to do that")
    res.redirect("back");
    return;
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

//New user creation
app.post('/signup', function(req, res){
  //variables for new user
  var newUser = new User(
    {
      username: req.body.username,
      profileComplete: false,
      emailConfirmed: false,
      lastLogin: Date.now(),
      emailConfirmURL: randomstring.generate()
    }
  );

  User.register(newUser, req.body.password, function(err, user){
    if(err){
      req.flash("error", err)
      res.redirect('/')
      return;
    } else {
      passport.authenticate('local')(req, res, function(){

        let mailOptions = {
        from: 'wordup@nickturner.io', // sender address
        to: newUser.username, // list of receivers
        subject: 'WordUP! Please confirm your email address',
        text: 'Thanks for registering with WordUP.\n\rPlease follow this link to confirm your email address: \n\rhttp://localhost:3001/confirmEmail/' + newUser.emailConfirmURL
        }

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info){
          if(error){
            console.log('error sending email');
            console.log(error);
            req.flash("error", "We tired to send you a confirmation email, but there was a problem. Please try registering again, or contact WordUP for help");
            res.redirect('/')
            return;
          } else {
            req.flash("success", "Your account has been successfully created, and a confirmation email has been sent to you. (If you don't see the email, check your spam!)")
            res.redirect('/confirmEmail');
            return;
          }
        });
      });
    }
  });
});

app.get('/confirmEmail', function(req, res){ // If user's email isn't confirmed they're redirected here
  res.render('confirmEmail')
});

app.get('/confirmEmail/:URL', function(req,res){
  User.findOne({"emailConfirmURL": req.params.URL}, function(err, foundUser){
    if(err){
      req.flash('error', 'Sorry there was an error verifying your account. Please contact WordUP if this keeps happening')
      res.redirect('/');
      return;
    }
    foundUser.emailConfirmed = true;
    foundUser.save();
    req.flash("success", 'Your account has been verified. Welcome to WordUP! Please log in.')
    res.redirect('/');
    return;
  });
});

// User edit (edit profile)

// Show edit form

app.get('/users/:_id/edit', isLoggedIn, checkUserOwnership, function(req, res){
  User.findById(req.params._id, function(err, foundUser){
    if(err){
      req.flash('error', "There was an error loading your profile. Please contact WordUP if this keeps happening")
      res.redirect("back");
      return;
    } else {
      res.render("edit", {user_id: req.params._id, user: foundUser});
    }
  });
});

// PUT edits
app.put('/users/:_id', isLoggedIn, checkUserOwnership, function(req, res){
  upload(req, res, function (err){
    if (err) {
      console.log('error');
      console.log(err)
      return;
    };
    req.user.photos.forEach(function(photo){
      fs.unlink("./public" + photo, function(err, file){
        if(err){
          console.log('Error deleting file');
          console.log(err)
          next;
        }
      });
    });
    var spokenLangs = req.body.spokenlanguages.split(',');
    var learnLangs = req.body.learninglanguages.split(',');
    var photos = []
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
        photos: photos,
      }

    if (
      updatedUser.firstName.length > 0 &&
      updatedUser.lastName.length > 0 &&
      updatedUser.age.length > 0 &&
      updatedUser.gender.length > 0 &&
      updatedUser.spokenLanguages.length > 0 &&
      updatedUser.learningLanguages.length > 0 &&
      updatedUser.info.length > 0 &&
      updatedUser.country.length > 0 &&
      updatedUser.city.length > 0 &&
      updatedUser.photos.length > 0
    ) {
      updatedUser.profileComplete = true
    } else {
      updatedUser.profileComplete = false
    }

    User.findByIdAndUpdate(req.params._id, updatedUser, function(err, user){
      if(err){
        console.log('error updating user');
        console.log(err);
      } else {
        res.redirect('/matches');
        return;
      }
    });
  });
});

app.post('/users/block', isLoggedIn, function(req,res){
  var newBlockedUser = req.body.blockedUserId;
  User.findByIdAndUpdate(
    req.body.blockingUser,
    {$push: {"blockedUsers": newBlockedUser}},
    {upsert: true},
    function(err, blockedUser) {
      if(err){
        console.log("Error blocking user " + err);
      } else {
        req.flash("success", "You have blocked" + req.body.blockedUserUsername);
        res.redirect("/matches");
        return;
      }
    }
  );
});

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      req.flash("error", "Invalid email address or password");
      res.redirect('/');
      return;
    }

    req.logIn(user, function(err) {
      User.findByIdAndUpdate(req.user._id, {lastLogin: Date.now()}, function(err, updatedUser){
        if(err){
          console.log('error finding / updating user')
          console.log(err)
        } else {
        }
      });
      console.log("login")
      if (err) {
        return next(err);
      }
      console.log('MemoryStore');
      console.log(MemoryStore);
      res.redirect('/matches');
      return;
    });
  })(req, res, next);
});

app.get('/logout', function(req, res){
    req.logout();
    res.redirect("/");
    return;
});

// Delete User

app.get('/deleteUser', isLoggedIn, function(req, res){
  User.remove({_id: req.user._id}, function(err){
    if(err){
      console.log('Something went wrong');
      console.log(err)
      req.flash('error', 'There was an error deleting your account. Please contact WordUP to have your account deleted.')
      res.redirect('/matches');
      return;
    } else {
      req.flash('success', 'You profile has been deleted. Bye... :(')
      res.redirect('/')
      return;
    }
  })
})

//Matched and Profiles

// Get Matches
app.get('/matches', isLoggedIn, function(req, res){
  req.session.loadedProfiles = [];
  if(req.user.blockedUsers && req.user.blockedUsers.length > 0){
    req.session.query = {$and:
      [
        {learningLanguages: {$in: req.user.spokenLanguages}},
        {spokenLanguages: {$in: req.user.learningLanguages}},
        {_id: {$nin: req.user.blockedUsers.split(",")}},
        {_id: {$ne: req.user._id}},
        {profileComplete:{$ne:false}}
      ]
    }
  } else if(req.user.profileComplete) { // if user has spoken languages on their profile
    req.session.query = {$and:
      [
        {learningLanguages: {$in: req.user.spokenLanguages}},
        {spokenLanguages: {$in: req.user.learningLanguages}},
        {_id: {$ne: req.user._id}},
        {profileComplete: {$ne : false}}
      ]
    }
  } else { //if user profile is not complete...
    req.session.query = {$and:
      [
        {_id: {$ne: req.user._id}},
        {profileComplete: {$ne : false}}
      ]
    }
  }
  var q = User.find(req.session.query).sort({"lastLogin":-1}).limit(6)
  q.exec(function(err, foundUsers){
    if(err){
      req.flash("error", "There was an error getting other users' information. Please contact WordUP if this keeps happening.")
      res.redirect("/");
      return;
    } else {
      foundUsers.forEach(function(user){
        req.session.loadedProfiles.push(user._id);
        res.render('matches', {users:foundUsers});
      });
    }
  });
});

// More matches request  / infinite scrolling
app.post('/matches', isLoggedIn, function(req, res){
  req.session.query = {$and:
    [
      {_id: {$nin: req.session.loadedProfiles}},
      {profileComplete:{$ne:false}},
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
    console.log('523')
  }
  if((req.body.spokenlanguages).length > 0){
    req.session.query["$and"].push({ spokenLanguages: {$in: req.body.spokenlanguages.split(",") }});
    console.log('527')
  }
  if((req.body.country).length > 0){
    req.session.query["$and"].push({ country: {$in: req.body.country.split(",") }});
    console.log('531')
  }
  var query = User.find({$and: [{profileComplete:{$ne:false}}, req.session.query]}).sort({"lastLogin":-1}).limit(6);
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
      req.flash("error", "Sorry, there was an error finding that user")
      res.redirect("back");
      return;
    } else if(req.user._id == req.params._id) {
      res.render('viewOwn', {user: foundUser});
    } else {
      res.render('view', {user: foundUser})
    }
  });
});

// Send a new message to another user
app.post('/messages', isLoggedIn, function(req, res){
  console.log(req.user)
  if(req.user.profileComplete){
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
    req.flash("success", "You sent a message!")
    res.redirect('/matches');
    return;
  } else {
    req.flash("error", "You need to complete your profile before sending messages to other users");
    res.redirect('/matches');
    return;
  }
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
      return;
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
  }, function(err, convos){
    if(!convos.length > 0) {
      req.flash('error', "You don't have any messages to view yet.")
      res.redirect('back');
      return;
    } else {
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
    }
  }).sort({"updated":-1});
});

//View individual conversations
app.get('/messages/:_id', checkConversationOwership, function(req, res){
  var messages = [];
  var thread = req.params._id;
  var otherUserId
  var otherUserPhoto
  Conversation.findById(req.params._id).exec(function(err, conv){
    if(err){
      console.log("Error finding conversation " + err);
    } else {
      if(conv.participants.user1.id == req.user._id) {
        otherUserId = conv.participants.user2.id
      } else if(conv.participants.user1.id == req.user._id) {
        otherUserId = conv.participants.user2.id
      }
      User.findById(otherUserId).exec(function(err, foundUser){
        if(err){
          console.log('error finding user' + err)
        } else {
          otherUserPhoto = foundUser.photos[0];
        }
      })
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
            res.render('message_view', {thread: thread, messages: messages, otherUserPhoto: otherUserPhoto});
          }
        })
      })
    }
  })
})

// ======== For Production ========
// server.listen(process.env.PORT || 8080 , process.env.IP, function(){
// ======== For Local =========
server.listen(3000, process.env.IP, function(){
  console.log('Fire it UP!');
});
