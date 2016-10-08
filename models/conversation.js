var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var ConversationSchema = new mongoose.Schema({
  participants: [
    {
      user1: {
        id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
        username: String
      },
      user2: {
        id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
        username: String
      },
    },
  ],
  started: Number,
  messages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    }
  ]
});

module.exports = mongoose.model("Conversation", ConversationSchema);
