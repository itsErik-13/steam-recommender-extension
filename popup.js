chrome.storage.local.get('gamesInWishlist', (result) => {
  console.log("Datos de chrome.storage:", result);
  if (result.gamesInWishlist && result.gamesInWishlist.length > 0) {
      const games = result.gamesInWishlist;
      const gameList = document.getElementById('gameList');
      gameList.innerHTML = '';  // Limpiar lista anterior

      if (games.length === 0) {
          gameList.innerHTML = '<li>No se encontraron juegos en la wishlist.</li>';
      } else {
          games.forEach((game) => {
              const listItem = document.createElement('li');
              listItem.textContent = game;
              gameList.appendChild(listItem);
          });
      }
  } else {
      console.log("No hay juegos en chrome.storage.");
  }
});
