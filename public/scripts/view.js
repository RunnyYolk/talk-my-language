var messageBoxOpen = false;

var messageToggle = function(){
  $('.profile-container').toggleClass('up');
  $('.show-msg').toggleClass('up');
  $('.send-msg').toggleClass('up');
  $('.message-container').toggleClass('up');
  messageBoxOpen = !messageBoxOpen;
}

$(document).ready(function(){
  $('[name="message"]').click(function(){
    if(messageBoxOpen){
      $('.ui.form').submit();
    } else {
      messageToggle();
    }
  });
  $('.cancel-message').click(messageToggle);
})
