// All JS here.

$(document).ready(function () {

  $(window).scroll(function () {
    if (this.scrollY >= 25) {
      $(".nav-h").addClass("nav-header");
    } else {
      $(".nav-h").removeClass("nav-header");
    }
  });

  $(".ham-menu").click(function () {
    $(this).toggleClass("active");
    $(".fa-bars").toggleClass("fa-times");
    $(".navbar-center").toggleClass("active");
    $(".navbar-right").toggleClass("active");
  });
});
