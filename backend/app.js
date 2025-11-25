import dotenv from 'dotenv';
import express from 'express';
import courseRouter from './router/courseRouter.js';
import prereqRouter from './router/prereqRouter.js';

import "dotenv/config";
import cors from 'cors';


const app = express();
import fs from 'fs'

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: '*' // replace '*' with your frontend URL in production
}));

const PORT = process.env.PORT;

app.get("/api",(req,res)=>{
    if (req.url === '/favicon.ico') {
        res.end();
    } 
    // Ends request for favicon without counting
    const json1 = fs.readFileSync('./data/count.json', 'utf-8');
    const obj = JSON.parse(json1);

    if (req.query.type == 'new-visit'){
        obj.visits = obj.visits + 1
    }
    const newJson = JSON.stringify(obj)

    fs.writeFileSync('./data/count.json', newJson);
    res.send(newJson)
})

app.use("/courses", courseRouter)

app.use("/prereq", prereqRouter)

app.listen(PORT, (err)=>{
    if (err){
    console.log(err)

    }
    else{
        console.log("Sucessfully running on PORT " + PORT)
    }
})
