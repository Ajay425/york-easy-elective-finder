require('dotenv').config(); // if using CommonJS

const express = require("express")

const app = express();


app.get("/",(req,res)=>{
    res.send("hi")
})


app.listen(3000, (err)=>{
    console.log(err)
})