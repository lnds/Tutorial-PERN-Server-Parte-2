# Tutorial Server PERN - Parte 2

La primera parte de este tutorial está en este repositorio: https://github.com/lnds/Tutorial-PERN-Server


## Simplificando el uso de variables de entorno

En windows, mac o linux el uso de variables de entorno es distinto, para tener una forma estándar de manejar variables de ambiente configuraremos `dotenv`.

Estando en el proyecto hacemos:

        $ npm i dotenv

Luego creamos el archivo `config.js`con este código:

```javascript
// config.js
const dotenv = require('dotenv')

dotenv.config()

module.exports = {
    PORT: process.env.PORT,
    connectionString: process.env.CONNECTION_URL,
}
```

Luego creamos un archivo .env donde dejaremos nuestras variables de ambiente:

```
PORT=3001
CONNECTION_URL=url_para_la_base_de_datos
```

De este modo ya no necesitarás configurar las variables de ambiente.

Es importante que este archivo no sea compartido con nadie ni menos debe ser incluido en el repositorio github.

Ahora modificamos nuestros archivos `index.js` y `db.js` del siguiente modo:

```javascript
// db.js

const Pool = require("pg").Pool

const { connectionString } = require('./config')

const pool = new Pool({
    connectionString,
})

module.exports = pool

```

Y cambiamos la linea 7 de `index.js` del siguiente modo:

```javascript
const { PORT } = require('./config')
```


(c) 2022 Eduardo Díaz
