

$(document).ready(function(){
  $(window).scroll(function(){
    if($(window).scrollTop() >= ($(document).height() - $(window).height())){
      $.post({
        url: '/matches',
        contentType: 'appliction/json',
        success: function(response){
          var profilesList = $('.ui.four.stackable.cards');
          var color = ['blue', 'pink', 'yellow'];
          var n = 0;
          response.nextUsers.forEach(function(user){
            var spokenLangs = ""
            var learningLangs = ""
            user.spokenLanguages.forEach(function(lang, i){
              spokenLangs += "<p>" + lang + "</p>"
            });
            user.learningLanguages.forEach(function(lang, i){
              learningLangs += "<p>" + lang + "</p>"
            });
            profilesList.append('\
            <a class="ui fluid card '+ color[n] +'" href="/users/'+ user._id +'/view">\
                <div class="image">\
                  <img src="'+ user.photos[0] +'"/>\
                </div>\
                <div class="content">\
                  <div class="info">\
                    <h3>'+ user.firstName +' '+ user.lastName +'</h3>\
                    <h4>'+ user.city +', '+ user.country +'</h4>\
                    <div class="speaks-container">\
                      <h5>speaks</h5>'+ spokenLangs +'</div>\
                    <div class="learning-container">\
                      <h5>learning</h5>'+ learningLangs +'</div>\
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
