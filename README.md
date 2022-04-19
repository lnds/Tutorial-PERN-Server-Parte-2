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


## Creación y Acceso de usuarios

Ahora vamos a agregar una tabla más a nuestra base de datos:

```SQL
CREATE TABLE users(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);
```

Luego instalaremos dos paquetes que serán usados para encriptar passwords (`bcrypt`) y generar tokens JWT (`jsonwebtoken`):

    npm i bcrypt jsonwebtoken

### Una función para generar tokens JWT

Para generar JWT necesitamos tener una clave secreta que se configura en el servidor, esta la guardaremos en la variable de ambiente JWT_SECRET.

Abrimos nuestro archivo `.env` y agregamos nuestra clave:

```
JWT_SECRET=ingresarunvalorparalaclavesecreta
``` 

Modificamos el archivo `config.js` del siguiente modo:

```javascript
// config.js
const dotenv = require('dotenv')

dotenv.config()

module.exports = {
    PORT: process.env.PORT,
    connectionString: process.env.CONNECTION_URL,
    JWT_SECRET: process.env.JWT_SECRET,
}
```


Ahora agregaremos estas tres funciones en `index.js`:

```javascript
// JWT GENERATOR

const jwt = require("jsonwebtoken")


const jwtSecret = JWT_SECRET

const jwtGenerator = (userId) => {
    // genera un token jwt para el usuario dado
    if (userId) {
        const payload = {
            user: userId,
        }
        return jwt.sign(payload, jwtSecret, { expiresIn: "1hr" })
    }
    return "invalid token"
}

// ENCRYPT PASSWORD

const bcrypt = require("bcrypt")

const encrypt = async (password) => {
    //  Encriptar password usand bCrypt
    const saltRounds = 10
    const salt = await bcrypt.genSalt(saltRounds)
    const bcryptPassword = await bcrypt.hash(password, salt)
    return bcryptPassword
}


// CHECK PASSWORD

const compare = async (plainPassword, password) => {
    return await bcrypt.compare(plainPassword, password)
}
```

Con esto podemos agregar una API para registrar usuarios nuevo:

```javascript
// registrar usuario
app.post("/register", async (req, res) => {
    try {
        // 1. destructurar req.body para obtner (name, email, password)
        const { name, email, password } = req.body

        // 2. verificar si el usuario existe (si existe lanzar un error, con throw)
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email])

        if (user.rows.length !== 0) {
            return res.status(401).send("Usuario ya existe")
        }

        // 3. Encriptar password usand bCrypt
        bcryptPassword = await encrypt(password)

        // 4. agregar el usuario a la base de datos
        const newUser = await pool.query(
            "INSERT INTO users(name, email, password) values($1, $2, $3) RETURNING *",
            [name, email, bcryptPassword])

        token = jwtGenerator(newUser.rows[0].id)
        res.json({ token })
    } catch (err) {
        console.log(err)
        res.status(500).send("Server error")
    }
})
```

Podemos probarla haciendo:

```bash
curl -X POST -d '{"name": "Eduardo", "email": "ediaz@dcc8090.cl", "password": "abc123"}' -H "Content-Type: application/json" http://localhost:3001/register
```

Tras ejecutar esos comandos aparecerá un resultado parecido a esto:

```bash
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiMjEzMjAxZjctYjUyNi00MWQwLWJmNDItY2I2ZTQxZWMxMWQ4IiwiaWF0IjoxNjUwMzMwMTIwLCJleHAiOjE2NTAzMzM3MjB9.zOXIFaGOhKOTA-ulkhxkGpzfQKE414xaq0T_jUK1x5g"}
```


Ahora vamos a crear la función `login` que nos permite obtener un token dadas las credenciales:

```javascript

// verificar usuario
app.post("/login", async (req, res) => {
    try {
        // 1. destructurizar req.body
        const { email, password } = req.body

        // 2. verificar si el usuario no existe (si no emitiremos un error)
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email])

        if (user.rows.length === 0) {
            return res.status(401).json("Password incorrecta o email no existe")
        }

        // 3. verificar si la clave es la misma que está almacenada en la base de datos
        const validPassword = await compare(password, user.rows[0].password)
        console.log("plain", password, user.rows[0].password)
        if (!validPassword) {
            return res.status(401).json("Password incorrecta o email no existe")
        }

        // 4. entregar un token jwt 
        const token = jwtGenerator(user.rows[0].id)
        res.json({ token })
    } catch (err) {
        console.log(err)
        res.status(500).send("Server error")
    }
})
```

