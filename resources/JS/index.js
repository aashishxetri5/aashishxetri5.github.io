// All JS here.

$(document).ready(function () {
    $(".center-nav nav-item a").click(function () {
        $(this).css("color", "white !important");
    });


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
  });
});
