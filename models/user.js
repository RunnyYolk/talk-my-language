var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  firstName: String,
  lastName: String,
  age: String,
  gender: String,
  spokenLanguages: Array,
  learningLanguages: Array,
  photos: Array,
  info: String,
  country: String,
  city: String,
  comMethod: Array,
  lastLogin: Number
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
