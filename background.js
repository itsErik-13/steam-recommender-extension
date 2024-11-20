// Este código no es necesario si no usas background.js para manejar el mensaje
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WISHLIST_DATA") {
      console.log("Datos de wishlist recibidos:", message.data);
  }
});
