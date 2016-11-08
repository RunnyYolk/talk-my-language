$(document).ready(function(){
  // $('.ui.fluid.card').animate(
  //   {opacity: 1}, 700, {transform: translateY('-50px')}, 500, function(){}
  // )
  jQuery.fn.exists = function(){return this.length>0;}

  $(".profileIncomplete").click(function(){
    console.log('Nope!');
  });

  $(window).scroll(function(){
    var newpacity = 1 - $(this).scrollTop() / 1000
      if(newpacity >= 0.5) {
      $('.navbar').css('opacity', newpacity);
    }

    if($(this).scrollTop() >= ($(document).height() - $(this).height())){
      let viewedProfiles =  $('input[name="viewedProfiles"]').value;
      // if($('input[name="query"]').exists()){
      //   let query = $('input[name="query"]').value;
      // };
      console.log('viewedProfiles')
      console.log(viewedProfiles)
      // if($('input[name="query"]').exists()){
      //   console.log('query')
      //   console.log(query)
      // }
      console.log(typeof viewedProfiles)
      $.ajax({
        traditional: true,
        url: '/matches',
        type: 'post',
        // contentType: 'appliction/json',
        data: {viewedProfiles: viewedProfiles},
        // dataType: 'json',
        success: function(response){
          var profilesList = $('.ui.four.stackable.cards');
          var color = ['blue', 'pink', 'yellow'];
          var n = 0;
          console.log($('input[name="viewedProfiles"]').value)
          response.nextUsers.forEach(function(user, i){
            var spokenLangs = ""
            var learningLangs = ""
            user.spokenLanguages.forEach(function(lang, i){
              spokenLangs += "<p>" + lang + "</p>"
            });
            user.learningLanguages.forEach(function(lang, i){
              learningLangs += "<p>" + lang + "</p>"
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
                    <div class="languages">\
                      <div class="speaks-container">\
                        <h5>speaks</h5>'+ spokenLangs +'\
                      </div>\
                      <div class="learning-container">\
                        <h5>learning</h5>'+ learningLangs +'\
                      </div>\
                    </div>\
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
