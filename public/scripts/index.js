$(document).ready(function(){
  var login = false;
  $('.signup-btn').on("click", function(){
    if (!login) {
      let email = document.querySelector('input[name="username"]').value
      sessionStorage.clear();
      sessionStorage.setItem('email', email);
      window.location.href = '/signup';
    } else {
      $('.login-form').submit();
    }
  });

  var showPasswordBox = function(){
    if($('.email.input').val() ){
      login = !login
      $('.email.input').toggleClass('up');
      $('.password.input').toggleClass('up');
      $('.signup-text').toggleClass('up');
      $('.login').toggleClass('up');
      $('.login-text-container').toggleClass('active');
      $('.cancel-text-container').toggleClass('active');
      $('.email.input').prop('disabled').toggle;
      $('.email.input').blur()
    }
  };

  $('.clicker').click(showPasswordBox);

  $(".email.input").bind("keydown", function(event) {
    if(event.which == 9 && $('.email.input').val()) {
        event.preventDefault();
        showPasswordBox();
        setTimeout(function(){
          $('.password.input').focus()
        }, 400);
    }
  });
  $(".password.input").bind("keydown", function(event) {
    if(event.which == 9) {
        event.preventDefault();
        showPasswordBox();
        setTimeout(function(){
          $('.email.input').focus()
        }, 400);
    }
  });
});
