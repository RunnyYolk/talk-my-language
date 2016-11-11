$(document).ready(function(){
  var messageBoxOpen = false; // to keep track of messageBox's position
  var blockBtns = $("#block, .cancel-block")

  var messageToggle = function(){
    $('.profile-container').toggleClass('up');
    $('.show-msg').toggleClass('up');
    $('.send-msg').toggleClass('up');
    $('.message-container').toggleClass('up');
    messageBoxOpen = !messageBoxOpen;
  }

  $('[name="message"]').click(function(){
    if(messageBoxOpen){
      $('.ui.form').submit();
    } else {
      messageToggle();
    }
  });
  $('.cancel-message').click(messageToggle);

  var setLayout = function(){
    if($(this).width() < 992){
      $("#profile-message-container").attr("class", "sixteen wide column")
      $("#image-container").attr("class", "sixteen wide column")
    } else {
      $("#profile-message-container").attr("class", "ten wide column")
      $("#image-container").attr("class", "six wide column")
    }
  }

  setLayout();

  $(window).resize(function(){
    setLayout();
  })

  blockBtns.click(function(){
    $(".block-form").toggleClass("active");
  });

})
