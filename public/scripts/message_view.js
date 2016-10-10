$(document).ready(function(){

console.log('This is Jquery speaking.')

var $form = $(".write-message-form");

var NoMsgsPrinted = 0;
var counter = 0;

var thread = "/" + $('[name="thread"]').val()

  var socket = io(),
      $newMessage = $('.new-message'),
      $senderId = $('[name="senderId"]'),
      $senderName = $('[name="senderName"]'),
      $recipientId = $('[name="recipientId"]'),
      $recipientName = $('[name="recipientName"]'),
      $thread = $('[name="thread"]'),
      $chat = $('.messages-wrapper');

console.log(socket);

socket.on('connect', function(){
  socket.emit('room', thread)
  console.log(thread)
});

  $('[name="submit"]').click(function(e){
    e.preventDefault();
    if($newMessage.val()){
      var newMsg = {
        sender : {
          "id" : $senderId.val(),
          "username" : $senderName.val()
        },
        recipient : {
          "id" : $recipientId.val(),
          "username" : $recipientName.val()
        },
        messageContent: $newMessage.val(),
        timeSent: Date.now()
      };
      var thread = $thread.val()
      socket.emit('new message', newMsg, thread);
      $newMessage.val('');
      // ========= Use ajax post for legacy browsers?? ===========
      // var ajaxData = new FormData($form);
      // console.log('ajaxData');
      // console.log(ajaxData);
      // $.ajax({
      //   url: $form.attr('action'),
      //   type: $form.attr('method'),
      //   data: ($form).serialize(),
      //   dataType: 'json',
      //   cache: false,
      //   processData: false,
      //   success: function (e) {
      //     $("#mymsgs").load("message_view.ejs #mymsgs > *", "");
      //   },
      //   error:function(e){
      //     $("#mymsgs").load("message_view.ejs TEST > *", "");
      //     // $.get('/message_view.ejs', function(html) {
      //     //   $('#mymsgs').html(html);
      //     // });
      //   }
      // });
    };
  });
  socket.on('message', function(msg){
    console.log('msg')
    console.log(msg)
    if(msg.senderId == $senderId.val()){
      $chat.append('<div class="msg-wrapper current-user FROM JS">\
        <div class="msg msg-current-user">\
          <p>\
            '+msg.msg+'\
          </p>\
        </div>\
      </div>')
    } else {
      $chat.append('<div class="msg-wrapper other-user FROM JS">\
        <div class="msg msg-other-user">\
          <p>\
            '+msg.msg+'\
          </p>\
        </div>\
      </div>')
    }
  });
});
