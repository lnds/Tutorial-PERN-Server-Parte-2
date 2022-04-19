// index.js
const express = require("express")
const app = express()
const cors = require("cors")
const pool = require("./db")
const { PORT, JWT_SECRET } = require('./config')

//middleware
app.use(cors())
app.use(express.json())


// JWT GENERATOR

const jwt = require("jsonwebtoken")

const jwtGenerator = (userId) => {
    // genera un token jwt para el usuario dado
    if (userId) {
        const payload = {
            user: userId,
        }
        return jwt.sign(payload, JWT_SECRET, { expiresIn: "1hr" })
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

//create a todo
app.post("/todos", authorization, async (req, res) => {
    try {
        const { description } = req.body
        const newTodo = await pool.query(
            "INSERT INTO todos(description) VALUES($1) RETURNING *",
            [description]
        )
        res.json(newTodo.rows[0])
    } catch (err) {
        console.error(err.message)
    }
})

//get all todos
app.get("/todos", authorization, async (req, res) => {
    try {
        const allTodos = await pool.query(
            "SELECT * FROM todos ORDER BY id"
        )
        res.json(allTodos.rows)
    } catch (err) {
        console.error(err.message)
    }
})

//get a todo
app.get("/todos/:id", authorization, async (req, res) => {
    try {
        const { id } = req.params
        const todo = await pool.query(
            "SELECT * FROM todos WHERE id = $1",
            [id]
        )
        res.json(todo.rows[0])
    } catch (err) {
        console.log(err)

    }
})

//update a todo
app.put("/todos/:id", authorization, async (req, res) => {
    try {
        const { id } = req.params
        const { description } = req.body
        const updateTodo = await pool.query(
            "UPDATE todos SET description = $1 WHERE id = $2",
            [description, id]
        )
        console.log(updateTodo)
        res.json("Todo was updated")
    } catch (err) {
        console.log(err)

    }
})

//delete a todo
app.delete("/todos/:id", authorization, async (req, res) => {
    try {
        const { id } = req.params
        const deleteTodo = await pool.query(
            "DELETE FROM todos WHERE id = $1",
            [id]
        )
        console.log(deleteTodo)
        res.json("todo was deleted")
    } catch (err) {
        console.error(err)

    }
})


app.listen(PORT, () => {
    console.log("servidor iniciado en puerto " + PORT)
})
