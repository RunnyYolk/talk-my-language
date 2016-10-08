var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var MessageSchema = new mongoose.Schema({
  sender: {
    id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
    username: String
  },
  recipient: {
    id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
    username: String
  },
  messageContent: String,
  timeSent: Number
})

module.exports = mongoose.model("Message", MessageSchema);
