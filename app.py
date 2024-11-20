from flask import Flask, request, render_template, jsonify
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

from flask import Flask, request, session, redirect, url_for, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from flask_sqlalchemy import SQLAlchemy

from flask_cors import CORS


app = Flask(__name__)
app.secret_key = 'your_secret_key'
CORS(app)


users = {"default_username": {'liked_games': []}}

# Cargar y preparar los datos
df = pd.read_csv('converted.csv')  # Reemplaza con tu archivo de datos
df = df[['Name', 'Genres', 'Tags', 'Categories', 'Positive', 'Negative', 'Header image', 'Metacritic score', 'AppID']].fillna('')
for col in ['Genres', 'Tags', 'Categories']:
    df[col] = df[col].apply(lambda x: x.split(', ') if isinstance(x, str) else [])
df['combined_features'] = df['Genres'].apply(lambda x: ' '.join(x)) + ' ' + \
                          df['Tags'].apply(lambda x: ' '.join(x)) + ' ' + \
                          df['Categories'].apply(lambda x: ' '.join(x))

# Configurar el modelo TF-IDF y KNN
tfidf = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf.fit_transform(df['combined_features'])
knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10)
knn.fit(tfidf_matrix)

# Función para recomendar juegos
def recommend_games_knn(title):
    try:
        idx = df[df['Name'] == title].index[0]
    except IndexError:
        return []
    distances, indices = knn.kneighbors(tfidf_matrix[idx])
    recommended_games = df.iloc[indices[0][1:]]['Name'].tolist()
    return recommended_games

# Ruta principal con formulario
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/autocomplete', methods=['GET'])
def autocomplete():
    query = request.args.get('q', '').strip().lower()
    if len(query) < 2:
        return jsonify([])

    suggestions = [name for name in df['Name'] if query in name.lower()]
    return jsonify(suggestions[:10])  # Limitar a 10 sugerencias

@app.route('/recommend', methods=['POST'])
def recommend():
    game_name = request.form.get('game_name', '').strip()
    print(f"Nombre del juego recibido: {game_name}")  # Depuración

    if len(game_name) < 2:
        return jsonify({'error': 'Por favor, ingresa al menos 2 caracteres.'})

    # Buscar juegos que coincidan
    filtered_games = df[df['Name'].str.contains(game_name, case=False, na=False)]
    if filtered_games.empty:
        return jsonify({'error': f'No se encontraron juegos que coincidan con "{game_name}".'})

    # Tomar el primer juego coincidente
    selected_game = filtered_games.iloc[0]
    recommendations = recommend_games_knn(selected_game['Name'])

    # Obtener las imágenes de los juegos recomendados
    recommended_data = []
    for rec in recommendations:
        game = df[df['Name'] == rec].iloc[0]
        recommended_data.append({'name': game['Name'], 'image': game['Header image']})

    # Responder con el nombre, imagen del juego seleccionado y las recomendaciones
    return jsonify({
        'selected_game': {'name': selected_game['Name'], 'image': selected_game['Header image']},
        'recommendations': recommended_data
    })

@app.route('/recommend_from_likes', methods=['POST'])
def recommend_from_likes():
    data = request.get_json()
    liked_games = data.get('wishlist', [])

    if not liked_games:
        return jsonify({'error': 'No tienes juegos likeados para generar recomendaciones'}), 400

    # Utilizamos un diccionario para almacenar los juegos sin duplicados, 
    # la clave es el nombre del juego y el valor es el objeto con sus detalles
    unique_games = {}

    # Generar recomendaciones para todos los juegos likeados
    for game_name in liked_games:
        recommendations = recommend_games_knn(game_name)
        
        # Para cada recomendación, obtener el nombre, imagen y puntaje de Metacritic
        for rec in recommendations:
            game = df[df['Name'] == rec]
            if not game.empty:
                game_data = game.iloc[0]
                game_name = game_data['Name']
                
                # Solo agregamos el juego si no está ya en el diccionario o si tiene un puntaje Metacritic más alto
                if game_name not in unique_games or game_data['Metacritic score'] > unique_games[game_name]['metacritic_score']:
                    unique_games[game_name] = {
                        'name': game_name,
                        'image': game_data['Header image'],
                        'AppID' : int(game_data['AppID']),
                        'metacritic_score': game_data['Metacritic score']
                    }

    # Convertir el diccionario a una lista y ordenar por Metacritic Score de manera descendente
    recommended_data = list(unique_games.values())
    recommended_data.sort(key=lambda x: x['metacritic_score'], reverse=True)

    # Devolver solo los 10 mejores juegos sin el Metacritic score
    recommendations = [{'name': game['name'], 'image': game['image'], 'AppID': game['AppID']} for game in recommended_data[:10]]

    return jsonify({'recommendations': recommendations})


if __name__ == "__main__":
    app.run(debug=True)