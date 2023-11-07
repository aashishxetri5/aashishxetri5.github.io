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
