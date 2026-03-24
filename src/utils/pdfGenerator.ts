import html2canvas from "html2canvas";
import jsPDF from "jspdf";

async function renderQuoteCanvas(element: HTMLElement) {
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });
}

export async function generateInsurancePDF(
  element: HTMLElement,
  fileName = "中国人寿报价单.pdf",
) {
  const canvas = await renderQuoteCanvas(element);

  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imageData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imageData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}

export async function generateInsuranceImage(
  element: HTMLElement,
  fileName = "中国人寿报价单.png",
) {
  const canvas = await renderQuoteCanvas(element);
  const imageData = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = imageData;
  link.download = fileName;
  link.click();
}
