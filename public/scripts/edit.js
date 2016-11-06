(function(){

  $('.ui.dropdown').dropdown({
    forceSelection: false
  });

  $("#input-1").val(user.firstName);

  $("#input-2").val(user.lastName);

  $('#input-5').val(user.age) ;

  $('#input-6').val(user.gender) ;

  $('#spokenlanguages').dropdown('set selected', user.spokenLanguages);

  $('#learninglanguages').dropdown('set selected', user.learningLanguages);

  $('#about').val(user.info);

  $('#country').dropdown('set selected', user.country);

  $('#input-9').val(user.city);

  $('#commethod').dropdown('set selected', user.comMethod);

  $('.delete-button').click(function(){
    $('.delete-confirm-wrapper').toggleClass('open');
  });

  $(".confirm-delete-button").click(function(){
    if(document.getElementById('delete-checkbox').checked){
      window.location.replace('/deleteUser');
    }
  })

  $('.input--haruki').each(function(){
    if(!$(this).hasClass()){
      $(this).addClass('input--filled');
    }
  });

  var fileList;

  var isAdvancedUpload = function() {
    var div = document.createElement('div');
    return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
  }();

  var $box = $('.box')
  var $form = $('.ui .form');
  var $inputBox = $('.box');

  var $input = $form.find('input[type="file"]'),
    $label = $('[for="file"]');

  showFiles = function(files) {
    $label.text(files.length > 1 ? ($input.attr('data-multiple-caption') || '').replace('{count}', files.length) : files[0].name);
  };

  if (isAdvancedUpload) {
    var droppedFiles = [];
    $box.addClass('has-advanced-upload');
    $box.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
    });
    $box.on('dragover dragenter', function() {
      $box.addClass('is-dragover');
    });
    $box.on('dragleave dragend drop', function() {
      $box.removeClass('is-dragover');
    });

    $box.on('drop', function(e) {
      // $(e.originalEvent.dataTransfer.files).each(function(i, file){
      //   droppedFiles.push(file)
      // });
      droppedFiles = e.originalEvent.dataTransfer.files;
      var $imgDiv = $('.selected-images');
      $.each(droppedFiles, function(index, file) {
        var img = document.createElement('img');
        img.onload = function() {
          window.URL.revokeObjectURL($.src);
        };
        img.height = 100;
        img.src = window.URL.createObjectURL(file);
        $imgDiv.append('<div class="shown-image"><img height="100" src=' + img.src + ' id="' + file.name + '"><i class="delete icon img-del" ></i></div>');
        // $(".shown-image").prepend(img);
        // showFiles(droppedFiles);
      });
      var $imgDelIcons = $(".img-del")

      $imgDelIcons.on('click', function(){
        let that = this;
        $.each(droppedFiles, function(i, file){
          if(file.name == $(that).siblings()[0].id){
            console.log('droppedFiles before splice')
            console.log(droppedFiles)
            console.log('found it at ' + i)
            let fileId = "#" + JSON.stringify(file.name)
            console.log('fileId')
            console.log(fileId)
            console.log('filename')
            console.log(file.name)
            droppedFiles.splice(i, 1);
            console.log('droppedFiles after splice')
            console.log(droppedFiles)
            $($(that).parent()).remove();
            return;
          }
        })
      });
    });
  }



  $form.on('submit', function(e) {
    if ($form.hasClass('is-uploading')) return false;

    $form.addClass('is-uploading').removeClass('is-error');

    if (isAdvancedUpload) {
      console.log("Prevent Default!")
      e.preventDefault();

      var ajaxData = new FormData($form.get(0));

      if (droppedFiles) {
        console.log('droppedFiles before appending to ajaxData')
        console.log(droppedFiles)
        $.each(droppedFiles, function(i, file) {
          ajaxData.append($input.attr('name'), file);
        });
      }

      console.log('ajaxData')
      console.log(ajaxData)

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
          console.log(xhr)
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

  // $input.on('change', function(e) {
  //   showFiles(e.target.files);
  // });

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
})()
