// Función para obtener los juegos de la wishlist
function getWishlistGames() {
    console.log("Obteniendo juegos de la wishlist...");

    const wishlistContainer = document.querySelector("#StoreTemplate > section");

    if (!wishlistContainer) {
        console.log("No se encontró el contenedor de la wishlist.");
        return;
    }

    console.log("Contenedor de la wishlist encontrado. Buscando juegos...");

    const wishlistItems = document.querySelectorAll(
        "#StoreTemplate > section > div.oI5QPBYWG8c- > div.iiFX76jX8MI-.Panel > div > div > div"
    );

    console.log(`Total de juegos encontrados: ${wishlistItems.length}`);

    if (wishlistItems.length > 0) {
        const games = [];
        wishlistItems.forEach((item, index) => {
            const linkElement = item.querySelector(
                "div > div > div._0arfU0-7OcQ- > div.pMrnNJp5sDA- > a"
            );

            if (linkElement) {
                const title = linkElement.innerText.trim();
                console.log(`Juego ${index + 1}: ${title}`);
                games.push(title);
            } else {
                console.warn(`No se encontró enlace en el elemento ${index + 1}.`);
            }
        });

        // Guardar los juegos en chrome.storage
        chrome.storage.local.set({ gamesInWishlist: games }, () => {
            console.log("Juegos almacenados en chrome.storage.");
        });

        // Enviar la lista de juegos al backend para obtener recomendaciones
        fetch('http://localhost:5000/recommend_from_likes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ wishlist: games }) // Enviar la lista de juegos en el cuerpo de la solicitud
        })
        .then(response => response.json())
        .then(data => {
            console.log("Recomendaciones recibidas del backend:", data);
            // Aquí puedes procesar las recomendaciones y almacenarlas en chrome.storage
            chrome.storage.local.set({ recommendedGames: data.recommendations }, () => {
                console.log("Recomendaciones almacenadas en chrome.storage.");
                updateWishlistWithRecommendations(); // Actualizar el DOM con las recomendaciones
            });
        })
        .catch(error => {
            console.error('Error al obtener recomendaciones:', error);
        });
    } else {
        console.log("No se encontraron juegos en la wishlist.");
    }
}

// Función para actualizar el DOM con las recomendaciones obtenidas del backend
function updateWishlistWithRecommendations() {
    // Obtener los juegos recomendados de chrome.storage
    chrome.storage.local.get('recommendedGames', (result) => {
        const recommendedGames = result.recommendedGames || [];
        
        if (recommendedGames.length > 0) {
            console.log("Recomendaciones recibidas:", recommendedGames);

            // Encontrar el contenedor de la wishlist para insertar las recomendaciones
            const wishlistContainer = document.querySelector("#StoreTemplate > section");

            if (!wishlistContainer) {
                console.log("No se encontró el contenedor de la wishlist.");
                return;
            }

            // Comprobar si las recomendaciones ya fueron añadidas
            if (document.querySelector('#recommended-games-section')) {
                console.log("Las recomendaciones ya han sido insertadas.");
                return; // Si ya están insertadas, no hacemos nada
            }

            // Crear un nuevo contenedor para las recomendaciones
            const recommendedSection = document.createElement('div');
            recommendedSection.id = 'recommended-games-section';  // Asignamos un ID único
            recommendedSection.style.marginTop = '30px';
            recommendedSection.style.display = 'flex';
            recommendedSection.style.flexDirection = 'column';
            recommendedSection.style.justifyContent = 'center';
            recommendedSection.style.alignItems = 'center';
            recommendedSection.innerHTML = '<h2>Juegos recomendados para ti</h2>';

            // Crear un contenedor para cada juego recomendado
            recommendedGames.forEach(game => {
                const gameDiv = document.createElement('div');
                gameDiv.style.width = '50%';
                gameDiv.style.border = '1px solid #ccc';
                gameDiv.style.padding = '10px';
                gameDiv.style.marginBottom = '10px';
                gameDiv.style.borderRadius = '6px';
                gameDiv.style.backgroundColor = '#2a475e';
                gameDiv.style.display = 'flex';
                gameDiv.style.alignItems = 'center';

                // Crear y agregar la imagen del juego
                const gameImage = document.createElement('img');
                gameImage.src = game.image;
                gameImage.alt = game.name;
                gameImage.style.height = '100px';
                gameImage.style.marginRight = '15px';

                // Crear y agregar el nombre del juego
                const gameTitle = document.createElement('a');
                gameTitle.textContent = game.name;
                gameTitle.href = `https://store.steampowered.com/app/${game.AppID}`;  // Enlace al juego en Steam
                gameTitle.target = "_blank";  // Abre en una nueva pestaña
                gameTitle.style.fontWeight = 'bold';
                gameTitle.style.color = 'white';
                gameTitle.style.textDecoration = 'none';  // Evitar subrayado por defecto

                // Añadir la imagen y el título al div del juego
                gameDiv.appendChild(gameImage);
                gameDiv.appendChild(gameTitle);

                // Añadir el div del juego recomendado a la sección de recomendaciones
                recommendedSection.appendChild(gameDiv);
            });

            // Insertar la sección de recomendaciones después del contenedor de la wishlist
            wishlistContainer.appendChild(recommendedSection);
        } else {
            console.log("No hay recomendaciones para mostrar.");
        }
    });
}

// Llamar a la función inicial para obtener los juegos
getWishlistGames();

// Usar MutationObserver para detectar cambios en el DOM de la wishlist
const wishlistContainer = document.querySelector("#StoreTemplate > section");

if (wishlistContainer) {
    const wishlistObserver = new MutationObserver(() => {
        console.log("Cambio detectado en la wishlist. Actualizando juegos...");
        getWishlistGames();  // Volver a obtener la lista de juegos actualizada
    });

    wishlistObserver.observe(wishlistContainer, {
        childList: true,  // Observar cambios en los hijos (agregados o eliminados)
        subtree: true     // Observar todos los niveles descendientes
    });
} else {
    console.log("No se encontró el contenedor de la wishlist para el observer.");
}
