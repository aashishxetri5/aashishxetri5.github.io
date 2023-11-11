const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section");

navLinks.forEach((link) => {
  const target = link.getAttribute("data-target");
  const targetSection = document.querySelector("#" + target);
  link.addEventListener("click", (event) => {
    event.preventDefault();

    window.scroll({
      behavior: "smooth",
      left: 0,
      top: targetSection.offsetTop,
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");

      sections.forEach((section) => {
        section.classList.remove("hidden");
      });
    });

    link.classList.add("active");
    console.log(link);

    sections.forEach((section) => {
      if (section !== targetSection) {
        section.classList.add("hidden");
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const hamMenu = document.querySelector(".ham-menu");
  const menuToggler = document.querySelector(".menu-toggler");
  const sidebar = document.querySelector(".sidebar");

  menuToggler.addEventListener("click", (event) => {
    if (menuToggler.getAttribute("icon") == "fa-solid:bars") {
      sidebar.classList.remove("sidebar-hidden");
      sidebar.classList.add("animate__slideInRight");

      menuToggler.setAttribute("icon", "fa6-solid:xmark");
      hamMenu.style.right = "270px";
    } else {
      sidebar.classList.remove("animate__slideInRight");
      sidebar.classList.add("sidebar-hidden");

      menuToggler.setAttribute("icon", "fa-solid:bars");
      hamMenu.style.right = 0;
    }
  });
});

const circle = document.querySelector("#circle");
const dot = document.querySelector("#dot");

document.addEventListener("mousemove", (e) => {
  const mouseX = e.pageX;
  const mouseY = e.pageY;

  // Set the circle's position based on the mouse coordinates
  circle.style.left = mouseX - circle.clientWidth / 2 + "px";
  circle.style.top = mouseY - circle.clientHeight / 2 + "px";
});
