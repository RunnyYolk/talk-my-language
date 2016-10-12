$('.ui.dropdown')
  .dropdown()
;

$(document).ready(function(){
  $('[name="reset"]').click(function(){
    $('.ui.form').form('clear')
  });

});
