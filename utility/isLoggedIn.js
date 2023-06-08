const isLoggedIn = (req,res,next)=>{
    if(req.isAuthenticated()) 
        next()
    else 
        res.status(401).json({auth : false});
}

module.exports = isLoggedIn;