$('.ui.dropdown').dropdown({
  forceSelection: false
});

$(document).ready(function(){
  $('[name="reset"]').click(function(){
    $('.ui.form').form('clear')
  });

});
