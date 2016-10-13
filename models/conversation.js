var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var ConversationSchema = new mongoose.Schema({
  participants: {
      user1:
        {
          id: String,
          username: String,
        },
      user2:
        {
          id: String,
          username: String,
        },
    },
  updated: Number,
  messages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    }
  ]
});

module.exports = mongoose.model("Conversation", ConversationSchema);
