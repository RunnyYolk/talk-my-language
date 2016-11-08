$(document).ready(function(){

  var setLayout = function(){
    if($(this).width() < 992){
      $("#profile-container").attr("class", "sixteen wide column")
      $("#image-container").attr("class", "sixteen wide column")
    } else {
      $("#profile-container").attr("class", "ten wide column")
      $("#image-container").attr("class", "six wide column")
    }
  }

  setLayout();

  $(window).resize(function(){
    setLayout();
  });

});
