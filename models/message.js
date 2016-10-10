var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var MessageSchema = new mongoose.Schema({
  sender: {
    id: String,
    username: String
  },
  recipient: {
    id: String,
    username: String
  },
  messageContent: String,
  timeSent: Number
})

module.exports = mongoose.model("Message", MessageSchema);
