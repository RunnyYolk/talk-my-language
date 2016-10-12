document.getElementById("button").on("click", function(e){
  e.preventDefault();
  var url = "www.whateverurl.com/" + document.getElementById("text").value
  window.location = url
})
