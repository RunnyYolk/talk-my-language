var $form = $(".write-message-form");

$(document).ready(function(){


  $form.click(function(e){
    e.preventDefault()
    console.log('click')
  })
  $('[name="submit"]').click(function(e){
    e.preventDefault();
    var ajaxData = new FormData($form);
    // console.log('ajaxData');
    // console.log(ajaxData);

    $.ajax({
      url: $form.attr('action'),
      type: $form.attr('method'),
      data: ($form).serialize(),
      dataType: 'json',
      cache: false,
      processData: false,
      success: function (e) {
        $("#mymsgs").load("message_view.ejs #mymsgs > *", "");
      },
      error:function(e){
        $("#mymsgs").load("messsssage_view.ejs TEST > *", "");
        // $.get('/message_view.ejs', function(html) {
        //   $('#mymsgs').html(html);
        // });
      }
    });
  });
});
