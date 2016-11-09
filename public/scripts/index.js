$(document).ready(function(){


  $('.ui.multiple.search.selection.dropdown.active.visible').addClass('input-filled')

    // .menu.transition hidden / visible

    $('.ui.dropdown').dropdown({
      forceSelection: false
    });

    $("#login").click(function(e){
      e.preventDefault();
      $('form').attr('action', '/login').submit();
    });

    console.log(sessionStorage)
    if(sessionStorage.email){
      var email = sessionStorage.email;
      $('input[name="username"]').val(email);
      $('input[name="username"]').parent().addClass("input--filled")
    }

    $('.ui.multiple.selection.dropdown').on('click', function(){
      $(this).has('a').addClass("input--filled");
    })

    $('.ui.multiple.selection.dropdown').on('keypress', function(){
      $(this).addClass("input--filled");
    })

    $('.not.multi').on('click', function(){
      $(this).addClass("input--filled");
    })

    $('.not.multi').on('keypress', function(){
      $(this).addClass("input--filled");
    })

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


});
