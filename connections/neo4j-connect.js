require('dotenv').config()
const neo4j = require('neo4j-driver');
let neo4j_driver
const driver = async ()=>{
    try {
        neo4j_driver = neo4j.driver(process.env.NEO4J_CONNECTION_URL, neo4j.auth.basic(process.env.NEO4J_USERNAME,process.env.NEO4J_PASSWORD));
        
    } catch(error) {
        console.log('Something went wrong in server');
        console.log(error);
    }
    return neo4j_driver;
}
module.exports = driver;