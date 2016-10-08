$(document).ready(function(){
  // $('.ui.fluid.card').animate(
  //   {opacity: 1}, 700, {transform: translateY('-50px')}, 500, function(){}
  // )
  $(window).scroll(function(){
    if($(window).scrollTop() >= ($(document).height() - $(window).height())){
      $.post({
        url: '/matches',
        contentType: 'appliction/json',
        success: function(response){
          var profilesList = $('.ui.four.stackable.cards');
          var color = ['blue', 'pink', 'yellow'];
          var n = 0;
          response.nextUsers.forEach(function(user, i){
            var spokenLangs = ""
            var learningLangs = ""
            user.spokenLanguages.forEach(function(lang, i){
              spokenLangs += "<li>" + lang + "</li>"
            });
            user.learningLanguages.forEach(function(lang, i){
              learningLangs += "<li>" + lang + "</li>"
            });
            profilesList.append('\
            <a class="ui fluid card '+ color[n] +'" href="/users/'+ user._id +'/view" data-num="'+ i +'">\
                <div class="image-wrapper">\
                  <img src="'+ user.photos[0] +'"/>\
                </div>\
                <div class="content">\
                  <div class="info">\
                    <h3>'+ user.firstName +' <span class="bold">'+ user.lastName +'</span></h3>\
                    <h4>'+ user.city +', '+ user.country +'</h4>\
                    <div class="speaks-container">\
                      <h5>speaks</h5><ul>'+ spokenLangs +'</ul></div>\
                    <div class="learning-container">\
                      <h5>learning</h5><ul>'+ learningLangs +'</ul></div>\
                  </div>\
                </div>\
              </a>\
            ');
            if(n >= 2){
              n = 0
            } else {
              n++
            }
          });
        }
      });
    }
  });
});
