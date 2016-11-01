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


  blockBtns.click(function(){
    $(".block-form").toggleClass("active");
  });

})
