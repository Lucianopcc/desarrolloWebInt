let myslq = require("mysql2");

let conexion = myslq.createConnection({
   host: "localhost",
   database: "martin1",
   user: "root",
   password: "root"
})

conexion.connect(function(err){
    if(err){
        throw err;
    }else{
        console.log("conexion exitosa");
    }
});

conexion.end();
