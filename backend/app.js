import dotenv from 'dotenv';
import express from 'express';
import courseRouter from './router/courseRouter.js';
import "dotenv/config";
import cors from 'cors';


const app = express();


//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: '*' // replace '*' with your frontend URL in production
}));

const PORT = process.env.PORT;

app.get("/",(req,res)=>{
    res.send("Nothing to see")
})

app.use("/courses", courseRouter)


app.listen(PORT, (err)=>{
    if (err){
    console.log(err)

    }
    else{
        console.log("Sucessfully running on PORT " + PORT)
    }
})
