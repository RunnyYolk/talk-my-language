$(document).ready(function(){
  $('[name="reset"]').click(function(){
    $('.ui.form').form('clear')
  });

  $('.ui.form').change(function(e){
    if($('[name="spokenlanguages"]').val() || $('[name="learninglanguages"]').val() || $('[name="country"]').val()) {
      document.getElementById('submit-btn').disabled = false;
    } else {
      document.getElementById('submit-btn').disabled = true;
    }

  });

  $('.ui.dropdown').dropdown({
    forceSelection: false
  });



});
