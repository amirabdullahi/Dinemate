// Utility to generate confirmation number
function generateConfirmationNumber() {
  const randomNumber = Math.floor(Math.random() * 1000000);
  return `${randomNumber.toString(16).padStart(4, "0")}`;
}

export default generateConfirmationNumber;
