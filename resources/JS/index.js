const button = document.getElementById("download-btn");

function generatePDF() {
  // Choose the element that your content will be rendered to.
  const element = document.getElementById("myresume");

  var opt = {
    margin: 1,
    filename: "Aashish_Katwal.pdf",
    jsPDF: {
      unit: "in",
      format: "letter",
      orientation: "portrait",
      enableLinks: true,
      margin: { top: 1, right: 1, bottom: 1, left: 1.25 },
    }
  };
  
  html2pdf().set(opt).from(element).save();

}

button.addEventListener("click", generatePDF);
