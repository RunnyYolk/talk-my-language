$('.ui.dropdown').dropdown({
  forceSelection: false
});

var email = sessionStorage.getItem('email');
document.querySelector('input[name="username"]').value = email

var fileList;

    var isAdvancedUpload = function() {
      var div = document.createElement('div');
      return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
    }();

    var $form = $('.ui .form');
    var $inputBox = $('.box');

    var $input = $form.find('input[type="file"]'),
      $label = $form.find('label');
    showFiles = function(files) {
      $label.text(files.length > 1 ? ($input.attr('data-multiple-caption') || '').replace('{count}', files.length) : files[0].name);
    };

    if (isAdvancedUpload) {
      var droppedFiles = false;
      $form.addClass('has-advanced-upload');
      $form.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
      $form.on('dragover dragenter', function() {
        $form.addClass('is-dragover');
      });
      $form.on('dragleave dragend drop', function() {
        $form.removeClass('is-dragover');
      });
      $form.on('drop', function(e) {
        droppedFiles = e.originalEvent.dataTransfer.files;
        var $imgDiv = $('.selected-images');
        $.each(droppedFiles, function(index, file) {
          var img = document.createElement('img');
          img.onload = function() {
            window.URL.revokeObjectURL($.src);
          };
          img.height = 100;
          img.src = window.URL.createObjectURL(file);
          $imgDiv.append(img);
          showFiles(droppedFiles);
        });
      });
    }

    $form.on('submit', function(e) {
      if ($form.hasClass('is-uploading')) return false;

      $form.addClass('is-uploading').removeClass('is-error');

      if (isAdvancedUpload) {
        e.preventDefault();

        var ajaxData = new FormData($form.get(0));

        if (droppedFiles) {
          $.each(droppedFiles, function(i, file) {
            ajaxData.append($input.attr('name'), file);
          });
        }

        $.ajax({
          url: $form.attr('action'),
          type: $form.attr('method'),
          data: ajaxData,
          // dataType: 'json',
          cache: false,
          contentType: false,
          processData: false,
          complete: function() {
            $form.removeClass('is-uploading');
          },
          success: function(data) {
            // $form.addClass(data.success == true ? 'is-success' : 'is-error');
            // if (!data.success) console.log(data);
            window.location.replace('/matches');
          },
          error: function(xhr, textStatus, errorThrown) {
            console.log(xhr.statusText);
            console.log(textStatus);
            console.log(errorThrown);
          }
        });

      } else {
        var iframeName = 'uploadiframe' + new Date().getTime();
        $iframe = $('<iframe name="' + iframeName + '" style="display: none;"></iframe>');

        $('body').append($iframe);
        $form.attr('target', iframeName);

        $iframe.one('load', function() {
          var data = JSON.parse($iframe.contents().find('body').text());
          $form
            .removeClass('is-uploading')
            .addClass(data.success == true ? 'is-success' : 'is-error')
            .removeAttr('target');
          if (!data.success) $errorMsg.text(data.error);
          $form.removeAttr('target');
          $iframe.remove();
        });
      };
    });

    $input.on('change', function(e) {
      showFiles(e.target.files);
    });

// Form validation
//
// $('.ui.form')
//   .form({
//     fields: {
//       fname : {
//         identifier: 'fname',
//         rules: [
//           {
//           type: 'empty',
//           prompt: 'please enter your first name'
//           }
//         ]
//       },
//       lname : {
//         identifier: 'lname',
//         rules: [
//           {
//           type: 'empty',
//           prompt: 'please enter your last name'
//           }
//         ]
//       },
//       username : {
//         identifier: 'username',
//         rules: [
//           {
//           type: 'email',
//           prompt: 'please enter a valid email address'
//           }
//         ]
//       },
//       age: {
//         identifier: 'age',
//         rules: [
//           {
//           type: 'empty',
//           prompt: 'please select your age range'
//           }
//         ]
//       },
//       password : {
//         identifier: 'password',
//         rules: [
//           {
//           type: 'empty',
//           prompt: 'please enter a password'
//           }
//         ]
//       },
//       spokenlanguages : {
//         identifier: 'spokenlanguages',
//         rules: [
//           {
//           type: 'minCount[1]',
//           prompt: "please choose at least one language that you speak already"
//           }
//         ]
//       },
//       learninglanguages : {
//         identifier: 'learninglanguages',
//         rules: [
//           {
//           type: 'minCount[1]',
//           prompt: "please choose at least one language that you're learning"
//           }
//         ]
//       },
//       info : {
//         identifier: 'info',
//         rules: [
//           {
//           type: 'empty',
//           prompt: 'please provide some info about yourself'
//           }
//         ]
//       },
//       country : {
//         identifier: 'country',
//         rules: [
//           {
//           type: 'empty',
//           prompt: 'please select the country you live in'
//           }
//         ]
//       },
//       city : {
//         identifier: 'city',
//         rules: [
//           {
//           type: 'empty',
//           prompt: 'please enter the town or city you live in'
//           }
//         ]
//       },
//       commethod : {
//         identifier: 'commethod',
//         rules: [
//           {
//           type: 'minCount[1]',
//           prompt: 'please choose at least one method of communicating with other langugage learners'
//           }
//         ]
//       },
//
//       terms    : {
//         identifier: 'terms',
//         rules: [
//           {
//           type: 'checked',
//           prompt: 'you must agree to the terms and conditions before signing up'
//           }
//         ]
//       },
//     },
//     inline: true,
//   });
// ;