Para probarlo hacemos:

```bash
curl -X POST -d '{"email": "ediaz@dcc8090.cl", "password": "abc123"}' -H "Content-Type: application/json" http://localhost:3001/login
```

Y vamos a obtener algo así:

```bash
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiMjEzMjAxZjctYjUyNi00MWQwLWJmNDItY2I2ZTQxZWMxMWQ4IiwiaWF0IjoxNjUwMzMwNTMwLCJleHAiOjE2NTAzMzQxMzB9.xWfpDJW1JFnopMgt5tIRKvHlTYi9LvGBIhJ2zNTUGSM"}
```

Si entregamos mal las credenciales obtendremos lo siguiente:

```bash
curl -X POST -d '{"email": "ediaz@dcc8090.cl", "password": "abc1234"}' -H "Content-Type: application/json" http://localhost:3001/login


"Password incorrecta o email no existe"
```

## Un middleware para validar JWT

Ahora construiremos un middleware que valida nuestros tokens.

Agregamos esto después de los endpoints que acabamos de crear:

```javascript
// Un middleware para validar JWT
const authorization = async (req, res, next) => {
    try {
        // 1. obtiene el token del header del request
        const jwToken = req.header("token")

        // 2. si no hay token presente es un error
        if (!jwToken) {
            return res.status(403).json("No autorizado")
        }

        // 3. valida el token y obtiene el payload, si falla tirará una excepción
        const payload = jwt.verify(jwToken, JWT_SECRET)

        // 4. rescatamos el payload y lo dejamos en req.user
        req.user = payload.user

        // 5. continua la ejecución del pipeline
        next()
    } catch (err) {
        console.error(err.message)
        return res.status(403).json("No autorizado")
    }
}
```

Para poder usuarlo modificaremos la firma de trodos nuestros endpoints de este modo:

```javascript
//create a todo
app.post("/todos", authorization, async (req, res) => {
```

```javascript
//get all todos
app.get("/todos", authorization, async (req, res) => {
```


```javascript
//get a todo
app.get("/todos/:id", authorization, async (req, res) => {
```


```javascript
//update a todo
app.put("/todos/:id", authorization, async (req, res) => {
```

```javascript
//delete a todo
app.delete("/todos/:id", authorization, async (req, res) => {
```

Ahora para poder invocar nuestras APIs siempre debemos agregar un token JWT, que obtenemos usando `/login`.

A continuación un ejemplo de una sesión iterativa para obtener un token y luego consultar el endpoint `/todos`.


```bash
$ curl -X POST -d '{"email": "ediaz@dcc8090.cl", "password": "abc123"}' -H "Content-Type: application/json" http://localhost:3001/login

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiMDkyOGY1OTMtOGExMy00ZjdlLWE2MWEtYWFlYjM1ZTViMDc2IiwiaWF0IjoxNjUwMzMxMzc1LCJleHAiOjE2NTAzMzQ5NzV9.PxaBr3CEYhrvY7HmFAy5KSXibY5_wjAifIJu3IzrotM"}

$ curl http://localhost:3001/todos -H 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiMDkyOGY1OTMtOGExMy00ZjdlLWE2MWEtYWFlYjM1ZTViMDc2IiwiaWF0IjoxNjUwMzMxMzc1LCJleHAiOjE2NTAzMzQ5NzV9.PxaBr3CEYhrvY7HmFAy5KSXibY5_wjAifIJu3IzrotM'

[{"id":1,"description":"hola mundo"},{"id":2,"description":"preparar presentación para la clase 4"},{"id":6,"description":"aaaaa"},{"id":7,"description":"probando"},{"id":8,"description":"holaaa"},{"id":9,"description":"leer"},{"id":10,"description":""},{"id":11,"description":"leer"},{"id":12,"description":"leer"},{"id":13,"description":"uwu"},{"id":14,"description":"hola"}]
 ```

 ## Is verify

 Agregaremos un último endpoint que puede ser usado por el frontend para validar el token

 ```javascript
 app.get("/verify", authorization, async (req, res) => {
    try {
        res.json(true)
    } catch (err) {
        console.error(err.message)
        res.status(500).send("Server error")
    }
})
```




(c) 2022 Eduardo Díaz
