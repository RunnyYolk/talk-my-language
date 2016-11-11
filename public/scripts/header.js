$(document).ready(function(){
  $(window).scroll(function(){
    var newpacity = 1 - $(this).scrollTop() / 1000
      if(newpacity >= 0.5) {
      $('.navbar').css('opacity', newpacity);
    }
  });
});
